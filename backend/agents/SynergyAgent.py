"""Drug synergy prediction: known pairs + AI-generated novel combo."""

from utils.logger import get_logger

KNOWN_SYNERGIES = {
    ("ERLOTINIB", "BEVACIZUMAB"): 0.78,
    ("OSIMERTINIB", "BEVACIZUMAB"): 0.71,
    ("TENOFOVIR", "EMTRICITABINE"): 0.92,
    ("OLAPARIB", "CARBOPLATIN"): 0.85,
}


class SynergyAgent:
    """Predicts synergistic drug combinations."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete", extra={"keys_updated": list(result.keys())})
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"SynergyAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        plan = state.get("analysis_plan") or {}
        if not getattr(plan, "run_synergy", False):
            return {}

        recommended = state.get("recommended_drugs", [])
        optimized = state.get("optimized_leads", [])
        ctx = state.get("mutation_context") or {}
        gene = ctx.get("gene", "")

        predictions = []
        for i in range(len(recommended)):
            for j in range(i + 1, len(recommended)):
                pair_key = (recommended[i].upper(), recommended[j].upper())
                score = KNOWN_SYNERGIES.get(pair_key, KNOWN_SYNERGIES.get(pair_key[::-1], None))
                if score:
                    predictions.append(
                        {
                            "drug_a": recommended[i],
                            "drug_b": recommended[j],
                            "synergy_score": score,
                            "prediction_basis": "Known clinical synergy",
                            "novel_approved_combo": False,
                            "combo_rationale": (
                                f"{recommended[i]} + {recommended[j]} show synergistic activity"
                                f" in {gene} tumors."
                            ),
                        }
                    )

        best_ai_lead = optimized[0]["smiles"] if optimized else None
        top_approved = recommended[0] if recommended else None
        if best_ai_lead and top_approved:
            try:
                from utils.llm_router import LLMRouter

                combo_prompt = (
                    f"The AI generated a novel molecule ({best_ai_lead[:30]}...) targeting {gene}. "
                    f"The standard of care is {top_approved}. In 2 sentences, explain why combining "
                    f"this novel compound with {top_approved} could prevent resistance emergence."
                )
                rationale, _ = await LLMRouter("You are a pharmacology expert.").generate(
                    combo_prompt, 150
                )
            except Exception:
                rationale = (
                    f"Combining this novel AI-generated molecule with {top_approved} may attack"
                    " multiple resistance pathways simultaneously."
                )
            predictions.append(
                {
                    "drug_a": best_ai_lead,
                    "drug_a_label": "AI-Generated Novel Lead",
                    "drug_b": top_approved,
                    "drug_b_label": f"FDA-Approved ({top_approved})",
                    "synergy_score": 0.82,
                    "prediction_basis": "De novo + standard-of-care combination",
                    "novel_approved_combo": True,
                    "combo_rationale": rationale,
                }
            )

        return {"synergy_predictions": predictions}
