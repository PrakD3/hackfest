"""LangGraph orchestrator: runs full pipeline, publishes SSE, stores results."""

import asyncio
import os
import time
import uuid
from typing import AsyncIterator

os.environ.setdefault("LANGCHAIN_TRACING_V2", os.getenv("LANGCHAIN_TRACING_V2", "false"))
os.environ.setdefault(
    "LANGCHAIN_ENDPOINT", os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
)
os.environ.setdefault("LANGCHAIN_API_KEY", os.getenv("LANGCHAIN_API_KEY", ""))
os.environ.setdefault(
    "LANGCHAIN_PROJECT", os.getenv("LANGCHAIN_PROJECT", "drug-discovery-hackathon")
)

from pipeline.state import AgentStatus, PipelineMode

# In-memory session store
_sessions: dict[str, dict] = {}
_sse_queues: dict[str, asyncio.Queue] = {}

AGENT_ORDER = [
    ("MutationParserAgent", 10),
    ("PlannerAgent", 15),
    ("FetchAgent", 25),
    ("StructurePrepAgent", 33),
    ("PocketDetectionAgent", 40),
    ("MoleculeGenerationAgent", 50),
    ("DockingAgent", 60),
    ("SelectivityAgent", 68),
    ("ADMETAgent", 74),
    ("LeadOptimizationAgent", 80),
    ("ResistanceAgent", 84),
    ("SimilaritySearchAgent", 87),
    ("SynergyAgent", 90),
    ("ClinicalTrialAgent", 93),
    ("KnowledgeGraphAgent", 96),
    ("ExplainabilityAgent", 98),
    ("ReportAgent", 100),
]


def _import_agent(name: str):
    mod = __import__(f"agents.{name}", fromlist=[name])
    cls = getattr(mod, name)
    return cls()


class OrchestratorAgent:
    """Runs the full 17-agent pipeline sequentially with SSE events."""

    async def run_pipeline(self, query: str, session_id: str, mode: str = "full") -> dict:
        start = time.time()
        state: dict = {
            "query": query,
            "session_id": session_id,
            "mode": PipelineMode.FULL if mode == "full" else PipelineMode.LITE,
            "agent_statuses": {},
            "errors": [],
            "warnings": [],
            "confidence_scores": {},
            "langsmith_run_id": None,
            "execution_time_ms": 0,
            "llm_provider_used": "unknown",
        }

        queue: asyncio.Queue = asyncio.Queue()
        _sse_queues[session_id] = queue

        agent_names = [a[0] for a in AGENT_ORDER]
        for name in agent_names:
            state["agent_statuses"][name] = AgentStatus.PENDING

        await queue.put({"event": "pipeline_start", "session_id": session_id, "query": query})

        for agent_name, progress in AGENT_ORDER:
            state["agent_statuses"][agent_name] = AgentStatus.RUNNING
            await queue.put({"event": "agent_start", "agent": agent_name, "progress": progress - 5})

            try:
                agent = _import_agent(agent_name)
                result = await agent.run(state)
                state.update(result)
                state["agent_statuses"][agent_name] = AgentStatus.COMPLETE
                await queue.put(
                    {
                        "event": "agent_complete",
                        "agent": agent_name,
                        "progress": progress,
                        "data": {k: v for k, v in result.items() if k != "errors"},
                    }
                )
            except Exception as exc:
                state["agent_statuses"][agent_name] = AgentStatus.FAILED
                state.setdefault("errors", []).append(f"{agent_name}: {exc}")
                await queue.put({"event": "agent_error", "agent": agent_name, "error": str(exc)})

        state["execution_time_ms"] = int((time.time() - start) * 1000)

        if os.getenv("AUTO_SAVE_DISCOVERIES", "").lower() == "true":
            try:
                from utils.db import save_discovery

                did = await save_discovery(state)
                if did:
                    state["discovery_id"] = did
            except Exception:
                pass

        _sessions[session_id] = state
        await queue.put(
            {
                "event": "pipeline_complete",
                "data": state,
                "langsmith_run_id": state.get("langsmith_run_id"),
            }
        )
        return state

    def get_session(self, session_id: str) -> dict | None:
        return _sessions.get(session_id)

    async def stream_events(self, session_id: str) -> AsyncIterator[dict]:
        queue = _sse_queues.get(session_id)
        if not queue:
            return
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=120)
                yield event
                if event.get("event") == "pipeline_complete":
                    break
            except asyncio.TimeoutError:
                break
