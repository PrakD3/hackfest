"""GET/POST/PUT/DELETE /api/themes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from utils.db import get_engine, list_themes, save_theme

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
    engine = get_engine()
    if not engine:
        raise HTTPException(status_code=503, detail="DB not configured")
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE user_themes SET is_active = FALSE"))
        await conn.execute(
            text("UPDATE user_themes SET is_active = TRUE WHERE id = :id"), {"id": theme_id}
        )
    return {"activated": theme_id}


@router.delete("/themes/{theme_id}")
async def delete_theme(theme_id: str):
    engine = get_engine()
    if not engine:
        raise HTTPException(status_code=503, detail="DB not configured")
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM user_themes WHERE id = :id"), {"id": theme_id})
    return {"deleted": theme_id}
