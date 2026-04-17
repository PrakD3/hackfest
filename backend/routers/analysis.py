"""POST /api/analyze — start a pipeline run."""

import asyncio

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()


class AnalysisRequest(BaseModel):
    query: str
    mode: str = "full"


@router.post("/analyze")
async def analyze(req: AnalysisRequest, background_tasks: BackgroundTasks):
    import uuid

    session_id = str(uuid.uuid4())
    from pipeline.graph import get_orchestrator

    orchestrator = get_orchestrator()
    background_tasks.add_task(orchestrator.run_pipeline, req.query, session_id, req.mode)
    return {"session_id": session_id, "status": "started", "query": req.query}
