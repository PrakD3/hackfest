"""Pipeline planning utilities."""

from pipeline.state import AnalysisPlan, PipelineMode


def plan_from_mode(mode: PipelineMode, has_mutation: bool, query_tokens: int) -> AnalysisPlan:
    """Create an AnalysisPlan based on mode and query characteristics."""
    if mode == PipelineMode.LITE or (not has_mutation and query_tokens <= 2):
        return AnalysisPlan(
            run_structure=False,
            run_pocket_detection=False,
            run_molecule_generation=False,
            run_docking=False,
            run_selectivity=False,
            run_admet=False,
            run_lead_optimization=False,
            run_synergy=False,
        )
    return AnalysisPlan()
