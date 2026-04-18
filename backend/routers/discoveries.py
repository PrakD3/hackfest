"""GET/POST/DELETE /api/discoveries."""

from fastapi import APIRouter, HTTPException

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
    import agents.OrchestratorAgent  # Import module, not variable

    state = agents.OrchestratorAgent._sessions.get(session_id)

    # Not in live memory — try recovering from Neon
    if not state:
        try:
            from utils.db import get_session_by_session_id
            state = await get_session_by_session_id(session_id)
        except Exception:
            state = None

    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    did = await save_discovery(state)
    if not did:
        from utils.db import _build_dsn
        detail = "DB not configured" if not _build_dsn() else "DB insert failed"
        raise HTTPException(status_code=500, detail=detail)
    return {"discovery_id": did}


@router.delete("/discoveries/{discovery_id}")
async def delete_one(discovery_id: str):
    from utils.db import _get_conn, _build_dsn

    if not _build_dsn():
        raise HTTPException(status_code=503, detail="DB not configured")

    conn = await _get_conn()
    if not conn:
        raise HTTPException(status_code=503, detail="DB connection failed")
    try:
        await conn.execute(
            "DELETE FROM discoveries WHERE id = $1", discovery_id
        )
    finally:
        await conn.close()
    return {"deleted": discovery_id}
