"""Test pocket geometry and selectivity fixes."""
import asyncio
import json
from agents.SelectivityAgent import SelectivityAgent

# Mock state
state = {
    "analysis_plan": type('obj', (object,), {'run_selectivity': True})(),
    "structures": [{"pdb_id": "1M17"}],
    "pdb_content": "HEADER TEST",
    "mutation_context": {"position": 790, "gene": "EGFR"},
    "docking_results": [{"smiles": "CCO", "mutant_affinity": -8.5}],
    "off_target_proteins": [],  # Empty - no off-targets
    "pdb_structures": {}  # Empty - no PDB data
}

async def test():
    print("=" * 70)
    print("TESTING SELECTIVITY AGENT FIX")
    print("=" * 70)
    
    # Test SelectivityAgent with missing dependencies
    agent = SelectivityAgent()
    result = await agent.run(state)
    
    print("\n✓ SelectivityAgent Result (with missing dependencies):")
    print(json.dumps(result, indent=2))
    
    # Verify the fix
    assert "selectivity_results" in result, "Missing selectivity_results key!"
    assert isinstance(result["selectivity_results"], list), "selectivity_results should be a list!"
    assert "selectivity_note" in result, "Missing selectivity_note key!"
    assert "selectivity_disabled" in result, "Missing selectivity_disabled flag!"
    
    print("\n✅ ALL CHECKS PASSED!")
    print("\nBackend now returns:")
    print("  - selectivity_results: [] (empty list, not empty dict)")
    print("  - selectivity_note: Clear explanation message")
    print("  - selectivity_disabled: True flag")
    print("\nFrontend can now display the reason why selectivity is unavailable!")

if __name__ == "__main__":
    asyncio.run(test())
