"""Resistance analysis + LLM resistance forecast."""

import json
from pathlib import Path

from utils.logger import get_logger

RESISTANCE_PATH = Path(__file__).parent.parent / "data" / "mutation_resistance.json"


class ResistanceAgent:
    """Reads mutation_context + admet_profiles. Writes resistance flags + forecast."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete", extra={"keys_updated": list(result.keys())})
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"ResistanceAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        plan = state.get("analysis_plan") or {}
        if not getattr(plan, "run_resistance", True):
            return {}

        ctx = state.get("mutation_context") or {}
        gene = (ctx.get("gene") or "").upper()
        mutation = (ctx.get("mutation") or "").upper()

        try:
            with open(RESISTANCE_PATH) as f:
                resistance_data = json.load(f)
        except Exception:
            resistance_data = {}

        key = f"{gene} {mutation}".strip().upper()
        entry = resistance_data.get(key, {})
        resistant_drugs = entry.get("resistant_to", [])
        recommended_drugs = entry.get("recommended", [])

        flags = []
        admet = state.get("admet_profiles", [])
        for a in admet:
            if a.get("pains_flag"):
                flags.append(
                    {
                        "drug_name": a.get("smiles", "")[:20],
                        "mutation": key,
                        "flag_type": "pains",
                        "reason": f"PAINS alert: {a.get('pains_match', 'unknown')}",
                    }
                )
        for drug in resistant_drugs:
            flags.append(
                {
                    "drug_name": drug,
                    "mutation": key,
                    "flag_type": "known_resistance",
                    "reason": entry.get("reason", "Known resistance mutation"),
                }
            )

        forecast = await self._forecast(gene, mutation, resistant_drugs, recommended_drugs)
        return {
            "resistance_flags": flags,
            "resistant_drugs": resistant_drugs,
            "recommended_drugs": recommended_drugs,
            "resistance_forecast": forecast,
        }

    async def _forecast(
        self, gene: str, mutation: str, resistant: list, recommended: list
    ) -> str | None:
        if not gene or not mutation:
            return None
        try:
            from utils.llm_router import LLMRouter

            prompt = (
                f"Given that {gene} {mutation} causes resistance to {resistant}, "
                f"what secondary/compensatory mutations might emerge under treatment pressure "
                f"with {recommended}? Answer in 2-3 sentences with specific mutation predictions."
            )
            forecast, _ = await LLMRouter("You are a clinical oncology expert.").generate(
                prompt, max_tokens=200
            )
            return forecast
        except Exception:
            return None
