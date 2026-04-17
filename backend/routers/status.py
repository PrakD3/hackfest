"""GET /api/health and GET /api/system-status."""

from fastapi import APIRouter

from utils.system_check import get_system_status

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "version": "3.0.0"}


@router.get("/system-status")
async def system_status():
    status = get_system_status()
    api_keys = {
        "groq": bool(__import__("os").getenv("GROQ_API_KEY")),
        "together": bool(__import__("os").getenv("TOGETHER_API_KEY")),
        "ncbi": bool(__import__("os").getenv("NCBI_API_KEY")),
        "langsmith": bool(__import__("os").getenv("LANGCHAIN_API_KEY")),
        "database": bool(__import__("os").getenv("DATABASE_URL")),
        "neon": bool(__import__("os").getenv("DATABASE_URL")),  # Alias for database
    }
    return {"system": status, "api_keys": api_keys}
