"""GET /api/stream/{session_id} — SSE event stream."""

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/stream/{session_id}")
async def stream(session_id: str):
    from agents.OrchestratorAgent import _sse_queues

    async def event_generator():
        queue = _sse_queues.get(session_id)
        if not queue:
            yield f"data: {json.dumps({'event': 'error', 'message': 'Session not found'})}\n\n"
            return
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=120)
                yield f"data: {json.dumps(event, default=str)}\n\n"
                if event.get("event") == "pipeline_complete":
                    break
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'event': 'heartbeat'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
