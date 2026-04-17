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
        "generated_molecules": state.get("generated_molecules", []),
        "docking_results": state.get("docking_results", []),
        "final_report": state.get("final_report"),
    }
