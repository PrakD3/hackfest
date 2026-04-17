# Backend Agent Audit Report
**Date:** April 18, 2026  
**Status:** Analysis Complete  
**Purpose:** Identify functional vs stub agents for hackathon prioritization

---

## Executive Summary

| Agent | Status | Real Implementation | Issues |
|-------|--------|-------------------|--------|
| **FetchAgent.py** | ✅ FUNCTIONAL | Yes - Real API calls | None; fully working |
| **SelectivityAgent.py** | ⚠️ HYBRID | Partial - Off-targets use hash | STUB fallback for off-target scoring |
| **SelectivityAgent_v2_strict.py** | ✅ FUNCTIONAL | Yes - Real Vina docking | REQUIRES vina + obabel; will fail loudly without them |
| **MoleculeGenerationAgent.py** | ✅ FUNCTIONAL | Yes - Real RDKit chemistry | Working with proper validation |
| **PocketDetectionAgent.py** | ✅ FUNCTIONAL | Yes - fpocket + centroid | Multiple fallbacks (working as designed) |
| **DockingAgent.py** | ⚠️ HYBRID | Partial - Hash fallback when tools missing | STUB fallback uses SHA256 hashing for fake scores |

---

## Detailed Analysis

### 1. FetchAgent.py — ✅ FULLY FUNCTIONAL

**Location:** `backend/agents/FetchAgent.py`

**Real Implementation:**
- ✅ **PubMed API:** Calls NCBI eutils with `esearch.fcgi` + `esummary.fcgi`
  - Returns: pubmed_id, title, journal, publication_date
  - Retries 3x with exponential backoff
  
- ✅ **UniProt API:** Calls `https://rest.uniprot.org/uniprotkb/search`
  - Smart query building based on gene (EGFR, BRCA1, TP53, HIV)
  - Returns: accession, protein_name, gene_names, organism, sequence
  
- ✅ **RCSB PDB API:** Posts to `https://search.rcsb.org/rcsbsearch/v2/query`
  - Returns: pdb_id, title, experimental_methods, resolution
  
- ✅ **PubChem API:** Calls pubchem autocomplete + property lookup
  - Returns: name, molecular_formula, canonical_smiles, molecular_weight

**What's Working:**
- Real HTTP requests with proper error handling
- Retry logic with 3 attempts and exponential backoff (2^attempt)
- Respects curated profiles (skips already-fetched data)
- User-Agent header set to `drug-discovery-ai/3.0 (hackathon)`
- Returns proper data structures expected by pipeline

**What Could Be Improved:**
- No caching of API results (re-fetches same queries)
- NCBI API key optional (better with env var NCBI_API_KEY)
- No rate limiting between parallel calls (could hit API limits)

**Verdict:** **PRODUCTION READY** — No fixes needed. This agent is solid.

---

### 2. SelectivityAgent.py — ⚠️ HYBRID (Partial Stub)

**Location:** `backend/agents/SelectivityAgent.py`

**Real Implementation:**
- ✅ If `dual_docking=True`: Uses real mutant vs wildtype affinity deltas
  - Computes ΔΔG from actual docking results
  - Calculates selectivity fold-change: `fold_change = 10^(affinity_delta / 1.36)`
  - Returns: affinity_delta, fold_selectivity, selective (boolean), selectivity_label

**Stub Implementation:**
- ❌ If `dual_docking=False`: Falls back to `_score_off_target()`
  - **This is a STUB using hash-based mock scores**
  - Code: `h = int(hashlib.sha256(f"{smiles}|{off_target['pdb_id']}|offtarget".encode()).hexdigest()[:8], 16)`
  - Returns: `-(5.0 + (h % 25) / 10.0)` = fake scores between -5.0 and -7.5 kcal/mol
  - These are random per molecule, not real docking results

**What's Actually Being Used:**
```python
if has_dual_docking:
    # Real scores from mutant vs WT docking
    mut_aff = mol.get("binding_energy")
    wt_aff = mol.get("wt_binding_energy")
    affinity_delta = mol.get("affinity_delta")  # Real ΔΔG
else:
    # STUB: Hash-based fallback
    target_aff = mol.get("binding_energy")  # Real mutant docking
    off_aff = await self._score_off_target(smiles, off_target)  # FAKE
    ratio = abs(target_aff) / abs(off_aff)  # Meaningless
```

**Uncertainty Handling:**
- Dual docking path: confidence = 0.8 (high)
- Off-target path: confidence = 0.5 (medium, because scores are fake)
- Uncertainty ranges: `UNCERTAINTY_RANGES = {"wildtype_comparison": 1.8, "off_target": 2.5}`

**Issues to Fix:**
1. **Off-target affinities are not real** — They're hashed, not docked
2. **Selectivity ratios are meaningless** — Comparing real score to fake score
3. **Confidence inflation** — Claims 0.5 confidence on fake data
4. **No warning** — Doesn't tell frontend that off-target results are mocked

**Verdict:** **NEEDS QUICK FIX** — Either:
- Option A: Use `SelectivityAgent_v2_strict.py` instead (real docking)
- Option B: Add flag to output: `"off_target_affinities_are_mocked": true`
- Option C: Implement real off-target docking in this agent

---

### 3. SelectivityAgent_v2_strict.py — ✅ FUNCTIONAL (if tools installed)

**Location:** `backend/agents/SelectivityAgent_v2_strict.py`

**Real Implementation:**
- ✅ Docks molecules to real off-target proteins using **AutoDock Vina**
- ✅ Converts PDB structures to PDBQT format using **Open Babel**
- ✅ Parses Vina output to extract real binding affinities
- ✅ Calculates selectivity scores (0-1 scale)
- ✅ Supports up to 5 off-targets per analysis

**Pipeline:**
```
1. Check dependencies: vina + obabel (exits loudly if missing)
2. Prepare off-target PDB structures → PDBQT
3. For each molecule:
   a. Prepare ligand SMILES → 3D PDBQT
   b. Run Vina docking to each off-target
   c. Parse Vina output → binding affinity
4. Calculate selectivity metrics:
   - selectivity_index = target_affinity - best_off_target_affinity
   - selectivity_score = normalized delta / 5.0 (capped at 1.0)
5. Return results with full confidence (0.9)
```

**What's Working:**
- Real molecular docking via Vina (±1.8 kcal/mol uncertainty)
- Proper SMILES validation + 3D conformer generation
- Error handling: Raises `RuntimeError` if tools missing (no silent fallback!)
- Logging: Logs success/failure per molecule per off-target

**What Could Fail:**
1. **Missing vina:** `shutil.which("vina")` returns None → `RuntimeError`
2. **Missing obabel:** Can't convert SDF → PDBQT → `RuntimeError`
3. **Empty off-targets list:** Returns error (no fallback)
4. **Vina timeout (120s):** Will fail on slow systems
5. **Ligand prep failures:** Raises on invalid SMILES or embedding failures

**Installation Requirements:**
```bash
# Linux/WSL
apt install autodock-vina openbabel

# macOS
brew install autodock-vina open-babel

# Windows (harder; use WSL or conda)
conda install -c bioconda autodock-vina openbabel
```

**Verdict:** **PRODUCTION READY if tools installed** — This is the CORRECT selectivity agent. Use this instead of SelectivityAgent.py for real results.

**Quick Fix Priority: CRITICAL** — Need to ensure Vina+OpenBabel are installed on deployment machine, or switch to v1 with fallback.

---

### 4. MoleculeGenerationAgent.py — ✅ FUNCTIONAL

**Location:** `backend/agents/MoleculeGenerationAgent.py`

**Real Implementation:**
- ✅ **Murcko Scaffold Variants:** Uses RDKit to extract scaffolds and add substituents
  - Generates variants by modifying scaffold atoms with free valence
  - Tries 6 substituents per atom: [C, F, Cl, OC, N, CC, O, NC(=O)C, c1ccccc1, C(F)(F)F]
  - Validates each new molecule

- ✅ **Bioisostere Replacements:** Uses SMARTS matching + ReplaceSubstructs
  - 5 bioisostere pairs defined: [CX3](=O)[OH] → S(=O)(=O)N, [OH] → [N], etc.
  - Applies to seed molecules (up to 3 seeds × 5 patterns = 15 replacements)
  
- ✅ **Validation:** Applies Lipinski rules
  - MW < 600, HBD < 5, HBA < 10, LogP < 5.5
  - Rejects molecules that violate these rules
  
- ✅ **Deduplication:** Removes duplicate SMILES
  - Returns final list up to 70 molecules

**Fallback:**
- If RDKit not available, returns seed SMILES with fallback method
- `_fallback_molecules()` returns the 5 predefined SEED_SMILES

**What's Working:**
- Real chemical transformations via RDKit (not mocked)
- Proper SMILES canonicalization
- Lipinski filtering (drug-like property constraints)
- Generation methods tracked (murcko_scaffold, bioisostere, fallback)

**Potential Issues:**
1. **Limited seed diversity:** Only 5 seed SMILES; could add more
2. **Substituent set is small:** Only 10 substituents tried
3. **No stereoisomer consideration:** All 2D SMILES
4. **No diversity constraint:** Could generate very similar molecules

**Verdict:** **FULLY FUNCTIONAL** — No fixes needed. Generation is real chemistry.

---

### 5. PocketDetectionAgent.py — ✅ FUNCTIONAL (With Fallbacks)

**Location:** `backend/agents/PocketDetectionAgent.py`

**Real Implementation:**
- ✅ **Known Sites Lookup:** Loads `data/known_active_sites.json` for fast returns
- ✅ **fpocket Detection:** If tool available, runs `fpocket` on PDB structure
  - Parses fpocket output: x/y/z barycenter + druggability score
- ✅ **Centroid Fallback:** If no fpocket, calculates geometric centroid from PDB ATOM lines
  - Reads ATOM records at fixed column positions (30:38, 38:46, 46:54)
- ✅ **Default Fallback:** Returns 20×20×20 box at origin if all else fails

**Pipeline (priority order):**
```
1. Check known_active_sites.json → return if found
2. If fpocket available:
   a. Run: fpocket -f <pdb_path>
   b. Parse output/pdb_id_info.txt for Pocket 1
   c. Extract: x/y/z_barycenter + Druggability Score
3. If pdb_content available:
   a. Parse ATOM lines (fixed columns)
   b. Calculate mean x, y, z
   c. Return centroid with 20×20×20 box
4. Default: 20×20×20 box at origin (0,0,0)
```

**What's Working:**
- Multiple fallback layers ensure never returns empty
- Known sites cache is fast (JSON lookup)
- Centroid calculation is robust and always succeeds
- Properly formatted output for Vina/Gnina

**What Could Fail:**
1. **Known sites file missing:** Silently continues to next layer (good!)
2. **fpocket not installed:** Silently skips to centroid (good!)
3. **Malformed PDB:** Centroid calculation still works (tries/except on parse)

**Verdict:** **FULLY FUNCTIONAL** — This agent is well-designed with proper fallbacks. No fixes needed.

**Note:** Fallback behavior is intentional and correct. This agent never fails; it gracefully degrades.

---

### 6. DockingAgent.py — ⚠️ HYBRID (Hash Fallback)

**Location:** `backend/agents/DockingAgent.py`

**Real Implementation:**
- ✅ Tries to use Gnina (if available): `shutil.which("gnina")`
- ✅ Falls back to Vina (if available): `shutil.which("vina")`
- ✅ Calls `_vina_dock()` which:
  1. Converts SMILES → 3D SDF via RDKit
  2. Converts SDF → PDBQT via Open Babel
  3. Runs Vina/Gnina with docking parameters
  4. Parses output for binding energy
  
- ✅ **Dual docking:** If `has_wt=True`, also docks to wildtype structure
  - Computes ΔΔG = mutant_energy - wt_energy
  - Flags: `selectivity_10fold` (< -1.36), `is_selective` (< -0.68)

**Stub Implementation:**
- ❌ If neither Vina nor Gnina available: Falls back to `_ai_score()`
  - **This is a STUB using hash-based mock scores**
  - Code: `return -(7.0 + (h % 50) / 10.0)` where h = SHA256 hash
  - Returns fake scores between -7.0 and -12.0 kcal/mol
  - **These are not real docking results**

**What's Working:**
- Real RDKit 3D coordinate generation
- Real Open Babel conversion
- Real Vina/Gnina docking when tools available
- Proper error handling (NaN checks, valence checks)
- Dual docking capability for selectivity calculation

**What's Stubbed:**
- Hash-based fallback generates fake affinities
- No warning that results are mocked (sets `"is_mock": true` but frontend may ignore)
- Confidence reduced to 0.3 for fallback (good), but still returns results

**The Hash Function:**
```python
def _ai_score(self, smiles: str, pdb_id: str, protein_name: str) -> float:
    h = int(hashlib.sha256(f"{smiles}|{pdb_id}|{protein_name}".encode()).hexdigest()[:8], 16)
    return -(7.0 + (h % 50) / 10.0)  # Range: -7.0 to -12.0
```

**Problems:**
1. **Not reproducible:** Same SMILES + PDB gives same score (actually good for testing)
2. **Physically meaningless:** Ranges are arbitrary
3. **Ranks molecules inconsistently:** 50-value spread is too large for ranking
4. **Confidence reduced but not zero:** Set to 0.3, but frontend might not check

**Verdict:** **NEEDS QUICK FIX** — Either:
- Option A: Install Vina/Gnina on deployment machine
- Option B: Add flag to frontend: Don't show results if `docking_mode == "ai_fallback"`
- Option C: Use external docking API (e.g., Smina server) as fallback
- Option D: Accept hash fallback but add big warning banner

---

## Hackathon Priority Fixes

### 🔴 CRITICAL (Fix Before Demo)

1. **DockingAgent.py hash fallback**
   - **Issue:** Hash-based fake scores if Vina not installed
   - **Impact:** All affinity predictions will be meaningless
   - **Fix:** Install Vina on deployment machine OR reject docking if tools missing
   - **Time:** 15 min (install) or 30 min (error handling)

2. **SelectivityAgent.py off-target stub**
   - **Issue:** Off-target affinities are hashed, not docked
   - **Impact:** Selectivity ratios meaningless when not using dual docking
   - **Fix:** Switch to `SelectivityAgent_v2_strict.py` OR add warning flag
   - **Time:** 5 min (switch) or 15 min (add warning)

### 🟡 HIGH (Should Fix)

3. **Ensure dependencies installed**
   - **Required for production:**
     - AutoDock Vina
     - Open Babel
     - RDKit
     - fpocket (optional but recommended)
   - **Fix:** Add startup script to validate all tools
   - **Time:** 30 min

4. **Add warnings to frontend**
   - **Issue:** Frontend doesn't know when fallbacks are in use
   - **Fix:** Add confidence flags to PipelineState:
     - `"docking_is_mock": true/false`
     - `"selectivity_is_mocked": true/false`
   - **Time:** 20 min

### 🟢 NICE TO HAVE

5. **FetchAgent caching**
   - **Issue:** Re-fetches same data on re-runs
   - **Fix:** Cache results to disk/memory
   - **Time:** 1 hour

6. **MoleculeGenerationAgent diversity**
   - **Issue:** Only 5 seed SMILES
   - **Fix:** Add more seeds from known_compounds
   - **Time:** 30 min

---

## Deployment Checklist

### Before Hackathon Demo

- [ ] Test DockingAgent with Vina installed
  ```bash
  # Check if available
  which vina
  which obabel
  
  # If missing:
  # Linux/WSL: apt install autodock-vina openbabel
  # macOS: brew install autodock-vina open-babel
  # Windows: Use WSL or conda
  ```

- [ ] Test FetchAgent with NCBI_API_KEY
  ```bash
  # Optional but recommended
  export NCBI_API_KEY=your_key_here
  ```

- [ ] Check SelectivityAgent behavior
  ```python
  # Verify which version is being used in OrchestratorAgent
  # If dual_docking available: v1 works fine
  # If no dual docking: Either use v2_strict or expect fake scores
  ```

- [ ] Validate all dependencies
  ```bash
  python -c "import rdkit; print('RDKit OK')"
  python -c "import httpx; print('httpx OK')"
  which fpocket  # Optional
  ```

- [ ] Test end-to-end with one molecule
  ```bash
  # Run test_save_flow_simple.py to verify all agents work
  python test_save_flow_simple.py
  ```

---

## Summary Table

| Agent | Status | Real Impl | Stub | Confidence | Action Required |
|-------|--------|----------|------|-----------|-----------------|
| FetchAgent | ✅ Works | ✅ 100% | ❌ 0% | High | None - Deploy as-is |
| SelectivityAgent v1 | ⚠️ Hybrid | ✅ Partial | ✅ Off-targets | Medium | Switch to v2 OR add warning |
| SelectivityAgent v2 | ✅ Works | ✅ 100% | ❌ 0% | High | Ensure Vina/obabel installed |
| MoleculeGeneration | ✅ Works | ✅ 100% | ❌ 0% | High | None - Deploy as-is |
| PocketDetection | ✅ Works | ✅ Multi-layer | ⚠️ Safe fallback | High | None - Good design |
| DockingAgent | ⚠️ Hybrid | ✅ Partial | ✅ Hash fallback | Medium | Install Vina OR handle gracefully |

---

## Recommended Actions

### Immediate (Next 1 hour)

1. Install AutoDock Vina and Open Babel on backend machine
2. Add startup validation script to check all dependencies
3. Update DockingAgent to reject runs if Vina missing (instead of using hash fallback)
4. Update SelectivityAgent output to include `"affinity_is_real": bool` flag

### Before Demo (Next 2 hours)

5. Add confidence badges to frontend showing which results are real vs estimated
6. Add disclaimers when mock/estimated data is displayed
7. Test full pipeline with real docking (end-to-end test)

### Nice to Have

8. Improve MoleculeGenerationAgent seed diversity
9. Add FetchAgent caching to reduce API calls
10. Optimize fpocket detection (parallel runs on multiple PDBs)

---

**Report Generated:** April 18, 2026  
**Analyst:** Claude (GitHub Copilot)  
**Next Review:** After hackathon deployment
