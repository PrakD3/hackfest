"""Decides pipeline mode (full vs lite) and which stages to run."""

from pipeline.state import AnalysisPlan, PipelineMode


class PlannerAgent:
    """Reads query+mutation_context, writes analysis_plan."""

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
            return {"errors": [f"PlannerAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        query = state.get("query", "")
        mode = state.get("mode", PipelineMode.FULL)
        ctx = state.get("mutation_context") or {}
        tokens = query.split()
        is_mutation = ctx.get("is_mutation", False)
        has_digits = any(any(c.isdigit() for c in t) for t in tokens)

        if mode == PipelineMode.LITE or (not is_mutation and len(tokens) <= 2 and not has_digits):
            plan = AnalysisPlan(
                run_literature=True,
                run_target=True,
                run_structure=False,
                run_compound=True,
                run_pocket_detection=False,
                run_molecule_generation=False,
                run_docking=False,
                run_selectivity=False,
                run_admet=False,
                run_lead_optimization=False,
                run_resistance=True,
                run_similarity=True,
                run_synergy=False,
                run_clinical_trials=True,
                run_report=True,
            )
            actual_mode = PipelineMode.LITE
        else:
            plan = AnalysisPlan()
            actual_mode = PipelineMode.FULL

        # Initialize confidence tracking object
        confidence = {
            "structure": 1.0,      # pLDDT-based (StructurePrepAgent)
            "docking": 1.0,        # Vina/Gnina/hash based (DockingAgent)
            "selectivity": 1.0,    # WT vs mutant or off-target (SelectivityAgent)
            "admet": 1.0,          # RDKit-based property filtering (ADMETAgent)
            "final": 1.0,          # Minimum of all above
        }
        
        return {
            "analysis_plan": plan,
            "mode": actual_mode,
            "confidence": confidence,
        }
