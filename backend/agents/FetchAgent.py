"""Parallel fetch from PubMed, UniProt, RCSB, PubChem."""

import asyncio

import httpx

from utils.logger import get_logger

UA = "drug-discovery-ai/3.0 (hackathon)"
TIMEOUT = 30


class FetchAgent:
    """Fan-out fetch: literature, proteins, structures, known_compounds."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete")
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"FetchAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        query = state.get("query", "")
        ctx = state.get("mutation_context") or {}
        gene = ctx.get("gene", query)
        
        # NO CURATED FALLBACK - always fetch from real APIs
        # Parallel fetch from all sources
        lit, proteins, structures, compounds = await asyncio.gather(
            self._fetch_pubmed(query),
            self._fetch_uniprot(gene, query),
            self._fetch_rcsb(query),
            self._fetch_pubchem(gene),
            return_exceptions=True,
        )

        return {
            "literature": lit if isinstance(lit, list) else [],
            "proteins": proteins if isinstance(proteins, list) else [],
            "structures": structures if isinstance(structures, list) else [],
            "known_compounds": compounds if isinstance(compounds, list) else [],
        }

    async def _fetch_pubmed(self, query: str) -> list[dict]:
        ncbi_key = __import__("os").getenv("NCBI_API_KEY", "")
        params: dict = {
            "db": "pubmed",
            "term": query,
            "retmode": "json",
            "retmax": 10,
            "sort": "relevance",
        }
        if ncbi_key:
            params["api_key"] = ncbi_key
        async with httpx.AsyncClient(headers={"User-Agent": UA}, timeout=TIMEOUT) as client:
            for attempt in range(3):
                try:
                    r = await client.get(
                        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi", params=params
                    )
                    ids = r.json().get("esearchresult", {}).get("idlist", [])
                    if not ids:
                        return []
                    sum_r = await client.get(
                        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
                        params={"db": "pubmed", "id": ",".join(ids), "retmode": "json"},
                    )
                    result_data = sum_r.json().get("result", {})
                    papers = []
                    for pid in ids[:10]:
                        item = result_data.get(pid, {})
                        if item:
                            papers.append(
                                {
                                    "pubmed_id": pid,
                                    "title": item.get("title", ""),
                                    "journal": item.get("source", ""),
                                    "publication_date": item.get("pubdate", ""),
                                }
                            )
                    return papers
                except Exception:
                    await asyncio.sleep(2**attempt)
        return []

    async def _fetch_uniprot(self, gene: str, query: str) -> list[dict]:
        gene_lower = gene.lower()
        if "hiv" in gene_lower or "hiv" in query.lower():
            smart_query = '(organism_id:11676) AND (protein_name:protease OR protein_name:"reverse transcriptase")'
        elif "brca1" in gene_lower:
            smart_query = "gene:BRCA1 AND organism_id:9606"
        elif "egfr" in gene_lower:
            smart_query = "gene:EGFR AND organism_id:9606"
        elif "tp53" in gene_lower or "p53" in gene_lower:
            smart_query = "gene:TP53 AND organism_id:9606"
        else:
            smart_query = f"gene:{gene} AND organism_id:9606" if gene else query
        async with httpx.AsyncClient(headers={"User-Agent": UA}, timeout=TIMEOUT) as client:
            for attempt in range(3):
                try:
                    r = await client.get(
                        "https://rest.uniprot.org/uniprotkb/search",
                        params={"query": smart_query, "format": "json", "size": 5},
                    )
                    items = r.json().get("results", [])
                    proteins = []
                    for item in items:
                        proteins.append(
                            {
                                "accession": item.get("primaryAccession", ""),
                                "protein_name": item.get("proteinDescription", {})
                                .get("recommendedName", {})
                                .get("fullName", {})
                                .get("value", ""),
                                "gene_names": [
                                    g.get("geneName", {}).get("value", "")
                                    for g in item.get("genes", [])
                                ],
                                "organism": item.get("organism", {}).get("scientificName", ""),
                                "sequence": item.get("sequence", {}).get("value", ""),
                            }
                        )
                    return proteins
                except Exception:
                    await asyncio.sleep(2**attempt)
        return []

    async def _fetch_rcsb(self, query: str) -> list[dict]:
        search_payload = {
            "query": {"type": "terminal", "service": "full_text", "parameters": {"value": query}},
            "return_type": "entry",
            "request_options": {"paginate": {"start": 0, "rows": 5}},
        }
        async with httpx.AsyncClient(headers={"User-Agent": UA}, timeout=TIMEOUT) as client:
            for attempt in range(3):
                try:
                    r = await client.post(
                        "https://search.rcsb.org/rcsbsearch/v2/query", json=search_payload
                    )
                    pdb_ids = [e["identifier"] for e in r.json().get("result_set", [])[:5]]
                    structures = []
                    for pdb_id in pdb_ids:
                        try:
                            er = await client.get(
                                f"https://data.rcsb.org/rest/v1/core/entry/{pdb_id}"
                            )
                            entry = er.json()
                            structures.append(
                                {
                                    "pdb_id": pdb_id,
                                    "title": entry.get("struct", {}).get("title", ""),
                                    "experimental_methods": entry.get("exptl", [{}])[0].get(
                                        "method", ""
                                    ),
                                    "resolution": entry.get("refine", [{}])[0].get("ls_d_res_high")
                                    if entry.get("refine")
                                    else None,
                                    "pdb_path": None,
                                }
                            )
                        except Exception:
                            continue
                    return structures
                except Exception:
                    await asyncio.sleep(2**attempt)
        return []

    async def _fetch_pubchem(self, gene: str) -> list[dict]:
        search_term = f"{gene} inhibitor"
        async with httpx.AsyncClient(headers={"User-Agent": UA}, timeout=TIMEOUT) as client:
            for attempt in range(3):
                try:
                    r = await client.get(
                        f"https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/{search_term}/JSON",
                        params={"limit": 10},
                    )
                    names = r.json().get("dictionary_terms", {}).get("compound", [])[:5]
                    compounds = []
                    for name in names:
                        try:
                            pr = await client.get(
                                f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{name}/property/"
                                "Title,MolecularFormula,CanonicalSMILES,MolecularWeight/JSON"
                            )
                            props = pr.json().get("PropertyTable", {}).get("Properties", [{}])[0]
                            compounds.append(
                                {
                                    "name": props.get("Title", name),
                                    "molecular_formula": props.get("MolecularFormula", ""),
                                    "canonical_smiles": props.get("CanonicalSMILES", ""),
                                    "molecular_weight": props.get("MolecularWeight"),
                                }
                            )
                        except Exception:
                            continue
                    return compounds
                except Exception:
                    await asyncio.sleep(2**attempt)
        return []
