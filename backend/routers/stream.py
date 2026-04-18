"""GET /api/stream/{session_id} — SSE event stream."""

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/stream/{session_id}")
async def stream(session_id: str):
    from agents.OrchestratorAgent import _sessions, _sse_queues

    async def event_generator():
        # ── Live session in memory ─────────────────────────────────────────
        queue = _sse_queues.get(session_id)
        if not queue and session_id in _sessions:
            queue = asyncio.Queue()
            _sse_queues[session_id] = queue

        if queue:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=120)
                    yield f"data: {json.dumps(event, default=str)}\n\n"
                    if event.get("event") == "pipeline_complete":
                        break
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'event': 'heartbeat'})}\n\n"
            return

        # ── Session not in memory — try recovering from Neon ───────────────
        try:
            from utils.db import get_session_by_session_id

            state = await get_session_by_session_id(session_id)
            if state and state.get("final_report"):
                # Emit pipeline_complete immediately so the frontend skips
                # the "running" view and goes straight to results.
                yield (
                    f"data: {json.dumps({'event': 'pipeline_complete', 'data': state}, default=str)}\n\n"
                )
                return
        except Exception:
            pass

        # ── Truly not found ────────────────────────────────────────────────
        yield f"data: {json.dumps({'event': 'not_found', 'message': 'Session not found'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
