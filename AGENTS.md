# AXONENGINE v4 — Agent Architecture & Implementation

## System Overview

**AXONENGINE** is a 22-agent AI pipeline for drug discovery that takes a protein mutation and returns ranked lead compounds with synthesis routes, binding affinity predictions, and clinical context.

**Pipeline Duration:** 90 seconds (no MD) to 6 hours (with MD validation)  
**Output:** 3-5 synthesizable, patentable, experimentally testable drug candidates

---

## The 22-Agent Pipeline

### **Stage 1: Data Acquisition (Agents 1-6)**

| # | Agent | Role | Output |
|---|-------|------|--------|
| 1 | **MutationParserAgent** | Parse "EGFR T790M" → {gene, position, wt_aa, mut_aa} | Validated mutation tokens |
| 2 | **PlannerAgent** | Determine datasets to query; parallelize FetchAgents | Execution plan JSON |
| 3-6 | **FetchAgent × 4** (parallel) | PubMed, UniProt, RCSB PDB, PubChem | Literature, sequence, structures, known inhibitors |

### **Stage 2-3: Structure & Variant Analysis (Agents 7-9)**

| # | Agent | Role | Output |
|---|-------|------|--------|
| 7 | **StructurePrepAgent** | Download PDB or call ESMFold API; cache forever | `mutant_pdb_path`, `plddt_at_mutation` |
| 8 | **VariantEffectAgent** | ESM-1v masked scoring for pathogenicity | `esm1v_score`, `esm1v_confidence` (PATHOGENIC/UNCERTAIN/BENIGN) |
| 9 | **PocketDetectionAgent** | Run fpocket on wildtype + mutant; compute delta | `pocket_delta` {volume, hydrophobicity, polarity, charge} |

### **Stage 4-5: Molecule Design & Docking (Agents 10-14)**

| # | Agent | Role | Output |
|---|-------|------|--------|
| 10 | **MoleculeGenerationAgent** | Pocket2Mol (3D diffusion) or RDKit mutations | `generated_smiles` (100-150 valid SMILES) |
| 11 | **DockingAgent** | Vina pose search + Gnina CNN scoring | `docking_results` (top 30 by affinity) |
| 12 | **SelectivityAgent** | Dual-dock: target vs 10 off-targets | `selectivity_results` (keep >3.2× selective) |
| 13 | **ADMETAgent** | DeepChem: Lipinski, PAINS, hERG, CYP | `admet_results` (keep passing ≥8/10 rules) |
| 14 | **LeadOptimizationAgent** | MMP & SMARTS analogs; re-dock & re-rank | `optimized_leading_molecules` (30 analogs) |

### **Stage 6-7: Ranking & Validation (Agents 15-17)**

| # | Agent | Role | Output |
|---|-------|------|--------|
| 15 | **GNNAffinityAgent** | DimeNet++ on PDBbind (19.4K experimental) | `top_2_finalists` (EXACTLY 2 for MD) |
| 16 | **MDValidationAgent** | 50 ns OpenMM simulation on 2 molecules | `md_results` {rmsd_mean, mmgbsa_dg, stability_label} |
| 17 | **ResistanceAgent** | ESM-1v escape mutation scoring | `resistance_analysis` {predicted_escapes} |

### **Stage 8-9: Context Analysis (Agents 18-20)**

| # | Agent | Role | Output |
|---|-------|------|--------|
| 18 | **SimilaritySearchAgent** | Tanimoto vs known EGFR inhibitors | `novelty_score`, `literature_similarity` |
| 19 | **SynergyAgent** | Combination therapy potential | `synergistic_partners` |
| 20 | **ClinicalTrialAgent** | Query ClinicalTrials.gov & PubMed | `clinical_trials`, `approved_comparators` |

### **Stage 10: Output (Agents 21-22)**

| # | Agent | Role | Output |
|---|-------|------|--------|
| 21 | **SynthesisAgent** | ASKCOS retrosynthesis planning | `synthesis_routes` {steps, reagents, SA_score, cost} |
| 22 | **ReportAgent** | Rank leads & generate final JSON + markdown | `final_report` {ranked_leads, metrics, disclaimer} |

---

## Key Metrics & Confidence Propagation

### Affinity Scoring (kcal/mol)

| Method | Uncertainty | Best For |
|--------|-------------|----------|
| Vina | ±2.0 | Fast pose search |
| Gnina CNN | ±1.8 | Novel scaffolds |
| DimeNet++ GNN | ±1.2 | Pre-MD ranking |
| MM-GBSA (MD) | ±0.5 | Empirical validation |

### Confidence Tiers

```
WELL_KNOWN  (GREEN)   → pLDDT ≥ 90, ESM-1v PATHOGENIC, clinical data available
PARTIAL     (AMBER)   → pLDDT 70-90, ESM-1v UNCERTAIN, some clinical context
NOVEL       (RED)     → pLDDT < 70, ESM-1v BENIGN, no experimental validation
```

### Stability Labels (from MD RMSD)

```
STABLE      → mean RMSD < 2.0 Å   (molecule remains in pocket)
BORDERLINE  → mean RMSD 2.0-4.0 Å (may dissociate)
UNSTABLE    → mean RMSD > 4.0 Å   (left pocket during simulation)
```

### Synthesis Accessibility (SA Score)

```
SA < 3      → Easy (green, <3 steps typical)
SA 3-6      → Moderate (orange, 3-5 steps)
SA > 6      → Complex (red, >5 steps or special procedures)
```

---

## Frontend Alignment Checklist

### ✅ Components Required

- [x] **ConfidenceBanner** — tier, pLDDT, ESM-1v, disclaimer
- [x] **PocketGeometryAnalysis** — volume delta, hydrophobicity, polarity, charge
- [x] **MDValidation** — RMSD trajectory, stability label, MM-GBSA
- [x] **SynthesisRoute** — steps, SA score, cost, feasibility
- [x] **MoleculeCard** — GNN ΔG ± uncertainty, MD results, synthesis info
- [x] **PipelineStatus** — all 22 agents with status icons

### ✅ Tab Organization

```
Leads → Pocket Geometry → Selectivity → Evolution → ADMET → 
MD → Synthesis → Docking → Trials → Knowledge Graph → Reasoning → Literature → Export
```

### ✅ Output Formatting

All scores must display as: `value ± uncertainty (method)`

Examples:
- `-9.1 ± 1.2 kcal/mol (GNN)`
- `1.2 ± 0.3 Å (RMSD)`
- `92.5 (pLDDT)`
- `-8.3 ± 0.5 kcal/mol (MM-GBSA)`

### ✅ Disclaimers

Every result page must include:
```
⚠️ All outputs are computational predictions only. 
Experimental synthesis and binding validation required before biological testing.
```

---

## Implementation Notes

1. **ESMFold Caching:** Never re-call API. Cache to `data/structure_cache/{GENE}_{MUTATION}.pdb`
2. **Top 2 Only for MD:** GNN filters 30 → 2. MD runs on exactly 2 molecules.
3. **Confidence Ratchet:** Final confidence = MIN(structure, docking, gnn, esm1v)
4. **Uncertainty on All Scores:** Even simple metrics carry ranges.
5. **No Clinical Language:** Ban words: "drug", "treatment", "cure", "effective", "recommended"
6. **Grounded Narration:** All explanations tied to JSON scores, not free-form LLM hallucinations.

---

## Available Skills & When to Use Them

### 1. **simplify** — Code Quality & Efficiency Review
**WHEN:** After implementing agents or agent logic, before committing  
**HOW:** `/simplify` to review changed code for reuse, quality, and efficiency  
**PURPOSE:** Catch redundancy, optimize imports, fix issues automatically  
**NEVER SKIP:** On substantial agent implementations or refactors

### 2. **ui-ux-pro-max** — UI/UX Design Intelligence
**WHEN:** Building frontend components that visualize agent results  
**AVAILABLE:** 67 styles, 96 palettes, 57 font pairings, 25 charts, 13 stacks  
**ACTIONS:** plan, build, create, design, implement, review, fix, improve, optimize  
**EXAMPLE:** `/ui-ux-pro-max design a confidence banner with 3 color tiers`

### 3. **claude-api** — Anthropic SDK Integration
**TRIGGER WHEN:**
- Code imports `anthropic` or `@anthropic-ai/sdk`
- Adding Claude models to agents (reasoning, structured output, vision, etc.)
- User asks to integrate Anthropic APIs
**PURPOSE:** Build AI-powered agent features  
**NEVER FORGET:** Use this when agents need LLM capabilities

### 4. **update-config** — Claude Code Configuration
**WHEN:** Setting up automated testing or validation hooks  
**REQUIRES:** Hooks in `settings.json`  
**EXAMPLES:** "run agent tests after commit", "validate PipelineState schema on save"  
**AUTOMATED BEHAVIORS:** "from now on when X", "each time X"

### 5. **loop** — Recurring Task Runner
**WHEN:** Monitoring long-running agent pipelines or polling for completion  
**SYNTAX:** `/loop 5m /command` or `/loop 30s /check-status`  
**EXAMPLES:**
- Poll SSE stream for agent completion
- Monitor MD validation progress
- Check Vina docking completion
- Run agent tests repeatedly

---

## Integration with AXONENGINE Agent Pipeline

**Before implementing agents:** Use `simplify` to avoid redundant logic  
**While designing agent output:** Use `ui-ux-pro-max` for frontend consistency  
**Adding reasoning to agents:** Use `claude-api` for LLM integration  
**Testing agent pipeline:** Use `loop` to poll execution status  
**Setting up CI/CD:** Use `update-config` for automated validation hooks

**MANDATORY CHECKS BEFORE AGENT COMMIT:**
1. Run `simplify` on all agent code changes
2. Ensure type hints on all functions
3. Verify output schema matches AGENTS.md documented structure
4. Confirm agent returns proper confidence and uncertainty ranges
5. Test with `/loop 10s /run-agent-tests` to validate repeatedly

---

❌ Passing >2 molecules to MD (performance killer)  
❌ Losing pLDDT data (critical for confidence)  
❌ Missing uncertainty ranges (misleading precision)  
❌ Making clinical claims (legal/ethical issue)  
❌ Not caching ESMFold results (wasted API calls)  
❌ Inflating confidence (should only decrease, never increase)

---

## Related Files

- `CLAUDE.md` — Developer rules & conventions
- `FRONTEND_UPDATES.md` — Frontend component mapping
