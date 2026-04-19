import asyncio
from backend.agents.ClinicalTrialAgent import ClinicalTrialAgent

async def run():
    agent = ClinicalTrialAgent()
    state = {
        "analysis_plan": {"run_clinical_trials": True},
        "mutation_context": {"gene": "EGFR", "mutation": "T790M"}
    }
    result = await agent._execute(state)
    import json
    print(json.dumps(result, indent=2))

asyncio.run(run())
