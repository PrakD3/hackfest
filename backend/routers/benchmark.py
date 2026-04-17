"""POST /api/benchmark — run benchmark cases."""

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()


class BenchmarkRequest(BaseModel):
    cases: list[str] = []


@router.post("/benchmark")
async def run_benchmark(req: BenchmarkRequest, background_tasks: BackgroundTasks):
    import uuid

    from evaluation.benchmark_runner import run_benchmark_cases

    run_id = str(uuid.uuid4())
    background_tasks.add_task(run_benchmark_cases, req.cases or None, run_id)
    return {"run_id": run_id, "status": "started", "cases": len(req.cases)}
