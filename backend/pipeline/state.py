"""Pipeline state: single source of truth for all agents."""
from __future__ import annotations
import operator
from dataclasses import dataclass, field
from enum import Enum
from typing import Annotated, Any


class PipelineMode(str, Enum):
    FULL = "full"
    LITE = "lite"


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class AnalysisPlan:
    run_literature: bool = True
    run_target: bool = True
    run_structure: bool = True
    run_compound: bool = True
    run_pocket_detection: bool = True
    run_molecule_generation: bool = True
    run_docking: bool = True
    run_selectivity: bool = True
    run_admet: bool = True
    run_lead_optimization: bool = True
    run_resistance: bool = True
    run_similarity: bool = True
    run_synergy: bool = False
    run_clinical_trials: bool = True
    run_report: bool = True


class PipelineState(dict):
    """LangGraph state dict."""
    pass
