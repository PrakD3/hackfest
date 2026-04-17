"""Quick test to verify GNN + MD + Synthesis agents work."""

import asyncio
from agents.OrchestratorAgent import OrchestratorAgent


async def test_pipeline():
    orch = OrchestratorAgent()
    result = await orch.run_pipeline("EGFR T790M", "test-session-v4")

    # Check critical agents
    agents_to_check = ["GNNAffinityAgent", "MDValidationAgent", "SynthesisAgent"]
    statuses = result.get("agent_statuses", {})

    print("\n=== Critical Agent Status ===")
    for agent in agents_to_check:
        status = statuses.get(agent, "NOT_FOUND")
        print(f"{agent}: {status}")

    # Check outputs
    print("\n=== Key Outputs Present ===")
    print(f"top_2_finalists: {'top_2_finalists' in result}")
    print(f"md_results: {'md_results' in result}")
    print(f"synthesis_routes: {'synthesis_routes' in result}")

    # Show sample data if available
    if "top_2_finalists" in result:
        finalists = result["top_2_finalists"]
        print(f"\nFinalists: {len(finalists)}")
        for i, mol in enumerate(finalists[:2]):
            print(f"  {i+1}. GNN Affinity: {mol.get('affinity_gnn')} kcal/mol")

    if "md_results" in result:
        md = result["md_results"]
        print(f"\nMD Results: {len(md)} simulations")
        for i, sim in enumerate(md[:2]):
            print(f"  {i+1}. RMSD: {sim.get('rmsd_mean_angstrom')} Å ({sim.get('stability_label')})")

    if "synthesis_routes" in result:
        synth = result["synthesis_routes"]
        print(f"\nSynthesis Routes: {len(synth)} planned")
        for i, route in enumerate(synth[:2]):
            print(f"  {i+1}. SA Score: {route.get('sa_score')} ({route.get('sa_category')})")

    print("\n[OK] Pipeline test complete")
    return result


if __name__ == "__main__":
    asyncio.run(test_pipeline())
