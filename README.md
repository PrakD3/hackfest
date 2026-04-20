# AXONENGINE v4

> **Precision Medicine & Drug Discovery Pipeline**
> A 22-agent AI orchestrator for novel lead discovery, synthesis planning, and clinical validation.

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)

---

## Overview

**AXONENGINE v4** is an enterprise-grade drug discovery pipeline designed to identify, optimize, and validate therapeutic candidates for specific protein mutations (e.g., `EGFR T790M`). 

The system leverages a hierarchical 22-agent architecture to move from mutation parsing to synthesis-ready lead compounds in as little as 90 seconds (standard) to 6 hours (with full Molecular Dynamics validation).

### System Architecture

```mermaid
graph TD
    %% Global Styling
    classDef acquisition fill:#eff6ff,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    classDef analysis fill:#fefce8,stroke:#a16207,stroke-width:2px,color:#713f12
    classDef design fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
    classDef validation fill:#fef2f2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef context fill:#f5f3ff,stroke:#6d28d9,stroke-width:2px,color:#4c1d95
    classDef output fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef start_end fill:#f8fafc,stroke:#334155,stroke-width:2px,color:#0f172a

    Start([Mutation Query]):::start_end --> Stage1[Stage 1: Multi-Source Acquisition]:::acquisition
    
    subgraph S1 [Agents 1-6]
        Stage1 --> Parser[Mutation Parser]:::acquisition
        Parser --> Planner[Query Orchestrator]:::acquisition
        Planner --> Fetch[PubMed + UniProt + RCSB + PubChem]:::acquisition
    end

    Fetch --> Stage2[Stage 2: Structural Modeling]:::analysis
    
    subgraph S2 [Agents 7-9]
        Stage2 --> ESMF[ESMFold / Protein Prep]:::analysis
        ESMF --> ESM1v[ESM-1v Pathogenicity]:::analysis
        ESM1v --> Pock[fpocket Delta Analysis]:::analysis
    end

    Pock --> Stage3[Stage 3: Generative Design]:::design
    
    subgraph S3 [Agents 10-14]
        Stage3 --> MGen[Pocket2Mol Generative]:::design
        MGen --> Dock[Vina / Gnina Docking]:::design
        Dock --> Select[Selectivity Dual-Docking Filter]:::design
        Select --> Opti[Bioisostere Optimization]:::design
    end

    Opti --> Stage4[Stage 4: Validation & Physics]:::validation
    
    subgraph S4 [Agents 15-17]
        Stage4 --> GNN[DimeNet++ GNN Filter]:::validation
        GNN -- "Top 2 Leads Only" --> MDVal[OpenMM 50ns MD]:::validation
        MDVal --> Resist[Resistance Forecasting]:::validation
    end

    Resist --> Stage5[Stage 5: Clinical Alignment]:::context
    
    subgraph S5 [Agents 18-20]
        Stage5 --> Trial[ClinicalTrials.gov V2]:::context
        Trial --> Lit[Knowledge Graph Assembly]:::context
    end

    Lit --> Stage6[Stage 6: Final Synthesis]:::output
    
    subgraph S6 [Agents 21-22]
        Stage6 --> ASK[ASKCOS Retrosynthesis]:::output
        ASK --> Rep[Enterprise Report Generation]:::output
    end

    Rep --> End([Final Drug Report]):::start_end
```

### Key Metrics & Precision
- **Affinity Scoring**: Multi-method validation using Vina, Gnina CNN, DimeNet++ GNN, and MM-GBSA.
- **Confidence Tiers**: Grounded in pLDDT and ESM-1v scores (WELL_KNOWN, PARTIAL, NOVEL).
- **Stability Labels**: Ranked by RMSD trajectories from 50ns MD simulations.
- **Selectivity**: Dual-docking against 10+ off-target proteins to ensure therapeutic windows.

---

## Technical Differentiation

### Intelligent Lead Filtration (The Funnel)
The pipeline employs a sophisticated filtration funnel to optimize computational resources while maintaining maximum empirical rigor:
1.  **Scaffold Hopping**: Generates ~150 candidates using RDKit-driven bioisostere replacements and 3D diffusion.
2.  **GNN Pre-Selection**: Utilizes a **DimeNet++ GNN** to filter the top 30 leads down to exactly **two high-confidence finalists**.
3.  **Molecular Dynamics**: Performs 50ns **OpenMM simulations** on finalists only, calculating precise MM-GBSA binding free energies (ΔG) and RMSD stability.

### Selectivity & Toxicity Benchmarking
AXONENGINE dual-docks top leads against a panel of 10+ off-target proteins. This computes a **Selectivity Ratio** (Target Affinity / Off-target Affinity), identifying potential side-effects and ensuring a wide therapeutic window early in the discovery phase.

### Retrosynthetic Feasibility
Every discovered lead is validated through **ASKCOS** retrosynthesis planning. Candidates are scored by **Synthetic Accessibility (SA)** and mapped to specific reagents and steps, ensuring that the top leads are practical for experimental synthesis.

---

## The 22-Agent Architecture

The pipeline is organized into 10 specialized stages, each managed by autonomous agents.

| Stage | Mission | Agents |
|:---:|---|---|
| **1** | **Data Acquisition** | MutationParser, Planner, FetchAgents |
| **2-3**| **Structure & Variant** | StructurePrep (ESMFold), VariantEffect (ESM-1v), PocketDetection |
| **4-5**| **Design & Docking** | MoleculeGen (Pocket2Mol), Docking (Gnina/Vina), Selectivity, ADMET |
| **6-7**| **Ranking & Validation**| GNNAffinity (DimeNet++), MDValidation (OpenMM), Resistance Forecasting |
| **8-9**| **Context Analysis** | SimilaritySearch, SynergyAgent, ClinicalTrialAgent |
| **10** | **Output Generation** | SynthesisAgent (ASKCOS), ReportAgent |

---

## Quick Start (Enterprise Setup)

The project includes a comprehensive automation script that handles system-level dependencies including Miniconda, Python 3.11, AutoDock Vina, and Node.js.

### 1. One-Command Setup & Launch
```bash
./start.sh
```
*This script automatically detects missing dependencies, installs Miniconda if needed, creates the environment, and launches both frontend and backend.*

### 2. Manual Prerequisites
- **OS**: Linux (preferred) or macOS.
- **Conda**: Miniconda3 recommended.
- **Node.js**: v20 or later.
- **Bio-Tools**: AutoDock Vina, fpocket, Open Babel (automated via setup script).

---

## Project Architecture

```text
axonengine/
├── backend/            # FastAPI + LangGraph Orchestrator
│   ├── agents/         # 22 Pipeline Agents
│   ├── pipeline/       # LangGraph state machine
│   ├── tests/          # Stress & Validation suites
│   └── data/           # Cache & Structure storage
├── frontend/           # Next.js 16 + Tailwind v4 + GSAP
│   ├── app/            # Feature-first routing
│   ├── components/     # Analysis, 3D Mol, & GNN Visuals
│   └── lib/            # SSE streaming & API hooks
├── tools/              # (Auto-generated) Local Miniconda & Binaries
└── docs/               # Technical specifications & Architecture
```

---

## Environment Configuration

### Backend (backend/.env)
| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | Primary reasoning (GPT-4o) |
| `GROQ_API_KEY` | Recommended | Fast Llama 3.3 orchestration |
| `DATABASE_URL` | Optional | Persistent discovery library (Neon/Postgres) |

---

## Enterprise Standards

- **Observability**: Fully integrated with **LangSmith** for real-time agent tracing and audit logs.
- **Predictive Reliability**: All scores include uncertainty ranges (e.g., `-9.1 ± 1.2 kcal/mol`).
- **Safety Protocols**: No clinical claims. Predictive outputs only. Mandatory disclaimers on all reports.
- **Scalability**: Async SSE streaming for real-time pipeline progress updates.

---

## License

MIT — **Computational Predictions Only.** Experimental synthesis and binding validation required before biological testing.

**Notice: Not for clinical use.**