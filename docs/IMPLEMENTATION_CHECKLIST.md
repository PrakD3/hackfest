# IMPLEMENTATION CHECKLIST - PRODUCTION DOCKING SYSTEM

## PRE-DEPLOYMENT VERIFICATION

This checklist ensures the production docking system is properly installed and configured before going live.

---

## PHASE 1: DEPENDENCIES (Required)

- [ ] **Install AutoDock Vina**
  ```bash
  pip install vina
  vina --version  # Should show version, not "command not found"
  ```

- [ ] **Install Open Babel**
  ```bash
  # Linux/Ubuntu
  sudo apt install openbabel
  
  # macOS
  brew install open-babel
  
  # Conda
  conda install -c conda-forge openbabel
  
  obabel -V  # Should show version
  ```

- [ ] **Install RDKit**
  ```bash
  pip install rdkit
  python -c "from rdkit import Chem; print('OK')"
  ```

- [ ] **Verify all executables in PATH**
  ```bash
  which vina    # Should return path
  which obabel  # Should return path
  ```

---

## PHASE 2: CODE INTEGRATION

- [ ] **Copy production agent to codebase**
  ```bash
  cp DockingAgent_Production.py backend/agents/
  ```

- [ ] **Update OrchestratorAgent.py imports**
  
  Find:
  ```python
  from agents.DockingAgent import DockingAgent
  from agents.SelectivityAgent import SelectivityAgent
  ```
  
  Replace with:
  ```python
  from agents.DockingAgent_Production import DockingAgent
  from agents.SelectivityAgent_v2_strict import SelectivityAgent
  ```

- [ ] **Verify imports work**
  ```bash
  python -c "from backend.agents.DockingAgent_Production import DockingAgent; print('OK')"
  ```

- [ ] **(Optional) Remove old fake docking agent**
  ```bash
  # Backup first
  mv backend/agents/DockingAgent.py backend/agents/DockingAgent_DEPRECATED.py
  ```

---

## PHASE 3: TESTING (7-part test suite)

Run the comprehensive test suite:

```bash
cd c:\Projects\hackfest
python test_production_docking.py
```

This will run:

1. ✓ Dependency verification (vina, obabel, RDKit)
2. ✓ Import verification
3. ✓ Protein preparation (PDB→PDBQT)
4. ✓ Ligand preparation (SMILES→3D→PDBQT)
5. ✓ Molecular docking execution
6. ✓ Dual docking (mutant + WT)
7. ✓ Visualization file generation

**Expected output:**
```
█████████████████████████████████████████████████████████████████████
█                    TEST SUMMARY                                   █
█████████████████████████████████████████████████████████████████████
✓ PASS - Dependencies
✓ PASS - Imports
✓ PASS - Protein Preparation
✓ PASS - Ligand Preparation
✓ PASS - Docking Execution
✓ PASS - Dual Docking
✓ PASS - Visualization Files

RESULT: 7/7 tests passed

✓ ALL TESTS PASSED - System ready for deployment
```

- [ ] **All 7 tests pass**

---

## PHASE 4: OPTIONAL DEPLOYMENT TESTS

### Test with Real PDB File

```python
import asyncio
from backend.agents.DockingAgent_Production import DockingAgent

async def test_with_real_pdb():
    agent = DockingAgent()
    
    # Load a real PDB file
    with open("path/to/real_structure.pdb") as f:
        pdb_content = f.read()
    
    state = {
        "pdb_content": pdb_content,
        "generated_molecules": [
            {"smiles": "CCO", "compound_name": "test1"},
            {"smiles": "CC(C)C", "compound_name": "test2"},
        ],
        "binding_pocket": {
            "center_x": 0, "center_y": 0, "center_z": 0,
            "size_x": 20, "size_y": 20, "size_z": 20,
        },
        "structures": [{"pdb_id": "1ABC"}],
    }
    
    result = await agent.run(state)
    
    # Verify
    assert result["real_docking"] == True
    assert len(result["docking_results"]) > 0
    assert result["docking_results"][0]["is_real"] == True
    
    print("✓ Real PDB test passed")

asyncio.run(test_with_real_pdb())
```

- [ ] **Real PDB docking works**

### Test Pipeline Integration

```bash
# Run full analysis pipeline with sample data
python -m backend.main --run_docking true
```

- [ ] **Pipeline runs without errors**
- [ ] **Output contains `"real_docking": true`**
- [ ] **Output contains `"is_real": true` for molecules**
- [ ] **Visualization files are generated and readable**

---

## PHASE 5: CONFIGURATION

### Check Main Entry Point

Verify that `backend/main.py` calls the docking agent:

```python
# In main.py or orchestration code
from agents.DockingAgent_Production import DockingAgent

docking_agent = DockingAgent()
docking_result = await docking_agent.run(state)
```

- [ ] **Main entry point imports DockingAgent_Production**
- [ ] **No fallbacks to old DockingAgent**

### Check API Contracts

Verify state object has required fields:

```python
state = {
    "pdb_content": "<PDB file content>",           # String, non-empty
    "wt_pdb_content": "<PDB file content>",        # Optional: for ΔΔG
    "generated_molecules": [                        # List of dicts
        {"smiles": "...", "compound_name": "..."}
    ],
    "binding_pocket": {                             # Required dict
        "center_x": float,
        "center_y": float,
        "center_z": float,
        "size_x": float,
        "size_y": float,
        "size_z": float,
    },
    "structures": [{"pdb_id": "..."}],              # List, at least 1
}
```

- [ ] **Pocket coordinates are provided**
- [ ] **At least one molecule in generated_molecules**
- [ ] **PDB content is non-empty string**

---

## PHASE 6: MONITORING & LOGGING

During deployment, monitor logs for:

- [ ] **"DockingAgent (PRODUCTION) - Starting"** (info level)
- [ ] **"✓ All dependencies available"** (info level)
- [ ] **"✓ Wrote PDB:", "✓ Cleaned PDB:", "✓ Added hydrogens"** (info level)
- [ ] **"Running Vina:"** (info level)
- [ ] **"✓ Mutant: X.X kcal/mol"** (info level)
- [ ] **"Successfully docked N molecules"** (info level)

### Check for Error Patterns

If you see these errors, investigate:

- [ ] **"DOCKING UNAVAILABLE - Missing dependencies"** → Run Phase 1 above
- [ ] **"SMILES parse failed"** → Invalid SMILES in input (expected, skipped)
- [ ] **"Vina execution FAILED"** → Check Vina installation, pocket coordinates
- [ ] **"File not found"** → Check PDB content, file paths

---

## PHASE 7: VALIDATION OF OUTPUTS

### Check Output Structure

Every docking result should have:

```python
result = {
    "smiles": str,                           # ← Input SMILES
    "compound_name": str,
    "mutant_affinity": float,                # ← REAL VINA VALUE (negative)
    "mutant_affinity_formatted": str,        # ← With uncertainty (±1.8)
    "wt_affinity": float,                    # ← Optional (if WT docked)
    "wt_affinity_formatted": str,
    "delta_ddg": float,                      # ← ΔG_mut - ΔG_WT
    "delta_ddg_formatted": str,
    "ligand_pdb": str,                       # ← File path
    "ligand_sdf": str,                       # ← File path
    "ligand_num_atoms": int,
    "ligand_mw": float,
    "complex_pdb": str,                      # ← Protein + ligand
    "complex_pdbqt": str,
    "is_validated": bool,                    # ← Should be True
    "is_real": bool,                         # ← Should be True (NOT "ai_fallback")
    "visualization": {
        "complex_file": str,                 # ← Readable file
        "ligand_file": str,                  # ← Readable file
        "protein_file": str,
        "wt_protein_file": str,              # ← Optional
        "type": "complex"
    }
}
```

Check each result:

- [ ] **`is_real` = True** (NOT False, NOT missing)
- [ ] **`mutant_affinity` in range (-20, 0)** (kcal/mol)
- [ ] **`mutant_affinity_formatted` contains "Vina"** (not "ai_fallback")
- [ ] **`visualization.complex_file` exists and is readable**
- [ ] **`visualization.ligand_file` exists and is readable**
- [ ] **If WT available: `delta_ddg` is computed correctly** (mut - wt)

### Verify Reproducibility

Run the same input twice, should get identical results:

```python
# Run 1
result1 = await docking_agent.run(state)
affinity1 = result1["docking_results"][0]["mutant_affinity"]

# Run 2 (same input)
result2 = await docking_agent.run(state)
affinity2 = result2["docking_results"][0]["mutant_affinity"]

assert affinity1 == affinity2, "Results not reproducible"
```

- [ ] **Same SMILES + PDB = same energy (reproducible)**

---

## PHASE 8: PERFORMANCE BENCHMARKS

### Expected Performance

| Scenario | Time | Notes |
|----------|------|-------|
| 1 molecule, mutant only | 10-15 sec | Vina docking time |
| 1 molecule, mutant + WT | 20-30 sec | Dual docking |
| 10 molecules, mutant | 2-3 min | Sequential docking |
| 50 molecules, mutant | 10-15 min | Current implementation |
| Structure prep | ~5 sec | Per PDB file |

- [ ] **Docking completes in reasonable time** (4.1 min / 10 molecules typical)
- [ ] **No timeout errors** (Vina timeout set to 5 minutes)

---

## FINAL SIGN-OFF

- [ ] **All phases 1-8 completed**
- [ ] **7/7 test suite passes**
- [ ] **Real PDB test successful**
- [ ] **Pipeline integration verified**
- [ ] **Output format validated**
- [ ] **Reproducibility confirmed**
- [ ] **Performance acceptable**

### Ready for Deployment
```
Date: ________________
Verified by: ________________
Production environment: ________________
```

---

## ROLLBACK PLAN

If production issues occur:

### Quick Rollback
```bash
# Revert to old docking agent (if backup exists)
mv backend/agents/DockingAgent_DEPRECATED.py backend/agents/DockingAgent.py

# Update OrchestratorAgent.py imports back to old version
# Then restart pipeline
```

### Troubleshooting Common Issues

**Issue:** "vina: command not found"
- **Solution:** `pip install vina` (may need to restart terminal)

**Issue:** "obabel: command not found"
- **Solution:** `apt install openbabel` or `brew install open-babel`

**Issue:** "SMILES parse failed" (frequent)
- **Solution:** Check input SMILES validity (expected error, molecules skipped)

**Issue:** "Vina execution FAILED"
- **Solution:** Check binding pocket coordinates, verify PDB file integrity

**Issue:** Output missing visualization files
- **Solution:** Check temp directory permissions, disk space availability

---

## SUPPORT & DOCUMENTATION

| Document | Purpose |
|----------|---------|
| `PRODUCTION_DOCKING_GUIDE.md` | Detailed architecture & parameters |
| `test_production_docking.py` | Automated test suite |
| `DockingAgent_Production.py` | Source code with inline docs |
| `FAKE_SCIENCE_AUDIT.md` | Why old fake methods were removed |

---

**Checklist Version:** 1.0
**Last Updated:** 2024
**Status:** Ready for validation
