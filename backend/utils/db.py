"""Async Neon PostgreSQL client using asyncpg directly (no SQLAlchemy)."""

import json
import os
import uuid

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("NEON_DATABASE_URL", "") or os.getenv("DATABASE_URL", "")


def _build_dsn() -> str | None:
    """Convert any postgres:// URL to an asyncpg-compatible DSN."""
    if not DATABASE_URL:
        return None
    url = DATABASE_URL
    # Normalize scheme
    for old in ("postgresql+asyncpg://", "postgresql://", "postgres://"):
        if url.startswith(old):
            url = "postgresql://" + url[len(old):]
            break
    # asyncpg handles ssl via connect keyword arg, not query string
    url = url.split("?")[0]
    return url


async def _get_conn():
    """Open a single asyncpg connection. Caller must close it."""
    import asyncpg  # type: ignore

    dsn = _build_dsn()
    if not dsn:
        return None
    return await asyncpg.connect(dsn, ssl="require")


async def init_db():
    """Create tables on startup. Safe to call multiple times."""
    conn = await _get_conn()
    if not conn:
        return
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS discoveries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id TEXT NOT NULL,
                query TEXT NOT NULL,
                gene TEXT,
                mutation TEXT,
                top_lead_smiles TEXT,
                top_lead_score FLOAT,
                selectivity_ratio FLOAT,
                summary TEXT,
                full_report JSONB,
                langsmith_run_id TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_themes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                theme_json JSONB NOT NULL,
                is_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
    finally:
        await conn.close()


async def save_discovery(state: dict) -> str:
    from utils.logger import get_logger
    logger = get_logger("db")

    if not _build_dsn():
        logger.warning("save_discovery: DATABASE_URL not configured")
        return ""

    # Already saved — return existing id
    if state.get("discovery_id"):
        return state["discovery_id"]

    conn = await _get_conn()
    if not conn:
        logger.warning("save_discovery: could not open DB connection")
        return ""

    try:
        report = state.get("final_report") or {}
        leads = report.get("ranked_leads", [{}])
        top = leads[0] if leads else {}
        ctx = state.get("mutation_context") or {}
        did = str(uuid.uuid4())

        summary = report.get("summary", "")
        if not summary and state.get("query"):
            summary = f"Analysis of {state.get('query')}"

        await conn.execute(
            """
            INSERT INTO discoveries
                (id, session_id, query, gene, mutation, top_lead_smiles,
                 top_lead_score, selectivity_ratio, summary, full_report, langsmith_run_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            did,
            state.get("session_id", ""),
            state.get("query", ""),
            ctx.get("gene", ""),
            ctx.get("mutation", ""),
            top.get("smiles", ""),
            top.get("docking_score"),
            top.get("selectivity_ratio"),
            summary,
            json.dumps(report) if report else "{}",
            state.get("langsmith_run_id", ""),
        )
        logger.info(f"save_discovery: saved {did}")
        return did
    except Exception as e:
        import traceback
        logger.error(f"save_discovery FAILED: {e}\n{traceback.format_exc()}")
        return ""
    finally:
        await conn.close()


async def list_discoveries(limit: int = 20) -> list[dict]:
    conn = await _get_conn()
    if not conn:
        return []
    try:
        rows = await conn.fetch(
            """
            SELECT id, session_id, query, gene, mutation, top_lead_smiles,
                   top_lead_score, selectivity_ratio, summary, langsmith_run_id, created_at
            FROM discoveries
            ORDER BY created_at DESC
            LIMIT $1
            """,
            limit,
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()


async def get_discovery(did: str) -> dict | None:
    conn = await _get_conn()
    if not conn:
        return None
    try:
        row = await conn.fetchrow(
            "SELECT * FROM discoveries WHERE id = $1", did
        )
        return dict(row) if row else None
    finally:
        await conn.close()


async def get_session_by_session_id(session_id: str) -> dict | None:
    """
    Recover a full pipeline state from Neon using the session_id.
    Returns the deserialized full_report embedded inside a state-like dict,
    so the /molecules endpoint can serve it after a backend restart.
    """
    conn = await _get_conn()
    if not conn:
        return None
    try:
        row = await conn.fetchrow(
            """
            SELECT session_id, query, gene, mutation, summary,
                   full_report, langsmith_run_id, created_at
            FROM discoveries
            WHERE session_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            session_id,
        )
        if not row:
            return None

        full_report = row["full_report"]
        if isinstance(full_report, str):
            full_report = json.loads(full_report)

        # All agents that run in the pipeline — mark every one as complete
        # so the frontend shows 100% progress and green dots.
        ALL_AGENTS = [
            "MutationParserAgent",
            "PlannerAgent",
            "FetchAgent",
            "StructurePrepAgent",
            "VariantEffectAgent",
            "PocketDetectionAgent",
            "MoleculeGenerationAgent",
            "DockingAgent",
            "SelectivityAgent",
            "ADMETAgent",
            "LeadOptimizationAgent",
            "GNNAffinityAgent",
            "MDValidationAgent",
            "ResistanceAgent",
            "SimilaritySearchAgent",
            "SynergyAgent",
            "ClinicalTrialAgent",
            "SynthesisAgent",
            "ExplainabilityAgent",
            "ReportAgent",
        ]

        # Build a minimal state dict the frontend can work with
        state: dict = {
            "session_id": row["session_id"],
            "query": row["query"],
            "status": "complete",
            "summary": row["summary"],
            "langsmith_run_id": row["langsmith_run_id"],
            "final_report": full_report,
            "agent_statuses": {agent: "complete" for agent in ALL_AGENTS},
            "errors": [],
            "warnings": [],
        }

        # Promote top-level arrays from the report if present
        if isinstance(full_report, dict):
            for key in (
                "docking_results",
                "selectivity_results",
                "admet_profiles",
                "toxicophore_highlights",
                "similar_compounds",
                "clinical_trials",
                "md_results",
                "sa_scores",
                "synthesis_routes",
                "resistance_flags",
                "knowledge_graph",
                "reasoning_trace",
                "pocket_delta",
                "structures",
                "literature",
                "evolution_tree",
                "confidence",
                "esm1v_score",
                "esm1v_confidence",
                "confidence_banner",
                "mutation_context",
            ):
                if key in full_report:
                    state[key] = full_report[key]

        return state
    finally:
        await conn.close()


async def save_theme(name: str, theme_json: dict) -> str:
    conn = await _get_conn()
    if not conn:
        return ""
    tid = str(uuid.uuid4())
    try:
        await conn.execute(
            """
            INSERT INTO user_themes (id, name, theme_json)
            VALUES ($1, $2, $3)
            ON CONFLICT (name) DO UPDATE SET theme_json = EXCLUDED.theme_json
            """,
            tid,
            name,
            json.dumps(theme_json),
        )
        return tid
    finally:
        await conn.close()


async def list_themes() -> list[dict]:
    conn = await _get_conn()
    if not conn:
        return []
    try:
        rows = await conn.fetch(
            "SELECT id, name, is_active, created_at FROM user_themes ORDER BY created_at DESC"
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()
