"""GET/POST/DELETE /api/discoveries."""

from fastapi import APIRouter, HTTPException

from agents.OrchestratorAgent import _sessions
from utils.db import get_discovery, list_discoveries, save_discovery

router = APIRouter()


@router.get("/discoveries")
async def list_all():
    return await list_discoveries()


@router.get("/discoveries/{discovery_id}")
async def get_one(discovery_id: str):
    d = await get_discovery(discovery_id)
    if not d:
        raise HTTPException(status_code=404, detail="Discovery not found")
    return d


@router.post("/discoveries/{session_id}/save")
async def save_session(session_id: str):
    state = _sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    did = await save_discovery(state)
    if not did:
        raise HTTPException(status_code=500, detail="DB not configured or save failed")
    return {"discovery_id": did}


@router.delete("/discoveries/{discovery_id}")
async def delete_one(discovery_id: str):
    from sqlalchemy import text

    from utils.db import get_engine

    engine = get_engine()
    if not engine:
        raise HTTPException(status_code=503, detail="DB not configured")
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM discoveries WHERE id = :id"), {"id": discovery_id})
    return {"deleted": discovery_id}
