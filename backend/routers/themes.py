"""GET/POST/PUT/DELETE /api/themes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.db import _build_dsn, _get_conn, list_themes, save_theme

router = APIRouter()


class ThemeRequest(BaseModel):
    name: str
    theme_json: dict


@router.get("/themes")
async def list_all():
    return await list_themes()


@router.post("/themes")
async def create_theme(req: ThemeRequest):
    tid = await save_theme(req.name, req.theme_json)
    return {"id": tid, "name": req.name}


@router.put("/themes/{theme_id}/activate")
async def activate_theme(theme_id: str):
    if not _build_dsn():
        raise HTTPException(status_code=503, detail="DB not configured")
    conn = await _get_conn()
    if not conn:
        raise HTTPException(status_code=503, detail="DB connection failed")
    try:
        await conn.execute("UPDATE user_themes SET is_active = FALSE")
        await conn.execute(
            "UPDATE user_themes SET is_active = TRUE WHERE id = $1", theme_id
        )
    finally:
        await conn.close()
    return {"activated": theme_id}


@router.delete("/themes/{theme_id}")
async def delete_theme(theme_id: str):
    if not _build_dsn():
        raise HTTPException(status_code=503, detail="DB not configured")
    conn = await _get_conn()
    if not conn:
        raise HTTPException(status_code=503, detail="DB connection failed")
    try:
        await conn.execute("DELETE FROM user_themes WHERE id = $1", theme_id)
    finally:
        await conn.close()
    return {"deleted": theme_id}
