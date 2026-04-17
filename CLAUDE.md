# CLAUDE.md — Development Guidelines for AXONENGINE v4

## Project Context

**Drug Discovery AI Pipeline** combining:
- 22-agent architecture for protein mutation → lead compounds
- Backend (Python/FastAPI): LangGraph agents with LLM reasoning
- Frontend (Next.js/React): Real-time pipeline visualization + result analysis

**Key constraint:** All outputs are computational predictions. Must include disclaimers and uncertainty ranges on ALL metrics.

---

## Code Quality Standards

### Frontend (Next.js/React)

#### Component Structure
- **Client Components:** Use `"use client"` at top of file
- **Props:** Always define explicit TypeScript interfaces
- **State:** Use `useState` for UI state only; fetch data from API
- **Styling:** CSS variables for theming (`var(--foreground)`, `var(--background)`, etc.)

#### Naming Conventions
- Components: PascalCase (e.g., `ConfidenceBanner`)
- Hooks: camelCase with `use` prefix (e.g., `useSSEStream`)
- Files: Match component name or descriptive lowercase (e.g., `analysis/MoleculeCard.tsx`)

#### Type Safety
- NO `any` types except in frontend data loading (where backend types may not yet exist)
- Use `RankedLead & { newField?: Type }` to extend types
- Always define return types on functions

#### Accessibility & UX
- Use semantic HTML: `<button>`, `<label>`, not `<div>` with click handlers
- Color not sole indicator: use icons + text + color
- Mobile-first responsive design

### Backend (Python/FastAPI)

#### Code Structure
- Agents inherit from `BaseAgent` or use `@tool` decorator
- Each agent has single responsibility; coordinate via LangGraph
- Input/output schemas defined with Pydantic models
- Caching: Use `@lru_cache` for expensive API calls (ESMFold, structure prep)

#### Naming Conventions
- Agent classes: `XyzAgent` (e.g., `MoleculeGenerationAgent`)
- Functions: `snake_case` with leading underscore for private (e.g., `_parse_mutation`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `POCKET_VOLUME_THRESHOLD`)

#### Type Hints
- ALL functions must have parameter and return type hints
- Use `Optional[T]` for nullable values
- Use `Union[T1, T2]` for multiple types; prefer `Enum` for string unions

#### Error Handling
- Raise `ValueError` for invalid user input (mutation format, etc.)
- Raise `RuntimeError` for agent execution failures
- Log all errors with context; never silently fail

---

## Scoring & Uncertainty Ranges

### Required Format: `value ± uncertainty (method)`

Every metric must display as:
```
-9.1 ± 1.2 kcal/mol (GNN)     # Binding affinity
92.5 (pLDDT)                   # Confidence, no uncertainty
1.2 ± 0.3 Å (RMSD)            # Stability
-8.3 ± 0.5 kcal/mol (MM-GBSA) # Free energy
```

### Affinity Methods & Uncertainties

| Method | Uncertainty | Use Case |
|--------|-------------|----------|
| Vina | ±2.0 kcal/mol | Pose search |
| Gnina CNN | ±1.8 kcal/mol | Novel scaffolds |
| DimeNet++ GNN | ±1.2 kcal/mol | Ranking |
| MM-GBSA | ±0.5 kcal/mol | Validation (MD only) |

### Confidence Tiers (Final Score)

**GREEN (WELL_KNOWN):** MIN(pLDDT, ESM-1v, literature) ≥ 90%  
**AMBER (PARTIAL):** MIN(...) = 70-90%  
**RED (NOVEL):** MIN(...) < 70%

---

## Disclaimers & Legal

### Required on Every Results Page

```markdown
⚠️ **Disclaimer:** All outputs are computational predictions only. 
Experimental synthesis and binding validation required before biological testing.
This is NOT medical advice. Consult qualified biochemists before lab work.
```

### Forbidden Language

❌ "drug", "treatment", "cure", "effective", "recommended", "will work"  
✅ "candidate compound", "predicted to bind", "computational affinity"

### Never Claim

- Clinical efficacy (needs Phase I-III trials)
- Safety for humans (needs toxicology studies)
- Patentability (needs IP attorney review)
- Manufacturability (needs process chemistry)

---

## API Response Structure

### PipelineState (Frontend ← Backend)

```python
{
  "session_id": "uuid",
  "mutation": "EGFR T790M",
  
  # Structure & variant analysis
  "pdb_id": "1M17",
  "plddt": 92.3,
  "esm1v_score": 0.85,
  "esm1v_confidence": "PATHOGENIC",
  "pocket_delta": {
    "volume_delta": 45.2,  # Å³
    "hydrophobicity_score_delta": -0.3,
    "polarity_score_delta": 0.1,
    "charge_score_delta": 0.0,
    "pocket_reshaped": true
  },
  
  # Molecule results
  "final_report": {
    "summary": "...",
    "ranked_leads": [
      {
        "rank": 1,
        "compound_name": "AXO-001",
        "smiles": "CC(C)Cc1ccc...",
        "gnn_dg": -9.1,
        "gnn_uncertainty": 1.2,
        "mmgbsa_dg": -8.3,
        "rmsd_mean": 1.2,
        "stability_label": "STABLE",
        "sa_score": 2.8,
        "synthesis_steps": 5,
        "synthesis_cost": "$8-12/g",
        "selectivity_ratio": 4.2,
        "admet_pass": true,
        "clinical_trials_count": 3
      }
    ],
    "clinical_trials": [
      {
        "trial_id": "NCT04123456",
        "title": "Phase II EGFR T790M",
        "status": "RECRUITING"
      }
    ]
  },
  
  # Validation
  "md_results": [
    {
      "smiles": "...",
      "rmsd_mean": 1.2,
      "rmsd_trajectory": [0.8, 1.1, 1.2, ...],
      "stability_label": "STABLE",
      "mmgbsa_dg": -8.3,
      "rmsd_stable": true
    }
  ],
  
  # Metadata
  "confidence_banner": {
    "tier": "WELL_KNOWN",
    "plddt": 92.3,
    "disclaimer": "..."
  },
  "metrics": {
    "execution_time_ms": 345000,
    "molecules_screened": 150,
    "molecules_passed_admet": 34
  }
}
```

---

## Frontend Component Checklist

### Must Include

- [x] **ConfidenceBanner** → Color-coded tier + pLDDT + ESM-1v
- [x] **PocketGeometryAnalysis** → Volume delta + reshaping indicator
- [x] **MDValidation** → RMSD chart + MM-GBSA + stability label
- [x] **SynthesisRoute** → Steps + SA score + cost
- [x] **MoleculeCard** → All metrics with uncertainties
- [x] **PipelineStatus** → All 22 agents with icons

### Must NOT Include

❌ Unqualified claims about binding or safety  
❌ Scores without uncertainty ranges  
❌ Missing disclaimers on pages with predictions  
❌ Confidence inflation (only equal or lower)

---

## Testing & Validation

### Backend Agent Tests

```python
# Test fixture: mutation → PipelineState
def test_mutation_parser():
    result = mutation_parser("EGFR T790M")
    assert result["gene"] == "EGFR"
    assert result["wt_aa"] == "T"
    assert result["mut_aa"] == "M"
```

### Frontend Component Tests

```typescript
// Test: ConfidenceBanner renders tier correctly
render(<ConfidenceBanner tier="WELL_KNOWN" plddt={92} />);
expect(screen.getByText(/well-known/i)).toBeInTheDocument();
```

---

## Common Mistakes to Avoid

| ❌ | ✅ |
|---|---|
| Display score without uncertainty | `-9.1 ± 1.2 kcal/mol (GNN)` |
| Claim "this drug works" | "computational affinity prediction of" |
| Lose pLDDT data | Always cache structure metadata |
| Pass >2 molecules to MD | Filter to exactly 2 with GNN |
| Missing disclaimer on results | Include on every prediction page |
| Component with `any` types | Use `&` to extend known types |
| Confident assertions about safety | "May require validation" |

---

## Deployment Checklist

- [ ] All TypeScript type errors resolved
- [ ] All disclaimers present on result pages
- [ ] No clinical language in UI text
- [ ] Uncertainty ranges on all scores
- [ ] ConfidenceBanner shows correct tier
- [ ] All 22 agents visible in PipelineStatus
- [ ] Synthesis routes populated for top 3 leads
- [ ] MD results display (if available)
- [ ] Export button functional
- [ ] LangSmith trace linkable

---

## Available Skills & When to Use Them

### 1. **simplify** — Code Quality & Efficiency Review
**WHEN:** After implementing features, before committing  
**HOW:** `/simplify` to review changed code for reuse, quality, and efficiency  
**PURPOSE:** Catch redundancy, optimize imports, fix issues automatically  
**NEVER SKIP:** On substantial code changes

### 2. **ui-ux-pro-max** — UI/UX Design Intelligence
**WHEN:** Building new UI components or redesigning interfaces  
**AVAILABLE:** 67 styles, 96 palettes, 57 font pairings, 25 charts, 13 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui)  
**ACTIONS:** plan, build, create, design, implement, review, fix, improve, optimize  
**EXAMPLE:** `/ui-ux-pro-max design a confidence banner with 3 color tiers`

### 3. **claude-api** — Anthropic SDK Integration
**TRIGGER WHEN:**
- Code imports `anthropic` or `@anthropic-ai/sdk`
- User asks to use Claude API or Managed Agents (`/v1/agents`, `/v1/sessions`)
- Adding Claude features (prompt caching, structured output, vision, etc.)
**PURPOSE:** Build AI-powered features into the pipeline  
**NEVER FORGET:** This exists when adding LLM features

### 4. **update-config** — Claude Code Configuration
**WHEN:** Setting up automated behaviors  
**REQUIRES:** Hooks in `settings.json`  
**EXAMPLES:** "run tests after commit", "format code before save", "check types on change"  
**AUTOMATED BEHAVIORS:** "from now on when X", "each time X", "whenever X"

### 5. **loop** — Recurring Task Runner
**WHEN:** Polling status, monitoring, or running repeated checks  
**SYNTAX:** `/loop 5m /command` or `/loop 10m /status-check`  
**EXAMPLES:**
- Check CI/CD pipeline every 5 minutes
- Poll deployment status
- Monitor agent execution
- Run type checks repeatedly

---

## Integration with AXONENGINE Guidelines

**Before writing code:** Use `simplify` to ensure no redundancy  
**While building UI:** Use `ui-ux-pro-max` for design consistency  
**Adding agent logic:** Use `claude-api` if calling external models  
**Setting up workflow:** Use `update-config` for hooks, `loop` for monitoring  

**MANDATORY CHECKS BEFORE COMMIT:**
1. Run `simplify` on all code changes
2. Ensure no warnings from TypeScript
3. Verify component matches AXONENGINE specs (AGENTS.md, CLAUDE.md)
4. Confirm all scores show uncertainty ranges & disclaimers present

---

```
<type>: <description>

<body with context if needed>

Fixes #issue-number
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Examples:**
- `feat: add ConfidenceBanner to analysis page`
- `fix: correct MM-GBSA uncertainty range`
- `docs: update AGENTS.md with 22-agent pipeline`

---

## File Organization

```
c:\Projects\HF26-24\
├── AGENTS.md                    # This file: agent architecture
├── CLAUDE.md                    # This file: dev guidelines
├── FRONTEND_UPDATES.md          # Component mapping
├── backend/
│   ├── agents/                  # Agent implementations
│   ├── api/                     # FastAPI routes
│   ├── schemas/                 # Pydantic models
│   └── utils/                   # Caching, helpers
├── frontend/
│   ├── app/
│   │   ├── components/analysis/ # Result visualization
│   │   ├── lib/                 # Types, API calls
│   │   └── hooks/               # Custom hooks
│   └── public/
└── docs/
    ├── AXONENGINE_v4_Master_System_Prompt.md
    └── AXONENGINE_v4_Step_by_Step.md
```

---

## Questions or Clarifications?

When you (Claude) encounter ambiguity:
1. Check AGENTS.md for agent responsibilities
2. Check FRONTEND_UPDATES.md for component specs
3. Refer to JSON structure above for field names
4. Default to caution on disclaimers (better to over-warn)

**Never guess or make up agent behaviors.** Escalate to user if inconsistency found.
