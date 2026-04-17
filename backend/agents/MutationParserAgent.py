"""Parses mutation/gene from query. LLM primary, regex fallback. Curated profile lookup."""

import json
import os
import re
from pathlib import Path

CURATED_PROFILES_PATH = Path(__file__).parent.parent / "data" / "curated_profiles.json"


class MutationParserAgent:
    """Reads query from state, writes mutation_context + curated_profile."""

    async def run(self, state: dict) -> dict:
        from utils.logger import get_logger

        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete")
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"MutationParserAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        query = state.get("query", "")
        ctx = await self._llm_extract(query)
        if not ctx:
            ctx = self._regex_extract(query)
        curated = self._lookup_curated(ctx, query)
        return {"mutation_context": ctx, "curated_profile": curated}

    async def _llm_extract(self, query: str) -> dict | None:
        try:
            from utils.llm_router import LLMRouter

            router = LLMRouter(
                "You are a biomedical NLP expert. Extract mutation info from the query as JSON only: "
                "{gene, mutation, hgvs, disease_context, is_mutation, is_disease}. No markdown, no extra text."
            )
            raw, _ = await router.generate(query, max_tokens=200)
            raw = raw.strip().strip("```json").strip("```").strip()
            parsed = json.loads(raw)
            return parsed
        except Exception:
            return None

    def _regex_extract(self, query: str) -> dict:
        pattern = r"(?P<gene>[A-Z][A-Z0-9\-]+)\s+(?P<mutation>[A-Z]?\d+[A-Za-z]+)"
        m = re.search(pattern, query)
        if m:
            return {
                "gene": m.group("gene"),
                "mutation": m.group("mutation"),
                "hgvs": None,
                "disease_context": query,
                "is_mutation": True,
                "is_disease": False,
            }
        return {
            "gene": "",
            "mutation": "",
            "hgvs": None,
            "disease_context": query,
            "is_mutation": False,
            "is_disease": True,
        }

    def _lookup_curated(self, ctx: dict | None, query: str) -> dict | None:
        try:
            with open(CURATED_PROFILES_PATH) as f:
                profiles = json.load(f)
        except Exception:
            return None
        if not ctx:
            return None
        gene = (ctx.get("gene") or "").upper()
        mutation = (ctx.get("mutation") or "").upper()
        key = f"{gene}_{mutation}".lower().replace(" ", "_")
        if key in profiles:
            return profiles[key]
        query_lower = query.lower()
        for profile_key, profile in profiles.items():
            aliases = [a.lower() for a in profile.get("aliases", [])]
            if any(a in query_lower for a in aliases):
                return profile
        return None
