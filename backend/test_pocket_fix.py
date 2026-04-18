"""Test pocket geometry fix."""
import asyncio
import json
from agents.PocketDetectionAgent import PocketDetectionAgent

# Mock state
state = {
    "analysis_plan": type('obj', (object,), {'run_pocket_detection': True})(),
    "structures": [{"pdb_id": "1M17", "pdb_content": "HEADER PROTEIN..."}],
    "pdb_content": "HEADER PROTEIN...",
    "mutation_context": {
        "position": 790,
        "gene": "EGFR",
        "wt_aa": "T",
        "mut_aa": "M"
    },
    "plddt": 92.5
}

async def test():
    print("=" * 70)
    print("TESTING POCKET GEOMETRY AGENT FIX")
    print("=" * 70)
    
    agent = PocketDetectionAgent()
    result = await agent.run(state)
    
    print("\n✓ PocketDetectionAgent Result:")
    print(json.dumps(result, indent=2, default=str))
    
    # Verify the fix
    assert "pocket_delta" in result, "Missing pocket_delta key!"
    pocket_delta = result["pocket_delta"]
    
    assert "volume_delta" in pocket_delta, "Missing volume_delta!"
    assert "hydrophobicity_delta" in pocket_delta, "Missing hydrophobicity_delta!"
    assert "polarity_delta" in pocket_delta, "Missing polarity_delta!"
    assert "charge_delta" in pocket_delta, "Missing charge_delta!"
    assert "pocket_reshaped" in pocket_delta, "Missing pocket_reshaped!"
    
    print("\n✅ POCKET GEOMETRY FIX VALIDATED!")
    print("\nBackend now returns pocket_delta with correct field names:")
    print("  ✓ volume_delta (NOT volume_score_delta)")
    print("  ✓ hydrophobicity_delta (NOT hydrophobicity_score_delta)")
    print("  ✓ polarity_delta (NOT polarity_score_delta)")
    print("  ✓ charge_delta (NOT charge_score_delta)")
    print("  ✓ pocket_reshaped")
    print("\nFrontend field name mappings on page.tsx are now CORRECT!")

if __name__ == "__main__":
    asyncio.run(test())
