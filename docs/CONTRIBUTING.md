# 🧬 Contributing — Drug Discovery AI (HF26-24)

> Hackathon team guide. Read this before touching any file.

---

## Team Branches

| Branch | Owner | Focus |
|---|---|---|
| `feat/frontend-ui` | **You** | Frontend (pages, components, UI polish) + light backend wiring |
| `feat/backend-bio` | **Friend 1** | Backend agents, bio pipeline, data files, API endpoints |
| `feat/qa-testing` | **Friend 2** | Testing, issues, bug reports, smoke tests, benchmarks |

> All branches are cut from `master` at the same commit. Open a PR into `master` when your work is ready to merge.

---

## Quick Start

### 1. Clone & branch

```bash
git clone https://github.com/hackfest-dev/HF26-24.git
cd HF26-24

# Pick YOUR branch:
git checkout feat/frontend-ui     # if you're on frontend
git checkout feat/backend-bio     # if you're on backend/bio
git checkout feat/qa-testing      # if you're on testing
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/api/health` → `{"status":"ok","version":"3.0.0"}`

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev   # http://localhost:3000
```

---

## Branch Responsibilities

### `feat/frontend-ui` — You

**Goal:** Make the UI production-ready and visually impressive for the demo.

**Files you own:**
- `frontend/app/` — all pages and components
- `frontend/app/components/analysis/` — molecule cards, charts, panels
- `frontend/app/components/landing/` — hero, feature grid, stats bar
- `frontend/app/components/settings/` — theme, pipeline, API key pages
- `frontend/app/components/ui/` — primitive components
- `frontend/app/hooks/` — `useAnalysis`, `useSSEStream`, `useTheme`, etc.
- `frontend/app/lib/` — `api.ts`, `types.ts`, `theme.ts`
- Light backend wiring: `routers/analysis.py`, `routers/stream.py` (SSE endpoint tweaks)

**Key tasks:**
- [ ] Polish the landing page hero section (GSAP animations)
- [ ] Wire `QueryInput` → `startAnalysis()` → redirect to `/analysis/[sessionId]`
- [ ] Real-time SSE progress in `PipelineStatus` during analysis
- [ ] `EvolutionTree` D3 visualization (nodes + edges)
- [ ] `KnowledgeGraph` D3 force-directed graph
- [ ] `MoleculeViewer3D` NGL integration (with PDB path fallback)
- [ ] `discoveries/page.tsx` — searchable table with delete + navigation
- [ ] Make `ThemeCustomizer` apply changes live via CSS variables
- [ ] Responsive layout — mobile must not break

**Commands:**
```bash
cd frontend
npm run dev          # local dev
npm run check        # Biome lint (zero errors required)
npm run build        # must pass before PR
npm run typecheck    # tsc --noEmit
```

---

### `feat/backend-bio` — Friend 1

**Goal:** Ensure all 18 agents run correctly end-to-end, improve bio accuracy, and fill in any fallback gaps.

**Files you own:**
- `backend/agents/` — all 18 agent files
- `backend/pipeline/` — `graph.py`, `state.py`, `planner.py`
- `backend/utils/` — `llm_router.py`, `db.py`, `admet_utils.py`, `molecule_utils.py`, `pocket_detection.py`, `toxicophore_highlight.py`, `pains_filter.py`
- `backend/data/` — JSON data files (mutation resistance, curated profiles, off-target proteins, benchmark cases)
- `backend/routers/` — `discoveries.py`, `themes.py`, `molecules.py`, `export.py`, `benchmark.py`
- `backend/evaluation/` — `benchmark_runner.py`

**Key tasks:**
- [ ] Verify all 18 agents import and run without error
- [ ] Full pipeline smoke test: `EGFR T790M` in lite mode must return ranked leads
- [ ] `SelectivityAgent` — dual-docking fallback working (hash-based if Vina unavailable)
- [ ] `ClinicalTrialAgent` — ClinicalTrials.gov API call + graceful fallback
- [ ] `ReportAgent` — DB save to Neon PostgreSQL (configure `DATABASE_URL` in `.env`)
- [ ] `utils/db.py` — `init_db()` creates tables without error
- [ ] `data/off_target_proteins.json` — at minimum EGFR, HIV, BRCA1, TP53, DEFAULT entries
- [ ] `data/curated_profiles.json` — HIV, BRCA1, EGFR, TP53 bypass live API calls
- [ ] `LLMRouter` — 4-tier fallback (OpenAI → Groq → Together → template) tested
- [ ] Benchmark runner: ≥7/10 accuracy on `benchmark_cases.json`

**Commands:**
```bash
cd backend

# Verify imports
python -c "from agents.OrchestratorAgent import OrchestratorAgent; print('OK')"
python -c "from utils.db import init_db; import asyncio; asyncio.run(init_db()); print('DB OK')"

# Full pipeline test (lite mode)
python -c "
from agents.OrchestratorAgent import OrchestratorAgent
import asyncio
r = asyncio.run(OrchestratorAgent().run_pipeline('EGFR T790M', 'test-v3', 'lite'))
assert 'final_report' in r
assert len(r['final_report']['ranked_leads']) > 0
print('PASS. Lead:', r['final_report']['ranked_leads'][0]['smiles'])
"

# Start server
uvicorn main:app --reload
```

---

### `feat/qa-testing` — Friend 2

**Goal:** Find bugs, write tests, raise issues, and verify the pipeline is demo-ready.

**Files you own:**
- `backend/evaluation/benchmark_runner.py` — extend with new test cases
- Any new files under `backend/tests/` (create this directory)
- GitHub Issues — raise bugs with reproduction steps
- `.github/workflows/` — CI fix or improve if needed

**Key tasks:**
- [ ] Run the full verification checklist from `HACKATHON_BUILD_PROMPT_V3.md` Part 13
- [ ] Test each API endpoint with `curl` or a REST client
- [ ] Test SSE stream: `curl -N http://localhost:8000/api/stream/{session_id}`
- [ ] Run `npm run check` — report any Biome errors
- [ ] Run `npm run build` — report any TypeScript errors
- [ ] Run backend imports — report any missing dependencies
- [ ] Raise GitHub Issues for anything broken (see issue template below)
- [ ] Test the 4 demo queries: `EGFR T790M`, `HIV K103N`, `BRCA1 5382insC`, `TP53 R248W`
- [ ] Verify `/api/health` → `{"status":"ok","version":"3.0.0"}`
- [ ] Verify `/api/discoveries` → empty list (not a 500)
- [ ] Write `backend/tests/test_agents.py` — pytest for SelectivityAgent + ClinicalTrialAgent
- [ ] Write `backend/tests/test_api.py` — pytest for all API endpoints

**Issue template (use this format when raising GitHub Issues):**
```
**Component:** [Backend / Frontend / Agent: XYZAgent]
**Severity:** [Critical / High / Medium / Low]
**Steps to reproduce:**
1. ...
2. ...
**Expected:** ...
**Actual:** ...
**Logs / error:**
```
(paste here)
```
```

**Commands:**
```bash
# Backend health
curl http://localhost:8000/api/health
curl http://localhost:8000/api/discoveries
curl http://localhost:8000/api/system-status

# Frontend lint + build
cd frontend
npm run check
npm run build
npm run typecheck

# Python tests (once test files are created)
cd backend
pytest tests/ -v

# Benchmark
cd backend
python evaluation/benchmark_runner.py
```

---

## Git Workflow

```bash
# Commit format: type(scope): description
git add -A
git commit -m "feat(frontend): add evolution tree D3 visualization"
git push origin feat/frontend-ui   # use your branch name
```

**Commit types:**
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code cleanup (no behaviour change)
- `test` — adding tests
- `docs` — documentation only
- `chore` — build scripts, deps, CI

**PR rules:**
- Target branch: `master`
- Title: same format as commit (`feat(scope): description`)
- Must: `npm run build` passes + no Python import errors
- Tag your PR with: `frontend`, `backend`, or `testing`

---

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in:

| Variable | Required | Where to get |
|---|---|---|
| `OPENAI_API_KEY` | Recommended | platform.openai.com |
| `GROQ_API_KEY` | Fallback | console.groq.com |
| `TOGETHER_API_KEY` | Fallback | api.together.xyz |
| `NCBI_API_KEY` | Optional | ncbi.nlm.nih.gov |
| `LANGSMITH_API_KEY` | Optional | smith.langchain.com |
| `DATABASE_URL` | For DB features | neon.tech (free tier) |

> The pipeline works without any keys using deterministic fallbacks. Keys just make it smarter.

Copy `frontend/.env.local.example` → `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Project Structure at a Glance

```
HF26-24/
├── backend/
│   ├── agents/          ← 18 AI agents (backend friend's domain)
│   ├── pipeline/        ← LangGraph DAG (backend friend's domain)
│   ├── routers/         ← FastAPI endpoints
│   ├── utils/           ← LLM router, DB, ADMET, molecule utils
│   └── data/            ← JSON data files
│
└── frontend/
    └── app/
        ├── page.tsx                     ← Landing page (your domain)
        ├── analysis/[sessionId]/        ← Main results page (your domain)
        ├── discoveries/                 ← Discovery browser (your domain)
        ├── settings/                    ← Settings (your domain)
        ├── components/
        │   ├── ui/                      ← Primitive components
        │   ├── layout/                  ← Header, Footer
        │   ├── analysis/                ← All analysis view components
        │   ├── landing/                 ← Landing page sections
        │   └── settings/                ← Settings panels
        ├── hooks/                       ← useSSEStream, useAnalysis, etc.
        └── lib/                         ← api.ts, types.ts, theme.ts
```

---

## Demo Queries (for testing)

| Query | Tests |
|---|---|
| `EGFR T790M` | Curated profile bypass, known active site, selectivity |
| `HIV K103N` | UniProt organism override, resistance rules |
| `BRCA1 5382insC` | Insertion mutation parsing, structure fallback |
| `TP53 R248W` | Hotspot mutation, clinical trial matching |

---

*Good luck! Build fast, test often, commit everything.* 🚀