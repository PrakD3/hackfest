# DockingAgent Refactor: REMOVED ALL FAKE SCIENCE

## Status
**DockingAgent_v4_strict.py** — New implementation with ZERO fallbacks, ZERO fake logic.

---

## ROOT CAUSES IDENTIFIED

### 1. `_ai_score()` — Fake Binding Energy Generator
**What it was:** Hash-based scoring that looked like:
```python
def _ai_score(self, smiles: str) -> float:
    return -8.5 + (hash(smiles) % 10) * 0.4  # Fake score ± 4 kcal/mol
```
**Why it was there:** To provide results even when Vina was unavailable.
**Why this is wrong:**
- Chemically meaningless
- No basis in molecular mechanics
- Violates the entire purpose of molecular docking
- Falsifies computational chemistry results

### 2. Silent Fallback Chains
**Flow in original code:**
```
_dock_molecule()
  ├─ Try: Run Vina → parse energy
  ├─ Fail: Return _ai_score()  [SILENT]
      └─ Caller gets fake data (thinks it's real Vina)

_dock_to_structure()
  ├─ Try: Prepare coords and run _dock_molecule()
  ├─ Fail: Return _ai_score()  [SILENT]

ai_fallback mode
  ├─ Try: Real docking
  ├─ Fail: Use _ai_score() exclusively [CONFIG HIDES THIS]
```

**Problem:** Code returns plausible-looking scores when docking actually failed.

### 3. Missing Dependency Validation
**Original:** No explicit check; Vina failure would trigger `_ai_score()`
**New:** Explicit validation at startup:
```python
def _check_dependencies(self):
    missing = []
    for tool, description in self.REQUIRED_TOOLS.items():
        if shutil.which(tool) is None:
            missing.append(f"{tool} ({description})")
    
    if missing:
        raise RuntimeError("CANNOT PROCEED WITH REAL DOCKING")
```

---

## WHAT V4_STRICT GUARANTEES

### ✓ Real Molecular Docking ONLY
- Uses **real AutoDock Vina** executables
- Must find both `vina` and `obabel` in PATH
- Fails loudly and immediately if missing

### ✓ True Uncertainty Quantification
- Reports ±1.8 kcal/mol (from Vina validation literature)
- NOT fictitious uncertainty ranges
- Clearly labels: "AutoDock Vina (real execution)"

### ✓ No Fallbacks
- If Vina fails → FAIL, don't hide with fake score
- If dependency missing → FAIL with helpful error
- If SMILES invalid → FAIL, don't dock it
- If coordinates NaN → FAIL, don't submit to Vina

### ✓ Strictness Levels
1. **SMILES validation** — RDKit sanitization
2. **Coordinate validation** — Check for NaN values
3. **File existence checks** — PDB, PDBQT, output files
4. **Process exit codes** — Detect subprocess failures
5. **Vina output parsing** — Only accept valid energy values in [-20, 0]

### ✓ Transparent Logging
```
✗ Missing tools: vina, obabel
✓ Found vina: /usr/bin/vina
✓ Found obabel: /usr/local/bin/obabel
✓ Receptor PDBQT: /tmp/mutant_receptor.pdbqt
✓ mutant docking: SMILES → -9.4 kcal/mol
✓ wildtype docking: SMILES → -8.7 kcal/mol
```

---

## BREAKING CHANGES

### Parameter: Removed `ai_fallback`
```python
# OLD (wrong):
plan = {"run_docking": True, "ai_fallback": True}  # Enables fake mode

# NEW (correct):
plan = {"run_docking": True}  # Real docking or fail
```

### Return value: Added `real_docking` flag
```python
return {
    "docking_results": [...],
    "docking_mode": "vina",
    "real_docking": True,  # ← NEW: Consumers can verify
    "has_wt_comparison": True,
}
```

### Error behavior: Changed from Silent to Loud
```python
# OLD: Returns {'docking_results': []} (hidden failure)
# NEW: Raises RuntimeError("REAL DOCKING UNAVAILABLE\n...")
```

---

## VERIFICATION CHECKLIST

- [ ] `vina --version` works (in PATH)
- [ ] `obabel --version` works (in PATH)
- [ ] RDKit installed: `python -c "from rdkit import Chem; print('OK')"`
- [ ] Test: Run DockingAgent on sample SMILES + PDB
- [ ] Verify: Output contains `"real_docking": True`
- [ ] Verify: Affinity values are negative and in [-20, 0] range
- [ ] Verify: If Vina missing, error raised immediately (not silent)

---

## NEXT: Audit Other Agents

Similar patterns detected in:
- **ResistanceAgent**: May have `_estimate_resistance()` fallback
- **SelectivityAgent**: May have `_estimate_selectivity()` fallback
- **SynergyAgent**: May have `_estimate_synergy()` fallback
- **LeadOptimizationAgent**: May have `_estimate_potency()` fallback

**Action:** Search and apply same refactor logic.

---

## REFERENCE: Real Vina Installation

### macOS
```bash
brew install open-babel
pip install vina
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install openbabel
pip install vina
```

### Linux (Conda)
```bash
conda install -c conda-forge openbabel
pip install vina
```

### Verify Installation
```bash
vina --version
obabel -V
```

---

## Files Modified

| File | Change |
|------|--------|
| `DockingAgent_v4_strict.py` | New production implementation |
| `DockingAgent.py` | **DEPRECATED** (original with fallbacks) |

**To activate:** Update import in `OrchestratorAgent.py` or pipeline config.

---

## References

- [AutoDock Vina Publication](http://vina.scripps.edu/) (Trott & Olson 2010)
- [Vina Validation Studies](https://academic.oup.com/nar/article/49/W1/W465/6287488): ±1.8 kcal/mol
- [Open Babel Docs](http://openbabel.org/)
- [RDKit 3D Generation](https://www.rdkit.org/docs/source/rdkit.Chem.AllChem.html#rdkit.Chem.AllChem.EmbedMolecule)
