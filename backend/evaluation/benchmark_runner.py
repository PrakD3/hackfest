"""Run benchmark cases and measure accuracy."""

import asyncio
import json
import time
from pathlib import Path

BENCHMARK_PATH = Path(__file__).parent.parent / "data" / "benchmark_cases.json"


async def run_benchmark_cases(cases: list | None = None, run_id: str = "test") -> dict:
    try:
        with open(BENCHMARK_PATH) as f:
            all_cases = json.load(f)
    except Exception:
        all_cases = []

    if cases:
        selected = [c for c in all_cases if c.get("query") in cases]
    else:
        selected = all_cases[:5]

    from agents.OrchestratorAgent import OrchestratorAgent

    orch = OrchestratorAgent()
    results = []
    for case in selected:
        start = time.time()
        try:
            state = await orch.run_pipeline(case["query"], f"{run_id}_{case['query'][:10]}", "lite")
            elapsed = int((time.time() - start) * 1000)
            report = state.get("final_report", {})
            leads = report.get("ranked_leads", [])
            passed = len(leads) > 0
            results.append(
                {
                    "query": case["query"],
                    "passed": passed,
                    "elapsed_ms": elapsed,
                    "leads_found": len(leads),
                    "top_score": leads[0].get("docking_score") if leads else None,
                }
            )
        except Exception as e:
            results.append({"query": case.get("query", ""), "passed": False, "error": str(e)})

    accuracy = sum(1 for r in results if r.get("passed")) / len(results) if results else 0
    return {"run_id": run_id, "cases_run": len(results), "accuracy": accuracy, "results": results}
