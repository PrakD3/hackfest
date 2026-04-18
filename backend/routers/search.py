"""GET /api/search — mutation query suggestions."""

import asyncio
import csv
import json
import os
import re
from typing import Iterable, Literal
from pathlib import Path
from fastapi import APIRouter, Query
import httpx

router = APIRouter()

_DATA_DIR = Path(__file__).resolve().parents[1] / "data"
_CBIOPORTAL_BASE_URL = os.getenv("CBIOPORTAL_API_URL", "https://www.cbioportal.org/api")
_DEFAULT_COSMIC_PATH = (
    Path(__file__).resolve().parents[1]
    / "search"
    / "CancerMutationCensus_AllData_Tsv_v103_GRCh37"
    / "CancerMutationCensus_AllData_v103_GRCh37.tsv"
    / "cmc_export.tsv"
)


def _load_json(path: Path):
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def _build_suggestions() -> list[str]:
    suggestions: set[str] = set()

    benchmark = _load_json(_DATA_DIR / "benchmark_cases.json")
    if isinstance(benchmark, list):
        for item in benchmark:
            query = item.get("query") if isinstance(item, dict) else None
            if isinstance(query, str):
                suggestions.add(query.strip())

    resistance = _load_json(_DATA_DIR / "mutation_resistance.json")
    if isinstance(resistance, dict):
        for key in resistance.keys():
            if isinstance(key, str):
                suggestions.add(key.strip())

    return sorted(s for s in suggestions if s)


_SUGGESTIONS = _build_suggestions()
_COSMIC_INDEX: dict[str, tuple[str, ...]] | None = None
_COSMIC_GENES: tuple[str, ...] = ()
_COSMIC_LOCK = asyncio.Lock()

_AA3_TO_1 = {
    "ALA": "A",
    "ARG": "R",
    "ASN": "N",
    "ASP": "D",
    "CYS": "C",
    "GLN": "Q",
    "GLU": "E",
    "GLY": "G",
    "HIS": "H",
    "ILE": "I",
    "LEU": "L",
    "LYS": "K",
    "MET": "M",
    "PHE": "F",
    "PRO": "P",
    "SER": "S",
    "THR": "T",
    "TRP": "W",
    "TYR": "Y",
    "VAL": "V",
}


def _normalize_label(label: str) -> str:
    cleaned = re.sub(r"\s+", " ", label.strip())
    match = re.match(r"^(?P<gene>[A-Za-z0-9\-]+)\s+(?P<mut>[A-Za-z]{1,3}\d+[A-Za-z]{1,3})$", cleaned)
    if match:
        gene = match.group("gene").upper()
        mut = match.group("mut").upper()
        if len(mut) >= 3 and mut[:3] in _AA3_TO_1 and mut[-3:] in _AA3_TO_1:
            mut = f"{_AA3_TO_1[mut[:3]]}{mut[3:-3]}{_AA3_TO_1[mut[-3:]]}"
        return f"{gene} {mut}"
    return cleaned.upper()


def _normalize_mutation_aa(value: str) -> str | None:
    cleaned = value.strip()
    if cleaned.startswith("p."):
        cleaned = cleaned[2:]
    cleaned = cleaned.replace(" ", "")
    match = re.match(r"^([A-Za-z]{1,3})(\d+)([A-Za-z]{1,3})$", cleaned)
    if not match:
        return None
    left, pos, right = match.groups()
    left = left.upper()
    right = right.upper()
    if len(left) == 3:
        left = _AA3_TO_1.get(left, "")
    if len(right) == 3:
        right = _AA3_TO_1.get(right, "")
    if not left or not right:
        return None
    return f"{left}{pos}{right}"


def _cosmic_path() -> Path:
    env_path = os.getenv("COSMIC_CMC_PATH")
    if env_path:
        return Path(env_path)
    return _DEFAULT_COSMIC_PATH


def _dedupe(labels: Iterable[str]) -> list[str]:
    seen: dict[str, str] = {}
    for label in labels:
        key = _normalize_label(label)
        if key not in seen:
            seen[key] = label
        else:
            if len(label) < len(seen[key]):
                seen[key] = label
    return list(seen.values())


def _rank(label: str, query: str) -> int:
    if not query:
        return 0
    q = query.lower()
    l = label.lower()
    if l == q:
        return 3
    if l.startswith(q):
        return 2
    if q in l:
        return 1
    return 0


async def _search_clinvar(query: str, limit: int) -> list[str]:
    if not query:
        return []

    params = {
        "db": "clinvar",
        "term": query,
        "retmode": "json",
        "retmax": str(min(limit, 20)),
    }
    api_key = os.getenv("NCBI_API_KEY")
    if api_key:
        params["api_key"] = api_key

    async with httpx.AsyncClient(timeout=12) as client:
        search = await client.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
            params=params,
        )
        if search.status_code != 200:
            return []
        ids = search.json().get("esearchresult", {}).get("idlist", [])
        if not ids:
            return []

        summary = await client.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
            params={"db": "clinvar", "retmode": "json", "id": ",".join(ids)},
        )
        if summary.status_code != 200:
            return []

        result = summary.json().get("result", {})
        suggestions: list[str] = []
        for uid in result.get("uids", []):
            item = result.get(uid, {})
            title = item.get("title")
            if isinstance(title, str) and title.strip():
                suggestions.append(title.strip())
        return suggestions[:limit]


async def _search_civic(query: str, limit: int) -> list[str]:
    base_url = os.getenv("CIVIC_API_URL", "https://civicdb.org/api")
    if not query:
        return []

    async with httpx.AsyncClient(timeout=12) as client:
        resp = await client.get(f"{base_url}/variants", params={"query": query, "count": limit})
        if resp.status_code != 200:
            return []
        data = resp.json()
        records = data.get("records") if isinstance(data, dict) else None
        if not isinstance(records, list):
            return []
        suggestions: list[str] = []
        for record in records:
            if not isinstance(record, dict):
                continue
            name = record.get("name") or record.get("variant")
            if isinstance(name, str) and name.strip():
                suggestions.append(name.strip())
        return suggestions[:limit]


async def _search_mygene(query: str, limit: int) -> list[str]:
    gene_query, _ = _split_query(query)
    if not gene_query or len(gene_query) < 2:
        return []

    async with httpx.AsyncClient(timeout=12) as client:
        resp = await client.get(
            "https://mygene.info/v3/query",
            params={"q": gene_query, "species": "human", "fields": "symbol", "size": str(limit)},
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        hits = data.get("hits") if isinstance(data, dict) else None
        if not isinstance(hits, list):
            return []
        suggestions: list[str] = []
        for hit in hits:
            if not isinstance(hit, dict):
                continue
            symbol = hit.get("symbol")
            if isinstance(symbol, str) and symbol.strip():
                suggestions.append(symbol.strip())
        return suggestions[:limit]


async def _search_cbioportal_genes(query: str, limit: int) -> list[str]:
    gene_query, _ = _split_query(query)
    if not gene_query or len(gene_query) < 2:
        return []

    async with httpx.AsyncClient(timeout=12) as client:
        resp = await client.get(
            f"{_CBIOPORTAL_BASE_URL}/genes",
            params={"keyword": gene_query, "pageSize": str(limit), "pageNumber": "0"},
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        if not isinstance(data, list):
            return []
        suggestions: list[str] = []
        for row in data:
            if not isinstance(row, dict):
                continue
            symbol = row.get("hugoGeneSymbol") or row.get("symbol")
            if isinstance(symbol, str) and symbol.strip():
                suggestions.append(symbol.strip())
        return suggestions[:limit]


async def _search_ncbi_gene(query: str, limit: int) -> list[str]:
    gene_query, _ = _split_query(query)
    if not gene_query or len(gene_query) < 2:
        return []

    term = f"{gene_query}[sym] AND Homo sapiens[orgn]"
    params = {"db": "gene", "term": term, "retmode": "json", "retmax": str(min(limit, 10))}
    api_key = os.getenv("NCBI_API_KEY")
    if api_key:
        params["api_key"] = api_key

    async with httpx.AsyncClient(timeout=12) as client:
        search = await client.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
            params=params,
        )
        if search.status_code != 200:
            return []
        ids = search.json().get("esearchresult", {}).get("idlist", [])
        if not ids:
            return []

        summary = await client.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
            params={"db": "gene", "retmode": "json", "id": ",".join(ids)},
        )
        if summary.status_code != 200:
            return []
        result = summary.json().get("result", {})
        suggestions: list[str] = []
        for uid in result.get("uids", []):
            item = result.get(uid, {})
            name = item.get("name")
            if isinstance(name, str) and name.strip():
                suggestions.append(name.strip())
        return suggestions[:limit]


def _split_query(query: str) -> tuple[str | None, str | None]:
    tokens = [token for token in query.strip().split() if token]
    if not tokens:
        return None, None
    if len(tokens) >= 2:
        return tokens[0], tokens[1]
    return tokens[0], None


def _build_cosmic_index(path: Path) -> tuple[dict[str, tuple[str, ...]], tuple[str, ...]]:
    if not path.exists():
        raise FileNotFoundError(f"COSMIC dataset not found at {path}")

    index: dict[str, set[str]] = {}
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            if not isinstance(row, dict):
                continue
            gene = (row.get("GENE_NAME") or "").strip()
            mutation = (row.get("Mutation AA") or "").strip()
            if not gene or not mutation:
                continue
            normalized = _normalize_mutation_aa(mutation)
            if not normalized:
                continue
            gene_key = gene.upper()
            index.setdefault(gene_key, set()).add(normalized)

    finalized = {gene: tuple(sorted(muts)) for gene, muts in index.items()}
    return finalized, tuple(sorted(finalized.keys()))


async def _get_cosmic_index() -> tuple[dict[str, tuple[str, ...]], tuple[str, ...]]:
    global _COSMIC_INDEX
    global _COSMIC_GENES

    if _COSMIC_INDEX is not None:
        return _COSMIC_INDEX, _COSMIC_GENES

    async with _COSMIC_LOCK:
        if _COSMIC_INDEX is None:
            index, genes = await asyncio.to_thread(_build_cosmic_index, _cosmic_path())
            _COSMIC_INDEX = index
            _COSMIC_GENES = genes

    return _COSMIC_INDEX or {}, _COSMIC_GENES


async def _search_cosmic(query: str, limit: int) -> list[str]:
    if not query:
        return []

    index, genes = await _get_cosmic_index()
    gene_query, mutation_query = _split_query(query)
    if not gene_query:
        return []

    gene_query_upper = gene_query.upper()
    matching_genes = [gene for gene in genes if gene_query_upper in gene]
    if not matching_genes:
        return []

    mutation_norm = _normalize_mutation_aa(mutation_query) if mutation_query else None
    mutation_query_upper = (mutation_query or "").upper()

    suggestions: list[str] = []
    for gene in matching_genes:
        mutations = index.get(gene, ())
        if mutation_query:
            filtered = [
                mut
                for mut in mutations
                if (mutation_norm and mutation_norm in mut)
                or (not mutation_norm and mutation_query_upper in mut)
            ]
        else:
            filtered = list(mutations)

        for mut in filtered:
            suggestions.append(f"{gene} {mut}")
            if len(suggestions) >= limit:
                return suggestions

    return suggestions

async def _search_online(query: str, limit: int) -> list[str]:
    if not query:
        return []
    providers = [
        _search_clinvar(query, limit),
        _search_civic(query, limit),
        _search_mygene(query, limit),
        _search_cbioportal_genes(query, limit),
        _search_ncbi_gene(query, limit),
    ]
    results = await asyncio.gather(*providers, return_exceptions=True)
    external: list[str] = []
    for item in results:
        if isinstance(item, list):
            external.extend(item)
    ranked = _dedupe(external)
    ranked.sort(key=lambda s: _rank(s, query), reverse=True)
    return ranked[:limit]


async def _search_local(query: str, limit: int) -> list[str]:
    local_seed = _SUGGESTIONS if not query else [s for s in _SUGGESTIONS if query.lower() in s.lower()]
    cosmic = await _search_cosmic(query, limit) if query else []
    merged = _dedupe([*cosmic, *local_seed])
    merged.sort(key=lambda s: _rank(s, query), reverse=True)
    return merged[:limit]


@router.get("/search")
async def search(
    query: str = Query("", max_length=200),
    limit: int = Query(8, ge=1, le=20),
    source: Literal["all", "local", "online"] = Query("all"),
):
    q = query.strip()
    local = await _search_local(q, limit)
    online = await _search_online(q, limit) if q else []

    if source == "local":
        return {"source": "local", "suggestions": local}
    if source == "online":
        return {"source": "online", "suggestions": online}

    merged = _dedupe([*local, *online])
    merged.sort(key=lambda s: _rank(s, q), reverse=True)
    return {"source": "all", "local_suggestions": local, "online_suggestions": online, "suggestions": merged[:limit]}
