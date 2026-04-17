# 🧬 Drug Discovery AI

> Multi-agent precision medicine pipeline for novel drug discovery — generating molecules, predicting selectivity, matching clinical trials, and persisting discoveries in under 60 seconds.

[![Backend CI](https://github.com/PrakD3/hackfest/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/PrakD3/hackfest/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/PrakD3/hackfest/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/PrakD3/hackfest/actions/workflows/frontend-ci.yml)

---

## 🚀 What This Is

**Drug Discovery AI** is a 18-agent pipeline that takes a gene mutation query (e.g. `EGFR T790M`) and:

1. Parses the mutation with LLM + regex fallback
2. Fetches literature (PubMed), proteins (UniProt), structures (RCSB), compounds (PubChem) in parallel
3. Downloads PDB structures and detects binding pockets (fpocket / centroid fallback)
4. Generates novel molecules via RDKit scaffold hopping + bioisostere SMARTS mutations
5. Docks molecules (Gnina → Vina → AI hash fallback)
6. **Dual-docks vs off-target proteins** to compute selectivity ratio — the key differentiator
7. Screens ADMET (Lipinski + PAINS + toxicophore images)
8. Optimizes leads with scaffold hopping, bioisostere replacement, and fragment growing — building an **evolution tree**
9. Forecasts resistance mutations with LLM
10. Matches **active clinical trials** via ClinicalTrials.gov API v2
11. Builds a knowledge graph and reasoning trace
12. Saves discoveries to **Neon PostgreSQL** and exposes a full REST API

---

## 📁 Project Structure

```
drug-discovery-ai/
├── backend/          # Python 3.11 + FastAPI + 18 agents
│   ├── agents/       # 18 pipeline agents
│   ├── pipeline/     # LangGraph state + orchestrator
│   ├── utils/        # LLM router, DB, ADMET, molecule utils
│   ├── routers/      # FastAPI route handlers
│   ├── data/         # JSON data files (curated profiles, resistance, etc.)
│   └── evaluation/   # Benchmark runner
│
├── frontend/         # Next.js 16 + TypeScript + Tailwind v4
│   └── app/
│       ├── components/   # All UI components (analysis, landing, settings)
│       ├── hooks/        # useSSEStream, useAnalysis, useDiscoveries, useTheme
│       ├── lib/          # api.ts, types.ts, utils.ts, theme.ts
│       ├── analysis/     # [sessionId] analysis page (10 tabs)
│       ├── discoveries/  # Discovery library browser
│       └── settings/     # Theme customizer, pipeline config, API key checker
│
├── .github/
│   └── workflows/    # backend-ci.yml + frontend-ci.yml
├── start.sh          # Unix quick-start
├── start.bat         # Windows quick-start
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- (Optional) AutoDock Vina or Gnina for real docking
- (Optional) fpocket for pocket detection

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in at least GROQ_API_KEY (free at console.groq.com)
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Optional | GPT-4o-mini (primary LLM) |
| `GROQ_API_KEY` | Recommended | Llama 3.3 70B — free at [console.groq.com](https://console.groq.com) |
| `TOGETHER_API_KEY` | Optional | Mistral 7B fallback |
| `NCBI_API_KEY` | Optional | Higher PubMed rate limits |
| `LANGCHAIN_API_KEY` | Optional | LangSmith observability |
| `DATABASE_URL` | Optional | Neon PostgreSQL connection string |
| `AUTO_SAVE_DISCOVERIES` | Optional | Set `true` to auto-persist every run |

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="Drug Discovery AI"
```

---

## 🧪 Tech Stack

### Backend
- **FastAPI** 0.115 + **uvicorn** + SSE streaming
- **LangGraph** 0.2 pipeline orchestration
- **LangSmith** observability (enterprise trace dashboard)
- **RDKit** — molecule generation, ADMET, depiction
- **Multi-LLM fallback**: OpenAI GPT-4o-mini → Groq Llama 3.3 70B → Together Mistral 7B → deterministic template
- **Neon PostgreSQL** via SQLAlchemy asyncio + asyncpg
- External APIs: PubMed, UniProt, RCSB, PubChem, ClinicalTrials.gov

### Frontend
- **Next.js 16** App Router + TypeScript strict
- **Tailwind CSS v4** + amber minimal theme system
- **GSAP 3.12** + ScrollTrigger — hero animations, counter reveals
- **Framer Motion 11** — agent status stagger, 2D/3D crossfade
- **D3.js 7** — knowledge graph force-directed, evolution tree
- **Recharts** — ADMET radar chart, docking score chart
- **shadcn/ui** (Radix primitives) — accessible components
- **NGL** — 3D molecular viewer
- **Biome** — linting + formatting (no ESLint, no Prettier)

---

## 🏆 Win Factor Features

| Feature | Description |
|---------|-------------|
| **Selectivity Ratio** | Dual-docks top leads vs. off-target proteins. `ratio = target / off-target`. `≥3.0` = High selectivity |
| **Evolution Tree** | D3 visualization of how seed molecules transform through scaffold hopping + bioisostere operations |
| **LangSmith Tracing** | Enterprise observability — every agent call, token count, latency, auditable in real time |
| **Clinical Trial Matching** | Live ClinicalTrials.gov API — links discovery to active patient trials |
| **Resistance Forecasting** | LLM predicts which secondary mutations will emerge under treatment pressure |
| **Discovery Database** | Neon PostgreSQL — persists all discoveries, browseable in the Discoveries Library |

---

## 🗣️ Demo Script (Hackathon)

1. *"Meet Sarah. 52 years old. Lung cancer. EGFR T790M. Erlotinib stopped working."*
2. Type `EGFR T790M` → Launch Analysis
3. Watch 18 agents stream live in the PipelineStatus panel
4. **Top Leads tab**: *"Our AI generated molecules that don't exist in any database. This one binds 3.2× harder to the cancer target than to healthy ABL1 kinase."*
5. **Evolution Tree**: *"Here's exactly how the seed molecule was transformed — scaffold hop +1.4 kcal/mol, bioisostere +0.8 kcal/mol."*
6. **Clinical Trials**: *"3 active Phase II trials targeting EGFR T790M. Our molecule targets the same pocket."*
7. Open LangSmith tab: *"Every decision, auditable. Enterprise ready."*
8. Click **Save Discovery** → *"Permanently saved to our Neon database."*

---

## 🛠️ Development

### Lint & Format

```bash
# Backend
cd backend
ruff check .
mypy .

# Frontend
cd frontend
npm run check        # Biome check
npm run check:fix    # Auto-fix
npm run typecheck    # TypeScript
```

### Run Benchmark

```bash
cd backend
python -c "
from evaluation.benchmark_runner import run_benchmark_cases
import asyncio
r = asyncio.run(run_benchmark_cases())
print(f'Accuracy: {r[\"accuracy\"]*100:.0f}%')
"
```

### Verify SelectivityAgent

```bash
cd backend
python -c "
from agents.SelectivityAgent import SelectivityAgent
import asyncio
r = asyncio.run(SelectivityAgent().run({
    'docking_results': [{'smiles': 'CC(=O)Nc1ccc(O)cc1', 'binding_energy': -8.5, 'compound_name': 'Test'}],
    'mutation_context': {'gene': 'EGFR'},
    'analysis_plan': type('P', (), {'run_selectivity': True})(),
}))
print('SelectivityAgent OK:', r['selectivity_results'][0]['selectivity_label'])
"
```

---

## 🌿 Git Branches

| Branch | Owner | Scope |
|--------|-------|-------|
| `main` | — | Protected. Merge via PR only |
| `feature/backend-agents` | Backend dev | Python agents, pipeline, bioinformatics |
| `feature/frontend-ui` | Frontend dev | Next.js pages, components, GSAP |
| `feature/testing-validation` | QA dev | Pytest, benchmark, E2E validation |

---

## 📄 License

MIT — built for a hackathon. Not for clinical use. All results are computational predictions only.