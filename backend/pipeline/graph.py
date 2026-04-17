"""LangGraph pipeline graph definition."""

from agents.OrchestratorAgent import OrchestratorAgent

# Singleton orchestrator
_orchestrator: OrchestratorAgent | None = None


def get_orchestrator() -> OrchestratorAgent:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = OrchestratorAgent()
    return _orchestrator
