"""Async Neon PostgreSQL client using SQLAlchemy asyncio."""

import json
import os
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv("DATABASE_URL", "")


def get_engine():
    if not DATABASE_URL:
        return None
    url = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    if not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return create_async_engine(url, echo=False)


async def init_db():
    """Create tables on startup. Safe to call multiple times."""
    engine = get_engine()
    if not engine:
        return
    async with engine.begin() as conn:
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS discoveries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id TEXT NOT NULL,
                query TEXT NOT NULL,
                gene TEXT, mutation TEXT,
                top_lead_smiles TEXT,
                top_lead_score FLOAT,
                selectivity_ratio FLOAT,
                summary TEXT,
                full_report JSONB,
                langsmith_run_id TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS user_themes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                theme_json JSONB NOT NULL,
                is_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        )


async def save_discovery(state: dict) -> str:
    engine = get_engine()
    if not engine:
        return ""
    try:
        report = state.get("final_report") or {}
        leads = report.get("ranked_leads", [{}])
        top = leads[0] if leads else {}
        ctx = state.get("mutation_context") or {}
        did = str(uuid.uuid4())
        async with engine.begin() as conn:
            await conn.execute(
                text("""
                INSERT INTO discoveries
                (id, session_id, query, gene, mutation, top_lead_smiles,
                 top_lead_score, selectivity_ratio, summary, full_report, langsmith_run_id)
                VALUES (:id, :sid, :q, :gene, :mut, :smiles,
                        :score, :sel, :summary, :report, :ls_id)
            """),
                {
                    "id": did,
                    "sid": state.get("session_id", ""),
                    "q": state.get("query", ""),
                    "gene": ctx.get("gene", ""),
                    "mut": ctx.get("mutation", ""),
                    "smiles": top.get("smiles", ""),
                    "score": top.get("docking_score"),
                    "sel": top.get("selectivity_ratio"),
                    "summary": report.get("summary", ""),
                    "report": json.dumps(report),
                    "ls_id": state.get("langsmith_run_id", ""),
                },
            )
        return did
    except Exception as e:
        from utils.logger import get_logger

        get_logger("db").error(f"save_discovery: {e}")
        return ""


async def list_discoveries(limit: int = 20) -> list[dict]:
    engine = get_engine()
    if not engine:
        return []
    async with engine.connect() as conn:
        r = await conn.execute(
            text(
                "SELECT id, session_id, query, gene, mutation, top_lead_smiles, "
                "top_lead_score, selectivity_ratio, summary, langsmith_run_id, created_at "
                "FROM discoveries ORDER BY created_at DESC LIMIT :lim"
            ),
            {"lim": limit},
        )
        return [dict(row._mapping) for row in r.fetchall()]


async def get_discovery(did: str) -> dict | None:
    engine = get_engine()
    if not engine:
        return None
    async with engine.connect() as conn:
        r = await conn.execute(
            text("SELECT * FROM discoveries WHERE id = :id"), {"id": did}
        )
        row = r.fetchone()
        return dict(row._mapping) if row else None


async def save_theme(name: str, theme_json: dict) -> str:
    engine = get_engine()
    if not engine:
        return ""
    tid = str(uuid.uuid4())
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO user_themes (id, name, theme_json) VALUES (:id, :name, :tj) "
                "ON CONFLICT (name) DO UPDATE SET theme_json = EXCLUDED.theme_json"
            ),
            {"id": tid, "name": name, "tj": json.dumps(theme_json)},
        )
    return tid


async def list_themes() -> list[dict]:
    engine = get_engine()
    if not engine:
        return []
    async with engine.connect() as conn:
        r = await conn.execute(
            text(
                "SELECT id, name, is_active, created_at FROM user_themes ORDER BY created_at DESC"
            )
        )
        return [dict(row._mapping) for row in r.fetchall()]
