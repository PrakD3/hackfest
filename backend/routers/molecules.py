"""GET /api/molecules/{session_id}."""

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/molecules/{session_id}")
async def get_molecules(session_id: str):
    from agents.OrchestratorAgent import _sessions

    state = _sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "query": state.get("query"),
        "mutation_context": state.get("mutation_context"),
        "literature": state.get("literature", []),
        "structures": state.get("structures", []),
        "pdb_content": state.get("pdb_content", ""),
        "generated_molecules": state.get("generated_molecules", []),
        "docking_results": state.get("docking_results", []),
        "selectivity_results": state.get("selectivity_results", []),
        "admet_profiles": state.get("admet_profiles", []),
        "toxicophore_highlights": state.get("toxicophore_highlights", []),
        "optimized_leads": state.get("optimized_leads", []),
        "evolution_tree": state.get("evolution_tree"),
        "similar_compounds": state.get("similar_compounds", []),
        "synergy_predictions": state.get("synergy_predictions", []),
        "clinical_trials": state.get("clinical_trials", []),
        "knowledge_graph": state.get("knowledge_graph"),
        "reasoning_trace": state.get("reasoning_trace"),
        "summary": state.get("summary"),
        "resistance_forecast": state.get("resistance_forecast"),
        "resistant_drugs": state.get("resistant_drugs", []),
        "recommended_drugs": state.get("recommended_drugs", []),
        "final_report": state.get("final_report"),
        "agent_statuses": state.get("agent_statuses", {}),
        "execution_time_ms": state.get("execution_time_ms", 0),
        "langsmith_run_id": state.get("langsmith_run_id"),
        "llm_provider_used": state.get("llm_provider_used", "unknown"),
    }
