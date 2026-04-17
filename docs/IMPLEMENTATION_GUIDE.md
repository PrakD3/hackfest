# IMPLEMENTATION GUIDE: REMOVING FAKE SCIENCE FROM HACKFEST

## EXECUTIVE SUMMARY

The pipeline contained **hash-based fake scoring** in two critical agents:
1. **DockingAgent** — Fake binding energies via hash function
2. **SelectivityAgent** — Fake off-target affinities via hash function

Both have been **replaced with real molecular docking** using AutoDock Vina.

---

## WHAT WAS WRONG

### Before: Silent Fake Results
```python
# DockingAgent.py
def _ai_score(self, smiles: str) -> float:
    h = hash(smiles)
    return -8.5 + ((h % 20) - 10) / 5.0  # ← FAKE!

async def _dock_molecule(self, smiles, ...):
    try:
        return await self._vina_dock(...)
    except:
        return self._ai_score(smiles)  # ← Silent fallback to FAKE
```

**Problem:** Code returns plausible-looking numbers when Vina failed. Consumers have no way to know the result is fake.

---

## WHAT'S NEW

### After: Real Docking or Explicit Failure
```python
# DockingAgent_v4_strict.py
def _check_dependencies(self, log):
    """FAIL IMMEDIATELY if Vina or Open Babel missing"""
    if shutil.which("vina") is None:
        raise RuntimeError("REAL DOCKING UNAVAILABLE\nInstall: pip install vina")

async def _dock_molecule(self, smiles, ...):
    # Run Vina, parse output, or RAISE ERROR
    # NO FALLBACK TO FAKE SCORES
```

**Guarantee:** Either you get real Vina results, or the pipeline fails with a clear error message.

---

## INSTALLATION REQUIREMENTS

### Step 1: Install AutoDock Vina
```bash
# macOS
brew install open-babel
pip install vina

# Linux (Ubuntu/Debian)
sudo apt install openbabel
pip install vina

# Conda
conda install -c conda-forge openbabel vina
```

### Step 2: Verify Installation
```bash
vina --version
obabel -V
```

You should see version information, not "command not found".

### Step 3: Install RDKit (if needed)
```bash
pip install rdkit
```

---

## MIGRATION: OLD → NEW CODE

### Option 1: Replace Imports (Recommended)

**File:** `backend/agents/OrchestratorAgent.py` (or wherever these agents are imported)

```python
# OLD:
from agents.DockingAgent import DockingAgent
from agents.SelectivityAgent import SelectivityAgent

# NEW:
from agents.DockingAgent_v4_strict import DockingAgent
from agents.SelectivityAgent_v2_strict import SelectivityAgent
```

Then delete the old files if they're no longer needed.

### Option 2: Overwrite Old Files (Destructive)

```bash
cp backend/agents/DockingAgent_v4_strict.py backend/agents/DockingAgent.py
cp backend/agents/SelectivityAgent_v2_strict.py backend/agents/SelectivityAgent.py
```

**Warning:** This deletes the old fake-science versions permanently.

---

## TESTING THE CHANGES

### Test 1: Verify Dependencies Are Checked
```bash
# Temporarily uninstall vina
pip uninstall vina -y

# Run pipeline (or just DockingAgent)
python -m backend.main
```

**Expected:** Error message like:
```
REAL DOCKING UNAVAILABLE

Missing required tools:
  • vina (AutoDock Vina (required for docking))

Install with:
  pip install vina
```

**NOT:** Silent fake results.

### Test 2: Verify Real Docking Works
```bash
# Reinstall vina
pip install vina

# Run pipeline with sample PDB and SMILES
python -m backend.main --pdb 1A2B --smiles "CCO"
```

**Expected output includes:**
```json
{
  "docking_results": [
    {
      "smiles": "CCO",
      "mutant_affinity": -9.4,
      "mutant_affinity_formatted": "-9.4 ± 1.8 kcal/mol (Vina)",
      "real_docking": true
    }
  ]
}
```

**Look for:** `"real_docking": true` flag confirming real execution.

### Test 3: Verify Selectivity Docking
```bash
# Run with off-target assessment enabled
python -m backend.main --pdb 1A2B --run_selectivity true
```

**Expected output includes:**
```json
{
  "selectivity_results": [
    {
      "smiles": "CCO",
      "selectivity_method": "Real AutoDock Vina (off-target docking)",
      "real_selectivity_data": true
    }
  ]
}
```

---

## KEY BEHAVIORAL CHANGES

### Change 1: Removed Configuration Parameter
```python
# OLD (wrong):
plan = {
    "run_docking": True,
    "ai_fallback": True  # Enable fake scoring mode
}

# NEW (only option):
plan = {
    "run_docking": True
    # (ai_fallback parameter ignored/removed)
}
```

### Change 2: Different Return Values
```python
# OLD:
{
    "docking_results": [...],
    "docking_mode": "ai_fallback",  # May be fake!
    "is_mock": true,  # This flag could be anywhere
}

# NEW:
{
    "docking_results": [...],
    "docking_mode": "vina",
    "real_docking": true,  # Always present, verifiable
}
```

### Change 3: Error Handling
```python
# OLD: Returns empty/incomplete results silently
return {"docking_results": []}  # Hides failure

# NEW: Raises clear error
raise RuntimeError(
    "REAL DOCKING UNAVAILABLE\n"
    "Missing: vina (AutoDock Vina (required for docking))\n"
    "Install with: pip install vina"
)
```

---

## UNCERTAINTY VALUES

Both agents now report real uncertainty from Vina validation literature:

```
Binding energy: ±1.8 kcal/mol

This comes from:
  [1] Trott & Olson (2010) AutoDock Vina: improving the speed and accuracy 
      of docking with a new scoring function, efficient optimization, and multithreading.
      Journal of Computational Chemistry.
  
  [2] Validation studies in: NAR, 49(W1):W465-W469 (2021)
      "AutoDock Vina 1.2.0 releases"
```

Selectivity index also reports ±1.8 kcal/mol (propagated uncertainty):
```
Selectivity Index = ΔG_target - ΔG_off-target ± ~2.5 kcal/mol
                   (Vina uncertainty on both compounded)
```

---

## TROUBLESHOOTING

### Issue: "vina --version" returns "command not found"

**Solution:** Vina not in PATH. Install via pip:
```bash
pip install vina
```

Then verify:
```bash
which vina
python -c "import vina; print(vina.__file__)"
```

### Issue: "open-babel not found" after installing obabel

**Solution:** System package installed but Open Babel Python bindings missing. Try:
```bash
pip install openbabel
# OR for conda:
conda install -c conda-forge openbabel
```

### Issue: Docking produces NaN or -inf values

**Solution:** Likely input problem (invalid SMILES, bad coordinates). New code rejects:
- Non-sanitizable SMILES
- NaN coordinates from RDKit
- Vina affinities outside [-20, 0] kcal/mol range

Check logs for REJECTED messages.

### Issue: "No binding pocket available"

**Solution:** Pocket detection must succeed before docking. Ensure:
- PDB file is valid
- fpocket or known sites database is available
- Or pocket coordinates provided in state

---

## FILES CHANGED

### New Files (Strict Implementations)
- `backend/agents/DockingAgent_v4_strict.py` — Real Vina docking, no fallbacks
- `backend/agents/SelectivityAgent_v2_strict.py` — Real off-target docking, no fallbacks
- `DOCKING_REFACTOR_LOG.md` — Detailed changelog
- `FAKE_SCIENCE_AUDIT.md` — Complete audit of fake logic
- `IMPLEMENTATION_GUIDE.md` — This file

### Files to Update (Integration)
- `backend/agents/OrchestratorAgent.py` — Update imports
- `backend/main.py` — Add dependency check at startup
- (Optional) Delete `DockingAgent.py`, `SelectivityAgent.py` old versions

### No Changes Needed
- `ResistanceAgent.py` — Clean (no fake logic)
- `SynergyAgent.py` — Clean (no fake logic)
- `LeadOptimizationAgent.py` — Clean (no fake logic)
- Other agents — Clean or benign fallbacks

---

## NEXT STEPS

1. **Immediately:** Update imports in OrchestratorAgent.py
2. **Test:** Run with and without Vina to verify error handling
3. **Document:** Update API docs to reflect real uncertainty values
4. **Monitor:** Check logs for "real_docking", "real_selectivity_data" flags
5. **Deploy:** Use new agents in production

---

## VALIDATION CHECKLIST

- [ ] `vina --version` and `obabel -V` both work
- [ ] OrchestratorAgent imports `DockingAgent_v4_strict`
- [ ] OrchestratorAgent imports `SelectivityAgent_v2_strict`
- [ ] Run pipeline with sample input
- [ ] Output contains `"real_docking": true`
- [ ] Selectivity output contains `"real_selectivity_data": true`
- [ ] Uninstall Vina, run pipeline, verify error (not fake results)
- [ ] Reinstall Vina, verify docking works again

---

## REFERENCE DOCUMENTS

- `DOCKING_REFACTOR_LOG.md` — What was removed and why
- `FAKE_SCIENCE_AUDIT.md` — Complete audit table
- `DockingAgent_v4_strict.py` — Source code (annotated)
- `SelectivityAgent_v2_strict.py` — Source code (annotated)

---

## SCIENTIFIC INTEGRITY

This refactor ensures the pipeline:

✓ Uses real molecular mechanics (Vina)
✓ Reports true uncertainty from literature
✓ Fails loudly if computation unavailable
✓ Never silently returns fake results
✓ Maintains reproducibility (same input → same output from Vina, not hash)
✓ Enables scientific peer review and reproducibility

---

**Version:** v1 (2024)
**Status:** Ready for implementation
**Maintainer:** See DOCKING_REFACTOR_LOG.md
