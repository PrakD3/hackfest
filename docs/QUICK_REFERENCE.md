# QUICK REFERENCE CARD - PRODUCTION DOCKING SYSTEM

## 🚀 QUICK START (5 minutes)

```bash
# 1. Install dependencies
pip install rdkit vina
apt install openbabel

# 2. Copy files
cp DockingAgent_Production.py backend/agents/
cp SelectivityAgent_v2_strict.py backend/agents/

# 3. Update imports in OrchestratorAgent.py
# Change: from agents.DockingAgent import DockingAgent
# To:     from agents.DockingAgent_Production import DockingAgent

# 4. Test
python test_production_docking.py

# 5. Run
python -m backend.main --run_docking true
```

---

## 📊 INPUT REQUIREMENTS

```python
state = {
    "pdb_content": "<PDB file>",              # REQUIRED
    "wt_pdb_content": "<PDB file>",           # OPTIONAL (for ΔΔG)
    "generated_molecules": [
        {"smiles": "CCO", "compound_name": "mol1"},
    ],
    "binding_pocket": {                       # REQUIRED
        "center_x": 10.5,
        "center_y": -5.2,
        "center_z": 8.3,
        "size_x": 20,
        "size_y": 20,
        "size_z": 20,
    },
    "structures": [{"pdb_id": "1A2B"}],
}
```

---

## 📈 OUTPUT STRUCTURE

```python
{
    "real_docking": True,                    # ← Verify this!
    "docking_results": [
        {
            "smiles": "CCO",
            "mutant_affinity": -8.2,         # ← REAL VALUE (Vina)
            "mutant_affinity_formatted": "-8.2 ± 1.8 kcal/mol (Vina)",
            "wt_affinity": -5.1,             # ← If WT provided
            "delta_ddg": -3.1,               # ← ΔG_mut - ΔG_WT
            "is_real": True,                 # ← Verify this!
            "visualization": {
                "complex_file": "complex.pdb",
                "ligand_file": "ligand.sdf",
                "protein_file": "receptor.pdbqt",
            }
        },
        # ... more molecules
    ]
}
```

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

```python
# 1. Real docking
assert result["real_docking"] == True

# 2. Valid affinity range
for mol in result["docking_results"]:
    assert -20 < mol["mutant_affinity"] < 0
    assert mol["is_real"] == True

# 3. Visualization files exist
import os
for mol in result["docking_results"]:
    assert os.path.exists(mol["visualization"]["complex_file"])

# 4. WT comparison (if provided)
if result.get("has_wt_comparison"):
    for mol in result["docking_results"]:
        assert "delta_ddg" in mol
```

---

## 🔧 DEPENDENCIES

| Tool | Command | Version |
|------|---------|---------|
| Vina | `pip install vina` | Latest |
| Open Babel | `apt install openbabel` | Latest |
| RDKit | `pip install rdkit` | Latest |

Verify:
```bash
vina --version
obabel -V
python -c "from rdkit import Chem; print('OK')"
```

---

## ⚠️ COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| `vina: command not found` | Not installed | `pip install vina` |
| `obabel: command not found` | Not installed | `apt install openbabel` |
| `SMILES parse failed` | Invalid SMILES | Check input syntax (expected, skipped) |
| `No atoms remained...` | Empty/water-only PDB | Verify PDB file |
| `Cannot parse Vina output` | Vina crashed | Check binding pocket coords |
| `NaN coordinates` | 3D gen failed | Check SMILES validity |

---

## 📋 CORE CLASSES

### ProteinPreparer
- Cleans PDB (removes water, heteroatoms)
- Adds hydrogens
- Converts to PDBQT

```python
preparer = ProteinPreparer()
pdbqt = await preparer.prepare(pdb_content, "1A2B", "/tmp")
```

### LigandPreparer
- Validates SMILES
- Generates 3D structure
- Exports to PDBQT, PDB, SDF

```python
ligand_prep = LigandPreparer()
ligand = await ligand_prep.prepare("CCO", "/tmp")
# Returns: {"pdbqt_path": "...", "pdb_path": "...", "sdf_path": "..."}
```

### VinaExecutor
- Runs AutoDock Vina
- Parses binding affinity

```python
vina = VinaExecutor()
result = await vina.dock(receptor_pdbqt, ligand_pdbqt, pocket, "/tmp")
# Returns: {"binding_affinity": -8.2, "output_pdbqt": "..."}
```

### DockingAgentProduction
- Orchestrates pipeline
- Manages dual docking
- Generates visualization files

```python
agent = DockingAgentProduction()
result = await agent.run(state)
```

---

## 🧪 TESTING

```bash
# Full test suite (7 tests)
python test_production_docking.py

# Expected: 7/7 pass
# Result: ✓ ALL TESTS PASSED - System ready for deployment
```

---

## 🎯 KEY GUARANTEES

✓ Real docking (AutoDock Vina, not fake)
✓ Proper preparation (protein, ligand, both validated)
✓ Reproducible (same input = same output)
✓ Dual comparison (mutant + WT, ΔΔG)
✓ Visualization (PDB/SDF files)
✓ Transparent (real_docking=True flag)
✓ Validated (coordinate checks at every step)
✓ Loud errors (fail fast, clear messages)

---

## 📚 DOCUMENTATION

| File | Purpose |
|------|---------|
| `DockingAgent_Production.py` | Source code |
| `PRODUCTION_DOCKING_GUIDE.md` | Architecture & parameters |
| `IMPLEMENTATION_CHECKLIST.md` | 8-phase deployment guide |
| `COMPLETE_IMPLEMENTATION_SUMMARY.md` | Full overview |
| `test_production_docking.py` | Test suite |

---

## 🔄 INTEGRATION

### In OrchestratorAgent.py:
```python
# OLD (remove):
from agents.DockingAgent import DockingAgent
from agents.SelectivityAgent import SelectivityAgent

# NEW (add):
from agents.DockingAgent_Production import DockingAgent
from agents.SelectivityAgent_v2_strict import SelectivityAgent
```

Then use as normal:
```python
docking_agent = DockingAgent()
result = await docking_agent.run(state)
```

---

## 📊 PERFORMANCE

- **Per molecule:** 10-30 seconds
- **10 molecules:** 2-3 minutes
- **50 molecules:** 10-15 minutes
- **Dual docking:** ~2x time

---

## 🎓 WHAT CHANGED

### Before (Fake ✗)
```python
hash(smiles) % 20  # ← Returns fake score, looks plausible
```

### After (Real ✓)
```python
vina.dock(...)     # ← Returns real Vina score, physically valid
```

**Result:** Science is valid again! ✓

---

## 🆘 SUPPORT

**Questions?** Check these in order:
1. `COMPLETE_IMPLEMENTATION_SUMMARY.md` (what & why)
2. `PRODUCTION_DOCKING_GUIDE.md` (how & parameters)
3. `IMPLEMENTATION_CHECKLIST.md` (step-by-step)
4. `DockingAgent_Production.py` (source code + comments)

---

**Version:** Quick Reference v1.0
**For:** Developers deploying production docking
**Status:** Ready to use
