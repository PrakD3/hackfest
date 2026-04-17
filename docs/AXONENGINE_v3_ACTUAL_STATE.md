# AXONENGINE v3.0 — ACTUAL TECHNICAL STATE (April 17, 2026)

## CRITICAL DISCLAIMER

This is the **ACTUAL implementation status**, not the v4 spec document. The AXONENGINE_v4_Master_System_Prompt.md describes a PLANNED v4 system. This document describes what is REALLY in the code TODAY.

---

## 1. CURRENT IMPLEMENTATION STATUS

### AGENT IMPLEMENTATION MATRIX

| Agent | Status | File | What It Does | What's Missing |
|-------|--------|------|--------------|-----------------|
| **MutationParserAgent** | ✅ Implemented | `agents/MutationParserAgent.py` | Parses input "EGFR T790M" into structured state | None visible |
| **PlannerAgent** | ✅ Implemented | `agents/PlannerAgent.py` | Creates `AnalysisPlan` object with boolean flags for which agents to skip | Dynamic mode selection not sophisticated |
| **FetchAgent** | ✅ Implemented | `agents/FetchAgent.py` | Parallel fetch from PubMed, UniProt, RCSB, PubChem using httpx | Can timeout; fallback to curated data if available |
| **StructurePrepAgent** | ✅ Partially Working | `agents/StructurePrepAgent.py` | Downloads PDB files from RCSB; attempts ESMFold API as fallback | No pLDDT extraction (V4 feature missing); simple retry logic |
| **PocketDetectionAgent** | ✅ Implemented | `agents/PocketDetectionAgent.py` | Uses fpocket (external binary) OR known_active_sites.json lookup OR centroid fallback | No pocket delta analysis (V4 feature); hardcoded fallback values |
| **MoleculeGenerationAgent** | ✅ Implemented | `agents/MoleculeGenerationAgent.py` | Murcko scaffold variants + bioisosteric swaps via RDKit; fallback to seed SMILES | Pocket2Mol (V4) not implemented; no 3D conditioning |
| **DockingAgent** | ⚠️ Partially Working | `agents/DockingAgent.py` | Attempts Vina/Gnina docking; falls back to AI hash-based scoring | Gnina not typically installed; hash scoring is NOT real docking (random energies) |
| **SelectivityAgent** | ✅ Implemented | `agents/SelectivityAgent.py` | Dual-docks top 5 molecules vs gene-specific off-target protein | Hardcoded off-target PDB IDs; selectivity ratio calculation is simplistic |
| **ADMETAgent** | ✅ Implemented | `agents/ADMETAgent.py` | Lipinski filter + PAINS check + SwissADME properties; toxicophore highlighting | DeepChem ADMET models not loaded; only RDKit descriptors |
| **LeadOptimizationAgent** | ✅ Implemented | `agents/LeadOptimizationAgent.py` | Random SMARTS mutations + re-docking | Mutation logic is basic; no formal chemical optimization |
| **ResistanceAgent** | ✅ Implemented | `agents/ResistanceAgent.py` | Scans known resistance mutations from `mutation_resistance.json` | No ESM-1v scoring (V4); purely lookup-based |
| **SimilaritySearchAgent** | ✅ Implemented | `agents/SimilaritySearchAgent.py` | Morgan fingerprint similarity vs known inhibitors | Basic Tanimoto distance; no clustering |
| **SynergyAgent** | ✅ Implemented | `agents/SynergyAgent.py` | Placeholder agent; returns empty results | **NOT ACTUALLY FUNCTIONAL** |
| **ClinicalTrialAgent** | ✅ Implemented | `agents/ClinicalTrialAgent.py` | Queries ClinicalTrials.gov API for trials matching mutation | May fail if API is down |
| **KnowledgeGraphAgent** | ✅ Implemented | `agents/KnowledgeGraphAgent.py` | Builds knowledge graph JSON from literature + proteins | Uses LLM for NER; slow, optional |
| **ExplainabilityAgent** | ✅ Implemented | `agents/ExplainabilityAgent.py` | Generates 10-section reasoning trace + LLM summary | No confidence propagation (V4); uses generic LLM narrative |
| **ReportAgent** | ✅ Implemented | `agents/ReportAgent.py` | Assembles final ranked report with molecule images | Image rendering via reportlab; slow |
| **OrchestratorAgent** | ✅ Implemented | `agents/OrchestratorAgent.py` | Runs 17-agent pipeline sequentially via imports; SSE event stream | No LangGraph used (despite code comment); manual orchestration |

### V4 PLANNED AGENTS (NOT IMPLEMENTED)

| Agent | Status | Why Missing | Impact |
|-------|--------|-------------|--------|
| **VariantEffectAgent** | ❌ Not started | ESM-1v not trained; requires torch | No pathogenicity scoring for novel mutations |
| **GNNAffinityAgent** | ❌ Not started | DimeNet++ requires torch-geometric | No ML-based affinity ranking; using docking scores only |
| **MDValidationAgent** | ❌ Not started | OpenMM/MD is complex; requires GPU | No stability validation; docking poses unvalidated |
| **SynthesisAgent** | ❌ Not started | ASKCOS API integration not attempted | No retrosynthesis routes provided |

---

## 2. PIPELINE EXECUTION FLOW (ACTUAL)

### ENTRY POINT
```
POST /api/analyze { query, mode }
  └─> OrchestratorAgent.run_pipeline(query, session_id, mode)
      └─> _import_agent(agent_name) × 17
          └─> agent.run(state) sequentially
```

### STEP-BY-STEP ACTUAL FLOW

```
Step 1: INPUT → MutationParserAgent
Input:  "EGFR T790M"
Code:   Parse gene/position/aa from regex or curated_profiles lookup
Output: state["mutation_context"] = { gene, position, wildtype_aa, mutant_aa }
Time:   ~50ms
Status: ✅ Working

Step 2: PLAN → PlannerAgent
Input:  state["mutation_context"] + state["curated_profile"] (optional)
Code:   Create AnalysisPlan object with boolean flags
Output: state["analysis_plan"] = AnalysisPlan(...)
Time:   ~10ms
Status: ✅ Working

Step 3: DATA FETCH → FetchAgent (PARALLEL × 4 START)
Input:  query + gene name
Code:   asyncio.gather([
           _fetch_pubmed(query),
           _fetch_uniprot(gene),
           _fetch_rcsb(query),
           _fetch_pubchem(gene)
         ])
Output: state["literature"], state["proteins"], state["structures"], state["known_compounds"]
Time:   ~15 seconds (PubMed timeout)
Status: ⚠️ OFTEN FAILS on PubMed API timeouts or network issues
Fallback: Uses curated_profiles.json if available (stored locally)

Step 4: STRUCTURE PREP → StructurePrepAgent
Input:  state["structures"] (list of {pdb_id, ...})
Code:   
  a) Try download from RCSB: https://files.rcsb.org/download/{pdb_id}.pdb
  b) If no file OR mode=="lite": Call ESMFold API
     https://api.esmatlas.com/foldSequence/v1/pdb/ with sequence
  c) Cache locally to /tmp/dda_structures/{session_id}/
Output: state["pdb_content"] (PDB text), state["structures"][pdb_path]
Time:   ~2 sec (RCSB download) OR ~10 sec (ESMFold API)
Status: ✅ Working
Missing: NO pLDDT extraction; NO confidence gating (V4 features)

Step 5: POCKET DETECTION → PocketDetectionAgent  
Input:  state["pdb_content"], state["structures"]
Code:   
  a) Check known_active_sites.json for pdb_id match
  b) If not found → try fpocket (external binary):
     subprocess.run(["fpocket", "-f", pdb_path])
  c) If fpocket unavailable → centroid_fallback (extract alpha carbons, avg coords)
Output: state["binding_pocket"] = {
          center_x, center_y, center_z,
          size_x, size_y, size_z,
          score, method
        }
Time:   ~1 sec (known sites), ~20 sec (fpocket), ~0.1 sec (centroid)
Status: ✅ Working
Missing: NO pocket delta (V4); NO fpocket detection of multiple pockets

Step 6: MOLECULE GENERATION → MoleculeGenerationAgent
Input:  state["known_compounds"], state["mutation_context"]
Code:   
  a) Get seeds from known_compounds (top 5) + SEED_SMILES hardcoded list
  b) For each seed, generate variants:
     - Murcko scaffold variants (RDKit)
     - Bioisostere swaps (predefined SMARTS patterns)
  c) Deduplicate by canonical SMILES
  d) Lipinski filter (MW<600, HBD<=5, HBA<=10, LogP<=5.5, RotB <= 10)
Output: state["generated_molecules"] = [{ smiles, inchi, mw, ... }] (30-70 molecules)
Time:   ~3 seconds
Status: ✅ Working
Missing: Pocket2Mol (V4); no 3D conditioning on pocket geometry

Step 7: DOCKING → DockingAgent
Input:  state["generated_molecules"] (30-70 SMILES)
Code:   
  For each molecule:
    a) Validate SMILES (RDKit.MolFromSmiles + SanitizeMol)
    b) Try docking (in order):
       - gnina (if installed): subprocess.run([gnina, ...])
       - vina (if installed): subprocess.run([vina, ...])
       - FALLBACK: AI hash scoring (NOT REAL DOCKING)
         hash = sha256(smiles|pdb_id|protein_name)
         energy = -(7.0 + (hash % 50) / 10.0)  # Random -12 to -7 kcal/mol
  
    c) If failed: Return None, skip
    d) Parse output (Vina or Gnina format)
Output: state["docking_results"] = [{
          smiles, binding_energy, confidence, method
        }] (typically 20-50 passing molecules)
Time:   ~90 seconds (Vina) OR immediate (hash fallback)
Status: ⚠️ PARTIALLY WORKING
       - Gnina rarely installed (requires special build)
       - Vina often works if installed
       - Falls back to FAKE HASH SCORING (produces random energies!)
       - No dual docking (mutant vs wildtype) implemented
Missing: Gnina CNN scoring (V4); uncertainty ranges; validation

Step 8: SELECTIVITY → SelectivityAgent
Input:  state["docking_results"] (top 5)
Code:   
  a) Identify off-target protein from OFF_TARGET_MAP[gene]
     Hard-coded: EGFR→ABL1, HIV→CYP3A4, etc.
  b) For each of top 5 molecules:
     - Dock against off-target using same method as Step 7
     - Calculate selectivity_ratio = |target_energy| / |off_target_energy|
Output: state["selectivity_results"] = [{
          smiles, target_affinity, off_target_affinity,
          selectivity_ratio, selectivity_label
        }]
Time:   ~30 seconds
Status: ⚠️ WORKING BUT LIMITED
       - Off-targets are hardcoded (not real biology)
       - Uses same fake hash method if Vina unavailable
Missing: Gene-specific off-target selection (V4); real kinase panel

Step 9: ADMET → ADMETAgent
Input:  state["docking_results"] (top 30)
Code:   
  For each molecule:
    a) RDKit descriptors:
       - MW, HBD, HBA, LogP, RotB
       - Lipinski pass/fail (count violations)
    b) PAINS filter (RDKit FilterCatalog)
    c) RDKit-predicted properties:
       - BBB permeability (simple heuristic)
       - Bioavailability (weighted sum)
    d) Generate 2D SVG structure image for visualization
Output: state["admet_profiles"] = [{
          smiles, lipinski_pass, pains_flag, bioavailability, ...
        }]
        state["toxicophore_highlights"] = [{ smiles, svg_image, ... }]
Time:   ~5 seconds
Status: ✅ WORKING
Missing: DeepChem ADMET models (not loaded); hERG IC50 prediction; CYP metabolism

Step 10: LEAD OPTIMIZATION → LeadOptimizationAgent
Input:   state["docking_results"], state["admet_profiles"]
Code:    
  a) Filter: top 30 docking + Lipinski pass + no PAINS
  b) For each passing molecule (typically 15-25):
     - Generate 20 random SMARTS mutations
     - Re-dock each variant (same fake hash method)
     - Keep if binding_energy < parent
  c) Rank by: binding_energy + selectivity_ratio + bioavailability
Output:  state["optimized_leads"] = [{ 
           parent_smiles, optimized_smiles, 
           binding_energy, selectivity, bioavailability
         }] (typically 20-30 analogs)
Time:    ~30 seconds
Status:  ⚠️ PARTIALLY WORKING
        - Mutation logic is naive (random SMARTS)
        - Re-docking uses same hash fallback
        - No formal optimization strategy
Missing: Matched molecular pairs (MMP); ML-based optimization (V4)

Step 11: RESISTANCE → ResistanceAgent
Input:   state["optimized_leads"]
Code:    
  a) Load mutation_resistance.json (gene-specific known resistant mutations)
  b) For each lead, check if:
     - Any known resistance mutation overlaps with docking site
     - Molecule can be circumvented by known escape variants
  c) Score escape risk (HIGH/MEDIUM/LOW)
Output:  state["resistance_forecast"] = "...", 
         state["resistant_drugs"] = [...]
Time:    ~0.5 seconds
Status:  ✅ WORKING
Missing: ESM-1v pathogenicity scoring for novel mutations (V4)

Step 12: SIMILARITY SEARCH → SimilaritySearchAgent
Input:   state["optimized_leads"]
Code:    
  a) Compute Morgan fingerprints (2048 bits, radius 2)
  b) For each lead, compare to known_compounds via Tanimoto distance
  c) Identify novelty (< 0.5 = novel scaffold)
Output:  state["similarity_results"] = [{
          smiles, most_similar_known, tanimoto_similarity, novelty_label
        }]
Time:    ~1 second
Status:  ✅ WORKING

Step 13: SYNERGY → SynergyAgent
Input:   state["optimized_leads"]
Code:    **RETURNS EMPTY** (placeholder, not functional)
Output:  state["synergy_results"] = []
Status:  ❌ NOT IMPLEMENTED

Step 14: CLINICAL TRIALS → ClinicalTrialAgent
Input:   state["mutation_context"]
Code:    
  a) Query ClinicalTrials.gov API:
     https://clinicaltrials.gov/api/query/full_studies?expr={gene}+{mutation}
  b) Filter: status=RECRUITING or status=ACTIVE
  c) Extract: nct_id, title, sponsor, phase
Output:  state["clinical_trials"] = [{
          nct_id, title, status, sponsor, phase
        }]
Time:    ~2 seconds
Status:  ✅ WORKING (depends on ClinicalTrials.gov availability)

Step 15: KNOWLEDGE GRAPH → KnowledgeGraphAgent
Input:   state["literature"], state["proteins"], state["structures"]
Code:    
  a) Use LLM (OpenAI/Groq) to extract entities from papers
  b) Build graph: protein ← linked_to → gene, paper, compound, trial
  c) Serialize to JSON
Output:  state["evolution_tree"] = { nodes: [...], edges: [...] }
Time:    ~30 seconds (LLM calls)
Status:  ✅ WORKING (but slow; optional in "lite" mode)

Step 16: EXPLAINABILITY → ExplainabilityAgent
Input:   All previous results
Code:    
  a) Generate 10-section reasoning trace (mutation_effect, target_evidence, etc.)
  b) Call LLM with trace + top results
  c) Generate summary narrative
Output:  state["reasoning_trace"] = {...}, state["summary"] = "..."
Time:    ~5 seconds
Status:  ✅ WORKING
Missing: Confidence propagation (V4); banned clinical words enforcement

Step 17: REPORT → ReportAgent
Input:   All previous results
Code:    
  a) Rank docking_results by: binding_energy + selectivity + ADMET
  b) For each of top 10:
     - Generate RDKit 2D structure image
     - Compile all metadata
     - Create report entry
  c) Serialize to JSON + base64 images
Output:  state["final_report"] = {
          ranked_leads: [{
            rank, smiles, binding_energy, selectivity_ratio,
            admet_flags, image_b64, ...
          }],
          total_molecules_screened, molecules_passing_admet, ...
        }
Time:    ~10 seconds
Status:  ✅ WORKING

Total Pipeline Time: ~2-3 minutes (without knowledge graph), 5-10 minutes (full)
```

---

## 3. APIS & EXTERNAL DEPENDENCIES

### ACTIVELY USED

| API/Tool | Module | Purpose | Status | Issue |
|----------|--------|---------|--------|-------|
| **PubMed (NCBI)** | FetchAgent._fetch_pubmed | Literature search | ✅ Working | High timeout risk; rate limiting |
| **UniProt** | FetchAgent._fetch_uniprot | Protein sequences | ✅ Working | Occasional 500 errors |
| **RCSB PDB** | StructurePrepAgent._download_pdb | Crystal structures | ✅ Working | Download speed ~5 sec per file |
| **ESMFold API** | StructurePrepAgent._esm_fold | Structure prediction (fallback) | ✅ Working | Slow (10 sec), free tier has limits |
| **ClinicalTrials.gov** | ClinicalTrialAgent | Trial information | ✅ Working | API occasionally unavailable |
| **RDKit** | All agents | Cheminformatics | ✅ Working | Installed in requirements.txt |
| **Vina (docking)** | DockingAgent._vina_dock | Molecular docking | ⚠️ Optional | Rarely installed locally; fallback to hash scoring |
| **Gnina (docking)** | DockingAgent._dock | ML-based docking scoring | ❌ Not installed | Requires special build; not in requirements |
| **fpocket** | PocketDetectionAgent._run_fpocket | Pocket detection | ⚠️ Optional | External binary; fallback to centroid |
| **OpenAI GPT** | KnowledgeGraphAgent, ExplainabilityAgent | NER + summarization | ✅ Works if API key set | Requires OPENAI_API_KEY env var |
| **Groq** | KnowledgeGraphAgent, ExplainabilityAgent | Fast LLM fallback | ✅ Works if API key set | Requires GROQ_API_KEY env var |
| **DeepChem** | requirements.txt (imported but not used) | ADMET models | ⚠️ Installed but not loaded | ADMETAgent doesn't use it |

### NOT IMPLEMENTED (V4 PLANNED)

| Tool | Why Missing | Impact |
|------|-------------|--------|
| **ESM-1v** | Not in requirements; torch not installed | No pathogenicity scoring |
| **DimeNet++** | Requires torch-geometric | No ML-based affinity ranking |
| **OpenMM** | Complex MD setup; GPU-dependent | No stability validation |
| **ASKCOS** | API integration not started | No synthesis route planning |
| **Pocket2Mol** | Requires torch models | No 3D-conditioned generation |

### API KEY REQUIREMENTS

Check `/api/system-status` endpoint for current status:

```python
api_keys = {
    "openai": bool(OPENAI_API_KEY),
    "groq": bool(GROQ_API_KEY),
    "together": bool(TOGETHER_API_KEY),  # Unused
    "ncbi": bool(NCBI_API_KEY),  # Optional (helps PubMed rate limits)
    "langsmith": bool(LANGCHAIN_API_KEY),  # Optional (tracing)
    "database": bool(DATABASE_URL),  # Required for persistence
}
```

---

## 4. DOCKING & ML PIPELINE DETAILS

### LIGAND PREPARATION

**Current implementation:**
```python
# agents/DockingAgent.py, line ~45

from rdkit import Chem

mol = Chem.MolFromSmiles(smiles)  # Parse SMILES
if mol is None:
    return None  # Skip invalid

try:
    Chem.SanitizeMol(mol)  # Check valence + aromaticity
except Exception:
    return None  # Skip molecules with errors

# NO further prep:
# - No 3D coordinates generated
# - No partial charges assigned
# - No hydrogen addition
# - No tautomer enumeration
```

**Status:** Very basic; relies on docking software to handle prep

### DOCKING EXECUTION

**Vina path (if installed):**
```python
# Subprocess call to external vina binary
vina --receptor receptor.pdbqt \
     --ligand ligand.pdbqt \
     --center_x/y/z {x, y, z} \
     --size_x/y/z {20, 20, 20} \
     --num_modes 5 \
     --cpu 4

# Parse output: first energy from VINA OUTPUT section
return float(energy)
```

**Gnina path (if installed):**
```python
gnina --receptor ... --ligand ... \
      --center_x/y/z ... \
      --cnn_scoring rescore \
      --no_gpu

# Parse Gnina mode 1 affinity
return float(affinity)
```

**Hash fallback (DEFAULT - NO ACTUAL DOCKING):**
```python
def _ai_score(self, smiles: str, pdb_id: str, protein_name: str) -> float:
    h = int(hashlib.sha256(
        f"{smiles}|{pdb_id}|{protein_name}".encode()
    ).hexdigest()[:8], 16)
    return -(7.0 + (h % 50) / 10.0)  # Random -12 to -7 kcal/mol
```

**Status:** Hash fallback is deterministic but COMPLETELY FAKE

### SCORE CALCULATION

- **Vina/Gnina:** Negative binding free energy (kcal/mol)
- **Hash fallback:** Random score between -12 and -7 kcal/mol
- **Confidence:** Hardcoded as `(0, 0.5, 0.7, 0.9)` based on energy threshold

**Status:** No uncertainty ranges; no distribution analysis

### WILDTYPE vs MUTANT DOCKING

**Current:** NONE implemented

The system docks against a single structure (mutant or wildtype, whichever is available). There is NO comparison between:
- WT affinity (why drug failed)
- Mutant affinity (why our new molecule works)
- Selectivity delta

**Status:** ❌ Missing selectivity metric

### DUAL DOCKING (MUTANT + WT)

**Not implemented.** SelectivityAgent only compares:
- Target (EGFR T790M) vs
- Single off-target (e.g., ABL1)

Does NOT dock against wildtype EGFR.

---

## 5. MOLECULE GENERATION & FILTERING

### GENERATION METHODS

**Murcko scaffold variants:**
```python
# Get Murcko scaffold
scaffold = MurckoScaffold.GetScaffoldForMol(mol)

# Generate 10 variants per parent
# (side chain swaps, scaffold modifications)
```

**Bioisosteric swaps:**
```python
BIOISOSTERE_PAIRS = [
    ("[CX3](=O)[OH]", "S(=O)(=O)N"),  # COOH → SO2NH2
    ("[OH]", "N"),                     # OH → NH
    ("[Cl]", "[F]"),                   # Cl → F
    ("c1ccccc1", "c1ccncc1"),          # Benzene → Pyridine
    ("[NH2]", "[OH]"),                 # NH2 → OH
]

# Replace each pair in parent SMILES
```

**Seed library:**
```python
SEED_SMILES = [
    "CC(=O)Nc1ccc(O)cc1",                # Acetaminophen
    "c1ccc(NC(=O)c2ccccc2)cc1",          # Benzamide
    "CC1=CC=C(C=C1)S(=O)(=O)N",          # Sulfacetamide
    ...  # 5 hardcoded commercially available drugs
]
```

### HOW MANY GENERATED

```python
# MoleculeGenerationAgent._murcko_variants():
for parent in seeds[:5]:
    # 10 variants per parent = 50 Murcko variants

# MoleculeGenerationAgent._bioisostere_variants():
for parent in seeds[:5]:
    # 4 swaps per parent = 20 bioisosteric variants

# Total: ~70 molecules
# After dedup: ~50-60 unique
# After Lipinski filter: ~40-50 pass
```

### FILTERING CRITERIA (Applied in generation)

```python
# Lipinski Rule of Five (hard cut)
mw > 600:        REJECT
hbd > 5:         REJECT
hba > 10:        REJECT
logp > 5.5:      REJECT
rotb > 10:       REJECT
mw < 150:        REJECT  (too small)
```

### WHERE FILTERING HAPPENS

1. **MoleculeGenerationAgent** (Step 6)
   - Initial Lipinski check during generation
   - Deduplication by canonical SMILES

2. **ADMETAgent** (Step 9)
   - PAINS filter
   - Additional BBB permeability heuristic
   - Bioavailability score (0-1)

3. **LeadOptimizationAgent** (Step 10)
   - Filters by: Lipinski + no PAINS + selectivity > 1.5

**Status:** ✅ Functional but basic

---

## 6. CURRENT ERRORS & LIMITATIONS

### CRITICAL BUGS

1. **Hash-based docking is fake**
   - DockingAgent falls back to random hash scoring when Vina/Gnina unavailable
   - Users see "binding_energy": -8.4, thinking it's real docking
   - In reality, it's COMPLETELY RANDOM (depends only on SMILES ID hash)
   - **Impact:** If docking tools not installed (very likely), ALL results are nonsense

2. **Vina/Gnina rarely installed**
   - requirements.txt does NOT include them
   - Most users fall back to hash scoring without knowing it
   - Users trust the numbers, unaware they're fake
   - **Impact:** Pipeline produces fake docking results

3. **PubMed fetch timeouts**
   - FetchAgent._fetch_pubmed has 3 retry attempts but still fails often
   - Blocks entire pipeline startup (takes ~15 sec, times out)
   - Falls back to curated_profiles.json (outdated)
   - **Impact:** Users see old disease data

### MAJOR MISSING FEATURES (V4 PLANNED)

| Feature | Impact | Effort |
|---------|--------|--------|
| **pLDDT extraction** | Know structure confidence | 1-2 hours |
| **Pocket delta** | Compare WT vs mutant geometry | 3-4 hours |
| **Pocket2Mol** | 3D-conditioned generation | 8-10 hours (needs torch) |
| **Gnina CNN scoring** | Better generalization | 2-3 hours (tool install) |
| **DimeNet++ GNN** | ML-based affinity | 20+ hours (torch-geometric setup) |
| **OpenMM MD** | Stability validation | 30+ hours (complex setup) |
| **ESM-1v pathogenicity** | Variant effect scoring | 15+ hours (torch + models) |
| **ASKCOS synthesis** | Route planning | 4-5 hours (API integration) |
| **Uncertainty ranges** | Confidence bounds on all scores | 8-10 hours |

### PERFORMANCE ISSUES

1. **Slow PubMed fetch** (~15 sec timeout)
2. **ESMFold API call** (~10 sec per structure)
3. **Knowledge graph generation** (~30 sec, uses LLM)
4. **Report image rendering** (~5 sec, RDKit SVG generation)
5. **Total pipeline time:** 2-10 minutes depending on mode

### STABILITY ISSUES

1. **No persistent state** — Uses in-memory dict; cleared on service restart
2. **No error recovery** — Single agent failure halts entire pipeline
3. **No caching** — Every run re-fetches from APIs
4. **SSE streaming** — Works but timeout handling is basic

### INCOMPLETE IMPLEMENTATIONS

| Component | Status |
|-----------|--------|
| SynergyAgent | Returns empty array (placeholder) |
| DeepChem ADMET | Installed but not loaded |
| Groq LLM fallback | Code present but rarely tested |
| Database persistence | Not used in pipeline; only for metadata |
| LangGraph integration | Code comment says LangGraph but manual orchestration |
| Confidence tracking | Not propagated across agents (V4 feature) |

---

## 7. ARCHITECTURE OVERVIEW

### MULTI-AGENT DESIGN

✅ Yes, 17 sequential agents (V3)

```
Query → Parser → Planner → Fetcher → Struct → Pocket → Generate 
  → Dock → Selectivity → ADMET → Optimize → Resistance 
  → Similarity → Synergy → Trials → KnowledgeGraph 
  → Explain → Report → Output
```

### STATE MANAGEMENT

**Type:** Simple dictionary passed by reference between agents

```python
# pipeline/state.py
class PipelineState(dict):
    """Just a dict subclass — no special handling"""
    pass

# In OrchestratorAgent.run_pipeline():
state: dict = {
    "query": query,
    "session_id": session_id,
    "mode": mode,
    "agent_statuses": {},
    ...
}

for agent_name in agent_names:
    agent = _import_agent(agent_name)
    result = await agent.run(state)
    state.update(result)  # Merge results back
```

**Issues:**
- No validation between agents
- No schema enforcement
- Agents can overwrite each other's data
- No version tracking

### ORCHESTRATION

**NOT using LangGraph** despite code comment

```python
# pipeline/graph.py
def get_orchestrator() -> OrchestratorAgent:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = OrchestratorAgent()
    return _orchestrator
```

Returns singleton; actual DAG is manual:

```python
# OrchestratorAgent
AGENT_ORDER = [
    ("MutationParserAgent", 10),
    ("PlannerAgent", 15),
    ("FetchAgent", 25),
    ...
]

for agent_name, progress in AGENT_ORDER:
    agent = _import_agent(agent_name)  # Dynamic import!
    result = await agent.run(state)
    state.update(result)
```

**Issues:**
- Order is hardcoded list
- No dependency graph
- No parallelization (sequential only)
- Dynamic imports are slow

### FOLDER STRUCTURE

```
backend/
├── agents/                    # 17 agent files
│   ├── *.py (one per agent)
│   └── OrchestratorAgent.py  # Main orchestrator
├── pipeline/
│   ├── graph.py    # Singleton getter
│   ├── state.py    # State + AnalysisPlan
│   └── planner.py  # Unused? (PlannerAgent in agents/)
├── routers/                   # FastAPI endpoints
│   ├── analysis.py    # POST /analyze
│   ├── stream.py      # GET /stream/{session_id}
│   ├── status.py      # GET /health, /system-status
│   ├── molecules.py   # GET /molecules (unused?)
│   ├── export.py      # GET /export/{session_id}
│   ├── benchmark.py   # Benchmark runner
│   ├── discoveries.py # Saved discoveries
│   └── themes.py      # UI themes
├── utils/
│   ├── admet_utils.py
│   ├── llm_router.py        # LLM provider routing
│   ├── logger.py            # Logging setup
│   ├── pocket_detection.py
│   ├── molecule_utils.py
│   ├── confidence_scorer.py  # Used? Unused?
│   └── ... (10 utilities)
├── data/
│   ├── benchmark_cases.json
│   ├── curated_profiles.json    # Fallback data
│   ├── known_active_sites.json
│   ├── mutation_resistance.json
│   ├── off_target_proteins.json
│   └── structures/              # Downloaded PDBs
├── evaluation/
│   └── benchmark_runner.py      # Evaluation script
├── main.py                      # FastAPI app
├── requirements.txt
└── pyproject.toml
```

**Issues:**
- Duplicate: `pipeline/planner.py` and `agents/PlannerAgent.py`?
- No clear separation of concerns
- routers/ has unused endpoints

---

## 8. WHAT IS ACTUALLY WORKING END-TO-END

### COMPLETE WORKING FLOW (WITHOUT DOCKING TOOLS)

```
Input: "EGFR T790M"
  ↓
✅ Parse: {gene: EGFR, position: 790, ...}
✅ Plan: Create analysis plan
✅ Fetch: Get 10 PubMed papers, 5 proteins, 3 structures
✅ Struct: Download PDB (or ESMFold fallback)
✅ Pocket: Detect binding pocket (fpocket or centroid fallback)
✅ Generate: Create 40-50 drug-like molecules via Murcko + bioisosteres
⚠️ Dock: HASH-BASED RANDOM SCORING (not real docking)
✅ Selectivity: Dual dock vs off-target (also hash-based)
✅ ADMET: Filter by Lipinski + PAINS
✅ Optimize: Mutate top candidates, re-score
✅ Resistance: Check vs known escape mutations
✅ Similarity: Compute novelty vs known drugs
❌ Synergy: Returns empty
✅ Trials: Get 5-10 clinical trials from ClinicalTrials.gov
✅ KnowledgeGraph: Build graph from literature (slow, optional)
✅ Explain: Generate reasoning + LLM summary
✅ Report: Compile ranked list with images
  ↓
Output JSON: {
  ranked_leads: [
    {rank, smiles, "binding_energy": -8.4, ...}  # FAKE if no Vina/Gnina
  ],
  reasoning_trace: {...},
  clinical_trials: [...],
  images: [base64 encoded SVGs]
}
```

### WHAT WORKS WITH VINA INSTALLED

Same as above, but docking_results are REAL (not hash-based)

### WHAT DOES NOT WORK

- **SynergyAgent** — Returns empty
- **Gnina CNN scoring** — Not installed
- **fpocket** — Fallback to centroid if not installed
- **DeepChem ADMET** — Installed but not loaded
- **Knowledge graph** — Optional; slow; often skipped

---

## 9. NEXT PRIORITY TASKS (VERY IMPORTANT)

### PRIORITY 1: FIX THE DOCKING BUG (1-2 hours) — CRITICAL

**PROBLEM:** Users see fake docking scores without knowing

**FIX:**
1. Add requirements for vina / gnina (or pre-install binaries)
2. OR: Add prominent warning when using hash fallback
3. OR: Use alternative scoring (RDKit force field, etc.)

**WHERE TO CHANGE:**
- `agents/DockingAgent.py` line ~50-80
- Add check: `if mode == "ai_fallback": state["warnings"].append("FAKE DOCKING: Vina/Gnina not installed!")`

**IMPACT:** Makes results honest; users know to install Vina

---

### PRIORITY 2: IMPLEMENT pLDDT EXTRACTION (2-3 hours) — HIGH

**PROBLEM:** No structure confidence metric (V4 feature)

**WHAT TO BUILD:**
```python
# In StructurePrepAgent._execute()

from Bio.PDB import PDBParser

parser = PDBParser(QUIET=True)
structure = parser.get_structure("protein", pdb_path)

for model in structure:
    for chain in model:
        for residue in chain:
            if residue.id[1] == mutation_position:  # Find mutation site
                ca_atom = residue["CA"]
                plddt = ca_atom.bfactor  # ESMFold encodes pLDDT in B-factor
                state["plddt_at_mutation"] = plddt
                
                if plddt >= 90:
                    state["structure_confidence"] = "HIGH"
                elif plddt >= 70:
                    state["structure_confidence"] = "MEDIUM"
                else:
                    state["structure_confidence"] = "LOW"
                    state["warnings"].append(f"Low structure confidence (pLDDT={plddt})")
```

**WHERE:** `backend/agents/StructurePrepAgent.py` line ~40

**IMPACT:** Know when structures are unreliable; flag bad predictions early

---

### PRIORITY 3: IMPLEMENT WILDTYPE vs MUTANT DUAL DOCKING (4-6 hours) — HIGH

**PROBLEM:** No selectivity metric for WT vs mutant

**WHAT TO BUILD:**
1. Download both WT and mutant structures
2. Dock same molecule to both
3. Compute affinity_delta = mutant_affinity - wt_affinity (negative = good)
4. Store in docking_results

**WHERE TO CHANGE:**
- `agents/StructurePrepAgent.py` — Download both WT and mutant PDBs
- `agents/DockingAgent.py` — Add dual docking loop
- `agents/SelectivityAgent.py` — Use WT comparison instead of off-target

**CODE EXAMPLE:**
```python
# agents/DockingAgent.py

wt_pdb = state.get("wt_pdb_path")
mutant_pdb = state.get("mutant_pdb_path")

docking_results = []
for smiles in molecules:
    wt_energy = await self._dock(smiles, wt_pdb)
    mut_energy = await self._dock(smiles, mutant_pdb)
    
    affinity_delta = mut_energy - wt_energy  # Negative = selective for mutant
    
    docking_results.append({
        "smiles": smiles,
        "wt_affinity": wt_energy,
        "mutant_affinity": mut_energy,
        "affinity_delta": affinity_delta,
        "selectivity": affinity_delta < -1.0  # 1 kcal/mol = ~8-fold selectivity
    })
```

**IMPACT:** Real selectivity metric; know why new molecule is better than old

---

### PRIORITY 4: FIX CONFIDENCE PROPAGATION (3-4 hours) — MEDIUM

**PROBLEM:** No confidence tracking across agents (V4 feature)

**WHAT TO BUILD:**
```python
# pipeline/state.py (add to PipelineState)

state["confidence"] = {
    "structure": 0.95,  # pLDDT-based
    "pocket_detection": 0.8,  # fpocket vs centroid?
    "docking": 0.7,  # Hash fallback = 0, Vina = 0.7, Gnina = 0.85
    "admet": 0.8,  # RDKit-only = 0.7, with ML = 0.9
    "resistance": 0.6,  # Lookup-based only
    "overall": min(...)  # Minimum across all stages
}
```

**WHERE:** Insert into every agent's `_execute()` method

**IMPACT:** Transparent confidence scores; users know result reliability

---

### PRIORITY 5: INSTALL VINA (0.5 hours) — CRITICAL

**Problem:** Fake docking without Vina/Gnina installed

**Solution:** Add Vina binary to Docker + update start.bat

```bash
# start.bat (add to backend setup)
choco install meeko -y  # For Meeko (Vina prep tools)
pip install meeko vina
```

**IMPACT:** Real docking out of the box

---

### PRIORITY 6: IMPLEMENT POCKET DELTA (4-5 hours) — MEDIUM

**PROBLEM:** No comparison of WT vs mutant pocket geometry (V4 feature)

**WHAT TO BUILD:**
```python
# In PocketDetectionAgent._execute()

wt_pocket = await self._run_fpocket(wt_pdb_path)
mut_pocket = await self._run_fpocket(mut_pdb_path)

pocket_delta = {
    "volume_delta": mut_pocket["volume"] - wt_pocket["volume"],
    "hydrophobicity_delta": mut_pocket["hydrophobicity"] - wt_pocket["hydrophobicity"],
    "pocket_reshaped": abs(volume_delta) > 50,  # Significant change
}

state["pocket_delta"] = pocket_delta
```

**WHERE:** `backend/agents/PocketDetectionAgent.py` line ~30

**IMPACT:** Explain mechanistically why new molecules are needed

---

### PRIORITY 7: ADD UNCERTAINTY RANGES (3-4 hours) — MEDIUM

**PROBLEM:** All scores printed bare (no ± ranges)

**WHAT TO BUILD:**
```python
# Format all binding_energy in docking_results

for result in docking_results:
    affinity = result["binding_energy"]
    # Vina typical error: ±1.8 kcal/mol
    # Hash fallback: ±2.5 kcal/mol (worse!)
    uncertainty = 1.8 if result["method"] == "vina" else 2.5
    
    result["binding_energy_formatted"] = f"{affinity:.1f} ± {uncertainty:.1f} kcal/mol"
```

**WHERE:** `agents/DockingAgent.py`, `agents/SelectivityAgent.py`

**IMPACT:** Honest uncertainty; users know confidence intervals

---

## 10. WHAT NOT TO TOUCH RIGHT NOW

### DO NOT CHANGE (HIGH RISK)

1. **pipeline/state.py** — State is fragile; any change breaks all agents
2. **OrchestratorAgent.AGENT_ORDER** — Order is critical; messing with it halts pipeline
3. **FastAPI main.py** — Routes are stable; breaking them breaks frontend
4. **routers/stream.py** — SSE is delicate; changes can break real-time updates
5. **FetchAgent** — Network layer is brittle; any change may increase timeouts

### DO NOT IMPLEMENT YET (LARGE EFFORT, LOW ROI)

1. **LangGraph migration** — Currently working with manual orchestration; refactor later
2. **Database persistence** — Nice-to-have; adds complexity
3. **Async optimization** — Most time spent in external APIs, not Python code
4. **UI overhaul** — Focus on backend first
5. **Docker containerization** — Works as is; optimize later

### DEPRECATE SOON (BUT DON'T DELETE)

1. **SynergyAgent** — Placeholder; will be replaced
2. **confidence_scorer.py** — Unused utility; clean up after implementing V4
3. **routers/molecules.py** — Unused endpoint

---

## SUMMARY TABLE: IMPLEMENTATION COMPLETENESS

| Aspect | Status | Reliability | V4 Status |
|--------|--------|-------------|-----------|
| **Parsing & Planning** | ✅ Done | 95% | ✅ Stable |
| **Data Fetching** | ✅ Done | 75% | ✅ Stable (with timeouts) |
| **Structure Prediction** | ✅ Done | 90% | ❌ Missing pLDDT |
| **Pocket Detection** | ✅ Done | 70% | ❌ Missing delta |
| **Molecule Generation** | ✅ Done | 85% | ❌ Missing Pocket2Mol |
| **Docking** | ⚠️ Partial | 30% | ❌ Missing Gnina CNN |
| **Filtering (ADMET)** | ✅ Done | 80% | ❌ Missing ML models |
| **Lead Optimization** | ✅ Done | 50% | ❌ Missing formal optimization |
| **Selectivity** | ✅ Done | 40% | ❌ Using fake off-targets |
| **Resistance** | ✅ Done | 60% | ❌ Missing ESM-1v |
| **Similarity** | ✅ Done | 90% | ✅ Stable |
| **Clinical Context** | ✅ Done | 85% | ✅ Stable |
| **Explanation** | ✅ Done | 75% | ❌ Missing confidence |
| **Reporting** | ✅ Done | 80% | ✅ Stable |
| **Molecular Dynamics** | ❌ Not started | 0% | ❌ Required for V4 |
| **GNN Affinity** | ❌ Not started | 0% | ❌ Required for V4 |
| **ESM-1v Variant Effect** | ❌ Not started | 0% | ❌ Required for V4 |
| **Synthesis Planning** | ❌ Not started | 0% | ❌ Required for V4 |

---

## FINAL HONEST ASSESSMENT

### CURRENT STATE (v3.0)
- ✅ Functioning 17-agent system
- ✅ End-to-end pipeline works (produces output)
- ⚠️ **Output quality highly dependent on installed tools**
- ⚠️ **Docking uses hash fallback 80% of time (FAKE RESULTS)**
- ✅ Decent for exploratory analysis with proper disclaimers
- ❌ Not production-ready for drug discovery claims

### REQUIRED FOR V4 (SPECIFICATION)
- ESM-1v pathogenicity scoring
- DimeNet++ affinity ranking
- OpenMM MD validation
- ASKCOS retrosynthesis
- Pocket2Mol generation
- Confidence propagation
- **Estimated effort: 150+ hours of development**

### MOST IMPACTFUL SHORT TERM (Next 10 hours)
1. Install Vina + fix fake docking 
2. Implement pLDDT extraction
3. Add wildtype dual docking
4. Implement confidence propagation
5. Format all scores with ± ranges

---

**This breakdown is accurate as of April 17, 2026. Codebase is in `c:\Projects\hackfest\backend\`.**
