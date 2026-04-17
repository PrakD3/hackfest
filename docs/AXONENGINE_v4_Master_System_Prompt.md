# AXONENGINE v4.0 — Master System Prompt

## CORE MISSION

**AXONENGINE is an AI-powered drug discovery system that identifies small-molecule binders for protein mutations that cause disease resistance.**

Given a mutation (e.g., `EGFR T790M` — lung cancer patient's tumor resistant to erlotinib), AXONENGINE:
1. Predicts the 3D protein structure with the mutation
2. Analyzes how the mutation changes the binding pocket
3. Generates novel small molecules tailored to the new pocket geometry
4. Ranks candidates by computed binding affinity using multiple AI methods
5. Validates the top 2 with molecular dynamics simulations
6. Plans realistic synthesis routes for experimental validation
7. Contextualizes results within real clinical trial data

**Output:** A ranked list of 3-5 **synthesizable, patentable, experimentally testable candidates** with:
- Binding affinity scores ± uncertainty ranges
- Stability predictions (from MD simulation)
- Synthesis routes with cost/feasibility estimates
- Clinical relevance markers
- Confidence tiers (high/partial/novel)

**Execution time:** 90 seconds to 6 hours (depending on whether MD completes live)

---

## WHAT MAKES THIS DIFFERENT

### The Problem with Existing Tools
- **PDBbind-trained models** (Vina, AutoDock): Trained on ~20K known drug-protein complexes. Fail catastrophically on novel mutations and out-of-distribution scaffolds.
- **Generative models alone** (TargetDiff, Pocket2Mol): Generate chemically feasible molecules but don't validate binding or stability.
- **Experimental validation** (wet lab): Gold standard but takes months and $50K per compound.

### AXONENGINE's Approach
**Ensemble of specialized AI models, each responsible for one part of the pipeline:**
- Structure prediction: ESMFold API (trained on 98M protein sequences)
- Variant pathogenicity: ESM-1v (evolutionary conservation scoring)
- Pocket geometry: fpocket (geometric descriptors) + delta analysis
- Molecule generation: Pocket2Mol (3D diffusion conditioned on pocket)
- Docking scoring: Gnina CNN (learned scoring, not empirical)
- Affinity ranking: DimeNet++ GNN (trained on PDBbind experimental data)
- Stability validation: OpenMM physics simulation (50ns MD)
- Practical feasibility: ASKCOS (retrosynthetic routes + cost estimation)

**Each agent validates its own work and propagates confidence scores downstream.** If any stage is uncertain, final output carries a red flag.

---

## THE 22-AGENT PIPELINE

### Input
```
Mutation: GENE + POSITION + AMINO_ACID_CHANGE
Example: EGFR + 790 + Met (T790M = threonine→methionine at position 790)
```

### Stage 1: Data Acquisition (Agents 1-6)
**Goal:** Gather all known scientific context about the gene and its mutations

- **MutationParserAgent** (V3)
  - Parse input: "EGFR T790M" → {gene: EGFR, position: 790, wt_aa: T, mut_aa: M}
  - Validate mutation notation (1D coordinate system)
  - Output: `state.mutation_position`, `state.wildtype_aa`, `state.mutant_aa`

- **PlannerAgent** (V3)
  - Determine which datasets and external APIs to query
  - Set up parallelization for 4 FetchAgents
  - Output: plan JSON for all downstream agents

- **FetchAgent × 4** (V3, parallelized)
  1. **PubMed**: Recent literature on EGFR mutations (score by relevance)
  2. **UniProt**: Full protein sequence, known domains, post-translational modifications
  3. **RCSB PDB**: Download all available crystal structures (wildtype + known mutants)
  4. **PubChem**: Known EGFR inhibitors (for similarity search baseline)
  
  Output: `state.uniprot_data`, `state.structures`, `state.known_inhibitors`, `state.literature`

---

### Stage 2: Structure Preparation (Agents 7-8)

**Goal:** Get accurate 3D structure of mutated protein ready for docking

- **StructurePrepAgent** ★ UPGRADED (V4)
  - **Primary path:** Download PDB from RCSB (fastest, if available)
  - **Fallback:** Call ESMFold API: `https://api.esmatlas.com/foldSequence/v1/pdb/`
    - Input: mutant protein sequence (`MFDA...` etc., 1272 residues for EGFR)
    - Output: PDB file in 5-10 seconds
    - Cache result to `data/structure_cache/EGFR_T790M.pdb` (never re-call API)
  - **Quality gate:** Extract pLDDT (per-residue confidence score, 0-100)
    - If pLDDT at mutation site ≥ 90: `structure_confidence = "HIGH"`
    - If 70-89: `structure_confidence = "MEDIUM"` (OK to continue)
    - If 50-69: `structure_confidence = "LOW"` (attach warning to all downstream outputs)
    - If < 50: `structure_confidence = "VERY_LOW"` (flag pipeline as low-confidence, but continue)
  - Output: `state.mutant_pdb_path`, `state.plddt_at_mutation`, PDB file

---

### Stage 3: Variant Effect Analysis (Agent 9)

**Goal:** Score how pathogenic/functional-impact the mutation is

- **VariantEffectAgent** ★ NEW (V4)
  - Use **ESM-1v** (Facebook/Meta protein language model, 650M parameters)
    - Trained on 98 million UniRef90 protein sequences
    - Learns evolutionary conservation by masking and predicting amino acids
  - Method: Masked marginal scoring
    - Mask position 790 in mutant sequence
    - Probability of ESM-1v predicting T (wildtype) vs M (mutant)
    - Log-likelihood ratio = score
  - **Interpretation:**
    - Score < -2.0: `esm1v_confidence = "PATHOGENIC"` (mutation likely harmful, common in disease)
    - Score -2.0 to 0.0: `esm1v_confidence = "UNCERTAIN"` (neutral evolutionary signal)
    - Score > 0.0: `esm1v_confidence = "BENIGN"` (conservation favors mutation, rare in resistance)
  - **Clinical signal:** If BENIGN, lower downstream confidence (benign mutations shouldn't drive resistance — flag as suspicious)
  - Output: `state.esm1v_score`, `state.esm1v_confidence`

---

### Stage 4: Pocket Geometry Analysis (Agent 10)

**Goal:** Compare binding pocket between wildtype and mutant protein

- **PocketDetectionAgent** ★ UPGRADED (V4)
  - Run **fpocket** on both wildtype + mutant structures
    - External binary: `fpocket -f protein.pdb`
    - Detects binding pockets by Voronoi tesselation
    - Returns: volume, druggability score, hydrophobicity, polarity, charge scores
  - **Pocket delta analysis:** Compare descriptors
    - `volume_delta = mutant_volume - wildtype_volume`
      - -100 Å³: pocket shrank (harder to bind)
      - +100 Å³: pocket expanded (new binding sites possible)
    - `hydrophobicity_delta = mutant - wildtype`
    - `displaced_residues`: Which residues moved?
    - `pocket_reshaped`: Boolean (true if volume delta > 50 Å³)
  - **Why this matters:** The mutation didn't just weaken drug binding — it **geometrically changed the pocket**. New molecules can be designed to fit the new shape.
  - Output: `state.wildtype_pocket`, `state.mutant_pocket`, `state.pocket_delta`

---

### Stage 5: Molecule Generation (Agent 11)

**Goal:** Design novel small molecules optimized for the mutant pocket

- **MoleculeGenerationAgent** ★ UPGRADED (V4)
  - **Primary:** Pocket2Mol (AI model trained on PDBbind)
    - Input: Mutant pocket 3D geometry + pocket fingerprint (normalized descriptors)
    - Method: SE(3)-equivariant diffusion model
    - Output: 100 novel SMILES strings + 3D coordinates scoped to pocket
    - Advantage: Generates pocket-aware chemistry, not just similar-to-reference molecules
  - **Fallback:** RDKit SMARTS-based mutations
    - If Pocket2Mol unavailable or produces < 20 molecules
    - Perform 2000+ RDKit random mutations on known EGFR inhibitors
    - Score by structural similarity to PubMed literature hits
  - **Deduplication:** Canonical SMILES, remove duplicates
  - **Validation:** `RDKit.Chem.MolFromSmiles()` — discard None
  - Output: `state.generated_smiles` (list of 50-100 valid SMILES strings)

---

### Stage 6: Docking (Agent 12)

**Goal:** Predict binding pose of each molecule to mutant protein

- **DockingAgent** ★ UPGRADED (V4)
  - **Preparation:**
    - Convert protein PDB → PDBQT (add charges, prepare for docking)
    - Add hydrogens, parametrize ligands with GAFF
  - **Pose search:** Vina (kept from V3)
    - Fast global optimization, finds 5-10 poses per molecule
    - Box around mutation pocket (10 Å radius)
  - **Scoring:** Gnina CNN (NEW, replaces Vina scoring)
    - Vina's empirical scoring: $\Delta G \approx$ linear sum of vdW + H-bonds + desolvation
    - Problem: Trained on 1993-2007 complexes, fails on novel scaffolds
    - Gnina: 2D CNN pre-trained on PDBbind, learns scoring from deep learning
    - Input: 2D ligand structure + docked pose atoms (vdW surfaces)
    - Output: CNN affinity score (0-1, higher = better binding)
    - Fallback: Return Vina score if Gnina not available
  - **Score format:** `-8.4 ± 1.8 kcal/mol (Gnina CNN)` (uncertainty ranges added by pipeline)
  - Output: `state.docking_results` (list of {smiles, affinity_kcal_mol, cnn_score, pose_path})

---

### Stage 7: Selectivity Analysis (Agent 13)

**Goal:** Ensure molecule doesn't hit off-target kinases (reduce side effects)

- **SelectivityAgent** (V3, unchanged)
  - Dock top 30 docked molecules against 10 off-target proteins
    - Known EGFR-family targets (HER2, HER3, EGFR wildtype)
    - Other kinases (Src, FGFR, etc.)
  - **Selectivity score:** $\text{ΔG}_{\text{EGFR T790M}} - \text{ΔG}_{\text{off-target}}$
    - Positive = selects for mutant
    - -5 kcal/mol = 100:1 selectivity ratio
  - Filter: Keep molecules with selectivity ≥ 3.2 kcal/mol (fold selectivity bonus)
  - Output: `state.selectivity_results` (affinity on 10 off-targets per lead)

---

### Stage 8: ADMET Filtering (Agent 14)

**Goal:** Predict absorption, distribution, metabolism, excretion, toxicity

- **ADMETAgent** (V3, unchanged)
  - Use **DeepChem/chemprop models** trained on pharma datasets
  - Criteria:
    - **Absorption:** LogP 0-5 (lipophilicity), MW < 500 Da, TPSA 20-130 Ų
    - **Distribution:** Plasma protein binding < 95%
    - **Metabolism:** CYP3A4/2D6/2C9 substrate or inhibitor (flag but don't disqualify)
    - **Excretion:** Likely renal clearance
    - **Toxicity:** No PAINS alerts, no known toxicophores, hERG blockade < 10µM
  - Filter: Keep molecules passing ≥ 8/10 ADMET rules
  - Output: `state.admet_results` (pass/fail + predicted clearance)

---

### Stage 9: Lead Optimization (Agent 15)

**Goal:** Iterative chemical improvement of top candidates

- **LeadOptimizationAgent** (V3, unchanged)
  - Take top 30 from ADMET
  - Generate 100 analogs per compound using:
    - Matched molecular pairs analysis
    - SMARTS-based side-chain swaps
    - Property prediction (LogP, TPSA, MW)
  - Re-dock all analogs
  - Rank by: **affinity + selectivity + ADMET + synthesizability**
  - Output: `state.optimized_leading_molecules` (top 30 analogs)

---

### Stage 10: Affinity Pre-Filtering (Agent 16)

**Goal:** Fast ranking before slow MD simulation

- **GNNAffinityAgent** ★ NEW (V4)
  - Use **DimeNet++** (message-passing graph neural network)
    - Pre-trained on **PDBbind v2020** (19,443 experimentally-measured protein-ligand complexes)
    - Learns 3D geometric features from atomic coordinates
    - Output: Predicted binding free energy (ΔG in kcal/mol)
  - **Why before MD?**
    - Vina/Gnina: ±2 kcal/mol error (empirical, limited training set)
    - GNN: ±1.2 kcal/mol error (learned from 19K experimental structures)
    - MD: ±0.5 kcal/mol error (100% accurate but 6 hours per compound)
    - Trade-off: GNN is **100× faster than MD** and **more accurate than docking**
  - **Filtering logic:**
    - Run GNN on 30 ADMET-filtered molecules
    - Sort by predicted ΔG (most negative = best)
    - **CRITICAL GATE:** Take **exactly top 2 molecules only**
    - Never pass more than 2 to MD (runtime constraint: MD is slow)
  - **Uncertainty:** Reported as `ΔG ± 1.2 kcal/mol (GNN)`
  - Output: `state.top_2_finalists`, `state.gnn_affinity_scores`

---

### Stage 11: Molecular Dynamics Validation (Agent 17)

**Goal:** Prove the molecule actually stays bound in a realistic biophysical environment

- **MDValidationAgent** ★ NEW (V4)
  - Only runs on exactly 2 finalists from GNNAffinityAgent
  - **Simulation setup:**
    - Complex: protein + ligand + TIP3P water box (10 Å padding)
    - Ions: 0.15 M NaCl (physiological)
    - Force field: AMBER ff14SB (protein) + GAFF2 (ligand)
    - Platform: CUDA (GPU) if RTX 4050+, else CPU (slower)
  - **50 nanosecond NVT simulation:**
    1. **Energy minimization** (500 steps steepest descent)
    2. **Equilibration** (1 ns, harmonic restraints then released)
    3. **Production MD** (50 ns free dynamics, 2 fs timestep)
    4. **Analysis:** Save coordinates every 100 ps (500 frames total)
  
  - **RMSD (Root Mean Square Deviation) analysis:**
    - Track ligand positions relative to initial docked pose
    - If RMSD < 2.0 Å mean: `stability_label = "STABLE"` ✅ Molecule stays in pocket
    - If 2.0-4.0 Å: `stability_label = "BORDERLINE"` ⚠️ May dissociate
    - If > 4.0 Å: `stability_label = "UNSTABLE"` ❌ Molecule leaves pocket
  
  - **MM-PBSA/GBSA binding free energy:**
    - $\Delta G = E_{\text{complex}} - E_{\text{protein}} - E_{\text{ligand}}$
    - Estimates true binding free energy from MD frames
    - Typical range: -6 to -12 kcal/mol for drugs
  
  - **Timeline:**
    - Single compound: 3-6 hours on RTX 4050 GPU
    - Demo strategy: Start MD at demo beginning, show results live if they complete
    - If MD incomplete at demo end: Show GNN ranking + "MD in progress"
  
  - Output: `state.md_results` (RMSD trajectory + MM-GBSA + stability label)

---

### Stage 12: Drug Resistance Analysis (Agent 18)

**Goal:** Predict if the mutation will develop secondary escape mutations

- **ResistanceAgent** (V3, unchanged)
  - Scan top 2 molecules through ESM-1v for nearest-neighbor resistance mutations
  - Identify positions within 5 Å of ligand in binding pocket
  - Score likelihood of escape mutations at those positions
  - Output: `state.escape_risk` (low/medium/high + predicted escape mutations)

---

### Stage 13-14: Parallel Context Analysis

**Goal:** Scientific positioning

- **SimilaritySearchAgent** (V3, unchanged)
  - Compare top 2 molecules to all known EGFR inhibitors (PubChem, ChEMBL)
  - Compute Tanimoto similarity (Morgan fingerprints)
  - Novel chemistry?: < 0.5 similarity = novel scaffold (patent advantage)

- **SynergyAgent** (V3, unchanged)
  - Predict if top 2 would synergize with other approved EGFR drugs
  - Combination therapy potential

---

### Stage 15: Clinical Contextualization (Agent 19)

**Goal:** Link results to real clinical trials and known drugs

- **ClinicalTrialAgent** (V3, unchanged)
  - Query ClinicalTrials.gov for EGFR T790M trials
  - ClinicalKey/PubMed for published efficacy data
  - Identify approved drugs as baseline (erlotinib, osimertinib, etc.)
  - Output: `state.clinical_reference` (active trials + known drugs)

---

### Stage 16: Synthesis Route Planning (Agent 20)

**Goal:** Prove top 2 molecules are actually synthesizable by medicinal chemists

- **SynthesisAgent** ★ NEW (V4)
  - Use **ASKCOS** (MIT open-source retrosynthesis, trained on USPTO reaction database)
    - API: `POST https://askcos.mit.edu/api/retro/` with SMILES
    - Returns: 5-10 synthesis routes, ranked by feasibility
    - Each route: steps → reactants → conditions
  
  - **Filter by synthesizability:**
    - Routes with < 5 steps preferred (medicinal chemistry norm)
    - Check availability: Can we buy all starting materials?
    - Estimate synthesis cost (typically $200-2000 per compound first synthesis)
    - SA score (RDKit synthetic accessibility): 1=easy, 10=impossible
      - Target: SA < 6 (feasible by chemist with chemistry knowledge)
  
  - **Output:** `state.synthesis_routes` (top route per molecule with cost estimate + procurement plan)
  - **Advantage:** Not just "SMILES" but "here is how to make it, starting with commercial materials"

---

### Stage 17: Explanation & Confidence Propagation (Agent 21)

**Goal:** Grounded narration that prevents hallucinations

- **ExplainabilityAgent** ★ UPGRADED (V4)
  - **Input:** State object with all scores + confidence dictionary
  - **Confidence object structure:**
    ```json
    {
      "tier": "WELL_KNOWN|PARTIAL|NOVEL",
      "structure_confidence": 0.92,  // pLDDT / 100
      "docking_confidence": 0.75,    // Gnina CNN score
      "esm1v_signal": "PATHOGENIC",  // variant effect
      "disclaimer_level": "GREEN|AMBER|RED"
    }
    ```
  
  - **Confidence propagation rule:** Every agent can **only lower** confidence, never raise it.
    - If StructurePrepAgent sets HIGH (0.95)
    - And VariantEffectAgent finds UNCERTAIN ESM-1v (lower to 0.85)
    - Final confidence = 0.85 (minimum across all stages)
  
  - **Grounded narration process:**
    1. Build JSON of all scores: GNN ΔG, RMSD, MM-GBSA, selectivity, ADMET flags, SA score
    2. Generate LLM prompt: "Translate these numbers into plain English. Do NOT infer mechanisms."
    3. Enforce banned clinical words:
       - ❌ "This drug is effective" → ✅ "Predicted ΔG = -9.1 ± 1.2 kcal/mol (GNN)"
       - ❌ "Recommended for treatment" → ✅ "Warrants experimental investigation"
       - ❌ "Cure resistant EGFR" → ✅ "Computational hypothesis for resistant variant"
    4. Add confidence banner:
       - WELL_KNOWN (clinical data available): Green, cautious interpretation
       - PARTIAL (some data): Amber, explicit limitations mentioned
       - NOVEL (no clinical data): Red, strong disclaimer required
    5. Append mandatory disclaimer: "All outputs are computational predictions only. No experimental validation has been performed."
  
  - Output: `state.explanation`, `state.confidence_banner`

---

### Stage 18: Final Report Generation (Agent 22)

**Goal:** Synthesize all pipeline outputs into actionable discovery report

- **ReportAgent** (V3, unchanged)
  - Rank all leads by GNN ΔG (primary) + selectivity (secondary) + synthesizability (tertiary)
  - For top 3 leads, generate:
    ```json
    {
      "rank": 1,
      "smiles": "CC(C)c1ccc(cc1)NC(=O)c2ccccc2N3CCN(CC3)C",
      "name": "Proposed: EGFR-T790M_Analog_1",
      "gnn_dg": -9.1,
      "gnn_dg_kcal": "-9.1 ± 1.2 kcal/mol (GNN)",
      "selectivity_vs_wt": 3.4,
      "selectivity_label": "3.4-fold selective for T790M",
      "rmsd_stable": true,
      "mmgbsa_dg": -8.3,
      "stability_label": "STABLE" or "NOT_RUN",
      "sa_score": 4.2,
      "sa_label": "Moderate synthesis complexity",
      "synthesis_steps": 3,
      "top_reagents": ["4-tert-butylbenzoic acid", "4-hydroxypiperidine"],
      "synthesis_cost_estimate": "$850 per gram",
      "literature_similarity": 0.31,
      "novelty": "Novel scaffold (Tanimoto < 0.35 vs known EGFR inhibitors)",
      "clinical_trials": [
        "NCT04487379: Ph II EGFR T790M resistant NSCLC",
        "NCT04513522: Ph II EGFR compound mutation"
      ],
      "confidence_tier": "WELL_KNOWN",
      "plddt_at_mutation": 92,
      "esm1v_score_mutation_impact": -3.2,
      "esm1v_label": "PATHOGENIC",
      "pocket_reshaped": true,
      "pocket_volume_delta": 87,
      "final_confidence": 0.91,
      "disclaimer": "⚠️ All predictions are computational. Experimental synthesis and binding validation required."
    }
    ```
  
  - Output: `state.final_report` (JSON + human-readable markdown)

---

## FINAL OUTPUT STRUCTURE

```json
{
  "input_mutation": "EGFR T790M",
  "pipeline_duration_seconds": 5400,
  "confidence_banner": {
    "tier": "WELL_KNOWN",
    "color": "green",
    "plddt": 92,
    "esm1v_score": -3.2,
    "message": "Clinical data available. Computational results contextualized by experimental evidence."
  },
  "variant_effect": {
    "esm1v_score": -3.2,
    "esm1v_label": "PATHOGENIC"
  },
  "pocket_analysis": {
    "volume_delta": 87,
    "hydrophobicity_delta": -0.34,
    "pocket_reshaped": true
  },
  "final_report": {
    "ranked_leads": [
      { /* top candidate */ },
      { /* 2nd candidate */ },
      { /* 3rd candidate */ }
    ],
    "top_2_md_results": [
      {
        "smiles": "...",
        "rmsd_stable": true,
        "stability_label": "STABLE",
        "mmgbsa_dg": -8.3
      },
      { /* 2nd finalist */ }
    ]
  },
  "synthesis_routes": [ /* ASKCOS routes for top 3 */ ],
  "clinical_relevance": {
    "active_trials": [ /* 3-5 clinical trials */ ],
    "approved_comparators": [ /* osimertinib, etc. */ ]
  },
  "explanation": "Clear English narration of all results...",
  "all_confidence": 0.91,
  "disclaimer": "⚠️ Computational predictions only. All results require experimental validation."
}
```

---

## KEY CONSTRAINTS (NON-NEGOTIABLE)

1. **ESMFold Caching:** API calls cached. Never re-predict.
2. **pLDDT Gate:** If < 70, flag MEDIUM or lower confidence.
3. **Top 2 Only MD:** GNN filters 30 → 2. MD runs exactly on 2 molecules.
4. **Confidence Ratchet:** Can only decrease, never increase.
5. **Uncertainty on all scores:** `value ± range (method)` format mandatory.
6. **Banned clinical language:** Post-generation string check on explanation.
7. **Molecular dynamics validation:** Empirical reality check on docking predictions.
8. **Synthesis planning:** Not just SMILES — actual routes to real compounds.

---

## COMPETITIVE ADVANTAGES

| Feature | Competitors | AXONENGINE v4 | Impact |
|---------|-------------|-----------------|--------|
| Structure for novel mutations | ❌ Manual PDB search | ✅ ESMFold API + caching | Works in 10 sec vs days of waiting |
| Pathogenicity scoring | ❌ Clinical data required | ✅ ESM-1v zero-shot | No patient data needed |
| Pocket-aware generation | ❌ Similarity-based only | ✅ Pocket2Mol 3D diffusion | True pocket-fitting, not just similarity |
| Docking accuracy | ❌ Vina (±2 kcal/mol) | ✅ Gnina CNN (±1.8 kcal/mol) | Better generalization to novel scaffolds |
| Ranking before wet lab | ❌ Docking scores only | ✅ GNN ΔG + MD validation | Filters before expensive synthesis |
| Synthesis feasibility | ❌ Binary SMILES output | ✅ ASKCOS routes + sourcing | Chemist can execute next week |
| Confidence tracking | ❌ All outputs equal confidence | ✅ Multi-stage propagation | Final confidence is minimum across pipeline |
| Explainability | ❌ Free-form LLM | ✅ Grounded in JSON scores | No hallucinations, enforceable disclaimers |

---

## DEMO SCRIPT (90 seconds)

1. **Input:** User types `EGFR T790M`
2. **Visualization:** Watch 22 agent icons animate through pipeline
3. **Structure:** Show mutant protein structure (ESMFold-generated, pLDDT 92)
4. **Variant Effect:** ESM-1v score -3.2 → "PATHOGENIC" (mutation is impactful)
5. **Pocket Analysis:** Pocket delta visualization (volume up 87 Å³, reshaped)
6. **Top 2 Finalists:** GNN ranking shows top 2 candidates with ΔG scores
7. **MD Simulation:** 
   - If complete: Show RMSD plot (flat line = STABLE)
   - If running: Show "MD progressing, frame 250/500"
8. **Synthesis:** Show 3-step route for top candidate with $850 cost estimate
9. **Clinical Context:** Link to 3 active EGFR T790M Phase II trials
10. **Conclusion:** "3 candidates, all experimentally testable, ready for wet lab in 90 seconds"

---

## SYSTEM STATISTICS

- **Total agents:** 22 (10 V3 + 5 upgraded + 4 new)
- **External APIs/tools:** ESMFold, fpocket, Gnina, OpenMM, ASKCOS
- **Machine learning models:** ESM-1v (650M), DimeNet++ (50M), Pocket2Mol diffusion
- **Runtime:** 90 sec (no MD) ... 6 hours (complete MD)
- **Compounds screened per run:** 100-300 (generated) → 30 (ADMET) → 2 (MD)
- **Memory required:** 32 GB RAM (GPU optional but recommended)
- **Output format:** JSON + interactive frontend + downloadable report

---

**Last Updated:** April 17, 2026  
**Version:** v4.0 (Production)  
**Status:** Ready for hackathon demo
