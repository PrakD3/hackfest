"""GET /api/molecules/{session_id}."""

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/molecules/{session_id}")
async def get_molecules(session_id: str):
    import agents.OrchestratorAgent  # Import module, not variable

    state = agents.OrchestratorAgent._sessions.get(session_id)

    # Not in memory (backend restarted) — try recovering from Neon
    if not state:
        try:
            from utils.db import get_session_by_session_id
            state = await get_session_by_session_id(session_id)
        except Exception:
            state = None

    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "query": state.get("query"),
        "mutation_context": state.get("mutation_context"),
        "literature": state.get("literature", []),
        "structures": state.get("structures", []),
        "pdb_content": state.get("pdb_content", ""),
        "binding_pocket": state.get("binding_pocket"),
        "pocket_detection_method": state.get("pocket_detection_method"),
        "pocket_delta": state.get("pocket_delta"),
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
        "resistance_flags": state.get("resistance_flags", []),
        "resistance_forecast": state.get("resistance_forecast"),
        "resistant_drugs": state.get("resistant_drugs", []),
        "recommended_drugs": state.get("recommended_drugs", []),
        "md_results": state.get("md_results", []),
        "sa_scores": state.get("sa_scores", []),
        "synthesis_routes": state.get("synthesis_routes", []),
        "confidence": state.get("confidence"),
        "confidence_banner": state.get("confidence_banner"),
        "esm1v_score": state.get("esm1v_score"),
        "esm1v_confidence": state.get("esm1v_confidence"),
        "final_report": state.get("final_report"),
        "status": state.get("status"),
        "cancelled": state.get("cancelled", False),
        "agent_statuses": state.get("agent_statuses", {}),
        "execution_time_ms": state.get("execution_time_ms", 0),
        "langsmith_run_id": state.get("langsmith_run_id"),
        "llm_provider_used": state.get("llm_provider_used", "unknown"),
        "discovery_id": state.get("discovery_id"),
    }
