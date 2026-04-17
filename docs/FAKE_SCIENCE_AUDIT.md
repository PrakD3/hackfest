# COMPLETE AUDIT: FAKE SCIENCE IN HACKFEST PIPELINE

## AGENTS WITH CONFIRMED FAKE LOGIC

### 1. ✗ DockingAgent.py — Hash-Based Binding Energy
**Location:** Lines 207-209
**Code:**
```python
def _ai_score(self, smiles: str) -> float:
    h = hash(smiles)
    return -8.5 + ((h % 20) - 10) / 5.0  # Range: -10.5 to -6.5 kcal/mol
```

**Entry Points:**
- Line 96: `except Exception: return self._ai_score(smiles)`
- Line 144: `if mode == "ai_fallback": results = [...self._ai_score(...)...]`
- Line 171: `except Exception: return self._ai_score(...)`
- Line 199: "Fallback to hash-based scoring"
- Lines 52, 56, 117: Config variable `ai_fallback` enables mode

**Severity:** CRITICAL
- Silent fallback; consumers don't know docking failed
- Returns chemically meaningless scores as if from Vina
- Config `ai_fallback: true` enables entirely fake results

**Fixed By:** `DockingAgent_v4_strict.py`

---

### 2. ✗ SelectivityAgent.py — Hash-Based Off-Target Scoring
**Location:** Lines 169-173
**Code:**
```python
async def _score_off_target(self, smiles: str, off_target: dict) -> float:
    h = int(
        hashlib.sha256(f"{smiles}|{off_target['pdb_id']}|offtarget".encode()).hexdigest()[:8],
        16,
    )
    return -(5.0 + (h % 25) / 10.0)  # Range: -7.5 to -5.0 kcal/mol
```

**Integration:** Used to assess selectivity (off-target binding affinity)
**Severity:** CRITICAL
- Off-target scores are FAKE
- Used to evaluate drug selectivity profile
- Results misleading for safety assessment

**Status:** NEEDS FIX

---

## AGENTS WITH BENIGN FALLBACKS

### ✓ MoleculeGenerationAgent.py — `_fallback_molecules()`
**Type:** Data fallback (not computed)
**Status:** BENIGN — Returns hardcoded SMILES list, clearly marked as fallback

### ✓ PocketDetectionAgent.py — `_centroid_fallback()`
**Type:** Geometric fallback
**Status:** BENIGN — Computes protein centroid (simple math, no hash), transparent

### ✓ StructurePrepAgent.py — ESMFold fallback
**Type:** Structure prediction alternative
**Status:** BENIGN — Uses real ESMFold model, just different method

### ✓ ResistanceAgent.py — No fallbacks
**Status:** CLEAN — Reads from curated JSON, no fake scoring

### ✓ SynergyAgent.py — No fallbacks
**Status:** CLEAN — Reads from known pairs data + LLM, no fake scoring

### ✓ LeadOptimizationAgent.py — No fallbacks
**Status:** CLEAN — Optimization logic, no fake scoring

---

## SUMMARY TABLE

| Agent | Fake Logic | Type | Severity | Fixed? |
|-------|-----------|------|----------|--------|
| DockingAgent | `_ai_score()` hash | Binding energy | CRITICAL | ✓ |
| SelectivityAgent | `_score_off_target()` hash | Off-target energy | CRITICAL | ✗ |
| MoleculeGenerationAgent | `_fallback_molecules()` | Data list | Benign | N/A |
| PocketDetectionAgent | `_centroid_fallback()` | Geometry | Benign | N/A |
| StructurePrepAgent | ESMFold | Model | Benign | N/A |
| ResistanceAgent | None | — | Clean | N/A |
| SynergyAgent | None | — | Clean | N/A |
| LeadOptimizationAgent | None | — | Clean | N/A |

---

## ROOT CAUSE ANALYSIS

### Why Hash-Based Fallbacks Exist
1. **Lazy fallback strategy** — Avoid dependency checks
2. **Undefined behavior** — What happens if Vina/real computation fails?
3. **Silent propagation** — Easier than raising errors
4. **False confidence** — Numbers look plausible

### Why This Violates Scientific Integrity
- **Falsifies experimental results** — Hash ≠ molecular mechanics
- **Breaks reproducibility** — Same SMILES always gets same hash
- **Hides failures** — Consumers can't tell real vs. fake
- **Misleads downstream analysis** — Other agents receive garbage-in data

---

## REMEDIATION PLAN

### Phase 1: Immediate (Critical)
- [x] **DockingAgent**: Replace with `DockingAgent_v4_strict.py`
  - No fallbacks
  - Strict dependency check
  - Fail loudly if Vina unavailable

- [ ] **SelectivityAgent**: Create `SelectivityAgent_v2_strict.py`
  - Remove `_score_off_target()` hash-based fake scoring
  - Use real docking to off-target proteins (same as DockingAgent)
  - Or fail if docking unavailable

### Phase 2: Integration
- [ ] Update `OrchestratorAgent.py`:
  - Import DockingAgent_v4_strict (not DockingAgent)
  - Import SelectivityAgent_v2_strict
  
- [ ] Update dependencies check in `main.py`:
  - Verify vina, obabel are in PATH before pipeline starts
  - Print clear error message with installation instructions

### Phase 3: Testing
- [ ] Test: Run pipeline with Vina installed → expect real results
- [ ] Test: Run pipeline with Vina missing → expect early failure (not silent fake results)
- [ ] Verify: `"real_docking": True` flag in output

---

## DETECTION QUERIES USED

```bash
# Pattern 1: Hash-based scoring
grep -rn "_ai_score\|_score_.*hash\|hash.*%\|hashlib" backend/agents/

# Pattern 2: Silent fallback
grep -rn "except.*:.*return\|except Exception" backend/agents/

# Pattern 3: Config-based fake mode
grep -rn "fallback.*True\|ai_fallback\|simulate\|mock" backend/agents/
```

---

## FILES TO UPDATE

| File | Action | Status |
|------|--------|--------|
| DockingAgent_v4_strict.py | Created | ✓ |
| SelectivityAgent_v2_strict.py | NEEDED | — |
| OrchestratorAgent.py | Update imports | — |
| main.py | Add dependency check | — |
| DOCKING_REFACTOR_LOG.md | Created | ✓ |

---

## REFERENCES

- [Vina Validation Study](https://academic.oup.com/nar/article/49/W1/W465/6287488)
- [AutoDock Vina Paper](http://vina.scripps.edu/) (Trott & Olson 2010)
- [Scientific Reproducibility Issues](https://www.nature.com/articles/s41562-016-0021)
