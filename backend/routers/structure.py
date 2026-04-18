"""GET /api/structure/{session_id} — receptor structure for a session."""

from fastapi import APIRouter, HTTPException, Response

router = APIRouter()


@router.get("/structure/{session_id}")
async def get_structure(session_id: str):
    from agents.OrchestratorAgent import _sessions

    state = _sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    pdb_content = state.get("pdb_content")
    if not pdb_content:
        raise HTTPException(status_code=404, detail="Structure not available")

    return Response(pdb_content, media_type="chemical/x-pdb")
