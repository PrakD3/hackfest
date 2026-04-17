# FRONTEND ARCHITECTURE v4.0 — Complete Backend-to-Frontend Mapping

**Purpose:** Frontend displays EVERYTHING the backend produces, with real-time updates and comprehensive visualizations.

## Quick Start

```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

## Technology Stack

- **Framework:** Next.js 14+ with React 18+
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Context + hooks
- **Real-time:** Server-Sent Events (SSE)
- **API:** Fetch API (native)
- **Charts:** Recharts (timelines, line graphs, bar charts)
- **3D:** Three.js (protein structures)
- **Tables:** shadcn/ui DataTable for molecule ranking

---

## Backend-to-Frontend Mapping: What to Display

### **Stage 1: Data Acquisition**

**Backend Outputs:**
- `mutation_context`: { gene, position, wt_aa, mut_aa }
- `proteins`: [{ name, sequence, uniprot_id }]
- `known_inhibitors`: [{ smiles, compound_name, affinity }]
- `pdb_id`: "1M17"

**Frontend Display:**
```typescript
<div className="grid grid-cols-2 gap-4">
  <InfoCard label="Gene" value={state.gene} />
  <InfoCard label="Position" value={state.position} />
  <InfoCard label="Wild-type AA" value={state.wt_aa} />
  <InfoCard label="Mutant AA" value={state.mut_aa} />
  <InfoCard label="PDB ID" value={state.pdb_id} />
  <InfoCard label="Proteins Found" value={state.proteins?.length} />
</div>
```

---

### **Stage 2-3: Structure & Variant Analysis**

**Backend Outputs:**
- `plddt`: 92.3 (confidence score)
- `esm1v_score`: 0.85 (pathogenicity 0-1)
- `esm1v_confidence`: "PATHOGENIC" | "UNCERTAIN" | "BENIGN"
- `pocket_delta`: { volume_delta, hydrophobicity_delta, polarity_delta, charge_delta }
- `pdb_content`: "ATOM 1 N..." (PDB file content)

**Frontend Display (Confidence Banner):**
```typescript
<ConfidenceBanner>
  <div className="flex items-center gap-4">
    {/* Tier Badge */}
    <div className={`px-4 py-2 rounded font-bold ${
      esm1v_confidence === 'PATHOGENIC' ? 'bg-red-500' :
      esm1v_confidence === 'UNCERTAIN' ? 'bg-amber-500' :
      'bg-green-500'
    }`}>
      {esm1v_confidence}
    </div>
    
    {/* Scores */}
    <div>
      <div>pLDDT: <strong>{plddt}</strong></div>
      <div>ESM-1v: <strong>{esm1v_score.toFixed(2)}</strong></div>
    </div>
  </div>
</ConfidenceBanner>
```

**Pocket Geometry Display (Interactive Card):**
```typescript
<PocketGeometryCard>
  <Table>
    <tr>
      <td>Pocket Volume Change</td>
      <td className={pocket_delta.volume_delta > 0 ? 'text-green-500' : 'text-red-500'}>
        {pocket_delta.volume_delta.toFixed(2)} Ų
      </td>
    </tr>
    <tr>
      <td>Hydrophobicity Delta</td>
      <td>{pocket_delta.hydrophobicity_delta.toFixed(3)}</td>
    </tr>
    <tr>
      <td>Polarity Delta</td>
      <td>{pocket_delta.polarity_delta.toFixed(3)}</td>
    </tr>
    <tr>
      <td>Charge Delta</td>
      <td>{pocket_delta.charge_delta.toFixed(3)}</td>
    </tr>
  </Table>
</PocketGeometryCard>
```

**3D Protein Structure (Three.js):**
```typescript
<ProteinViewer3D 
  pdbContent={pdb_content}
  highlightMutation={{ position, wt_aa, mut_aa }}
  highlightPocket={pocket_delta}
/>
```

---

### **Stage 4-5: Molecule Design & Docking**

**Backend Outputs (per molecule):**
```json
{
  "smiles": "CC(C)Cc1ccc(cc1)[C@H](C)C(O)=O",
  "compound_name": "AXO-001",
  "docking_affinity": -8.5,
  "docking_affinity_uncertainty": 2.0,
  "selectivity_ratio": 3.4,
  "admet_score": 9,
  "admet_pass": true,
  "admet_details": {
    "lipinski_violations": 0,
    "pains_alerts": [],
    "herg_risk": "low",
    "cyp_metabolism": "moderate"
  },
  "rank": 1
}
```

**Frontend Display: Molecule Card (Grid of Top 30)**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {molecules.map(mol => (
    <MoleculeCard key={mol.smiles}>
      {/* 2D Structure */}
      <MoleculeStructure smiles={mol.smiles} />
      
      {/* Metrics */}
      <div className="space-y-2 text-sm">
        <div className="font-semibold">{mol.compound_name}</div>
        <MetricRow 
          label="Affinity" 
          value={`${mol.docking_affinity.toFixed(1)} ± ${mol.docking_affinity_uncertainty} kcal/mol`}
          color={mol.docking_affinity < -9 ? 'green' : 'amber'}
        />
        <MetricRow 
          label="Selectivity" 
          value={`${mol.selectivity_ratio.toFixed(1)}×`}
        />
        <MetricRow 
          label="ADMET" 
          value={`${mol.admet_score}/10`}
          badge={mol.admet_pass ? 'PASS' : 'FAIL'}
        />
      </div>
      
      {/* ADMET Details Expandable */}
      <Collapsible>
        <CollapsibleTrigger>ADMET Details</CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="text-xs space-y-1">
            <li>Lipinski: {mol.admet_details.lipinski_violations} violations</li>
            <li>PAINS: {mol.admet_details.pains_alerts.length} alerts</li>
            <li>hERG: {mol.admet_details.herg_risk}</li>
            <li>CYP450: {mol.admet_details.cyp_metabolism}</li>
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </MoleculeCard>
  ))}
</div>
```

---

### **Stage 6-7: Ranking & Validation**

**Backend Outputs (GNN Ranking):**
```json
{
  "affinity_gnn": -9.1,
  "gnn_uncertainty": 1.2,
  "gnn_rank": 1,
  "docking_affinity": -8.5,
  "gnina_affinity": -8.7
}
```

**Frontend Display: Affinity Comparison Chart**
```typescript
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={molecules}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="compound_name" />
    <YAxis label={{ value: 'ΔG (kcal/mol)', angle: -90, position: 'insideLeft' }} />
    <Tooltip formatter={(value) => `${value.toFixed(2)} kcal/mol`} />
    <Legend />
    <Bar dataKey="docking_affinity" fill="#8884d8" name="Vina" />
    <Bar dataKey="gnina_affinity" fill="#82ca9d" name="Gnina" />
    <Bar dataKey="affinity_gnn" fill="#ffc658" name="GNN" />
    <ErrorBar dataKey="gnn_uncertainty" width={4} stroke="#ff7300" />
  </BarChart>
</ResponsiveContainer>
```

**Top 2 Finalists Highlight:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-2 border-blue-500 p-4 rounded-lg">
  <h3 className="col-span-full text-xl font-bold text-blue-500">🎯 MD Validation Finalists</h3>
  {top_2.map((mol, i) => (
    <FinalistCard key={i}>
      <div className="text-2xl font-bold text-blue-500">#{i+1}</div>
      <MoleculeStructure smiles={mol.smiles} />
      <div className="font-semibold">{mol.compound_name}</div>
      <div className="text-lg font-bold">{mol.affinity_gnn.toFixed(1)} kcal/mol</div>
      <div className="text-xs text-slate-400">±{mol.gnn_uncertainty} (DimeNet++)</div>
    </FinalistCard>
  ))}
</div>
```

**MD Validation Results:**
```json
{
  "rmsd_mean": 1.5,
  "rmsd_trajectory": [0.8, 0.95, 1.1, 1.25, 1.4, ...],
  "stability_label": "STABLE",
  "mmgbsa_dg": -8.3,
  "mmgbsa_uncertainty": 0.5,
  "binding_frame_fraction": 0.95,
  "native_contact_retention": 0.88
}
```

**Frontend Display: MD Results Tabs**
```typescript
<Tabs defaultValue="rmsd">
  {/* RMSD Trajectory Chart */}
  <TabsContent value="rmsd">
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rmsd_trajectory}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis label={{ value: 'Frame', position: 'insideRight', offset: -5 }} />
        <YAxis label={{ value: 'RMSD (Ų)', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value) => `${value.toFixed(2)} Ų`} />
        <Line 
          type="monotone" 
          dataKey="rmsd" 
          stroke="#3b82f6"
          dot={false}
          strokeWidth={2}
        />
        <ReferenceLine 
          y={2.0} 
          stroke="#22c55e" 
          label="Stable Threshold"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  </TabsContent>
  
  {/* Stability Label */}
  <TabsContent value="stability">
    <div className={`p-6 rounded-lg text-white font-bold text-2xl ${
      stability_label === 'STABLE' ? 'bg-green-600' :
      stability_label === 'BORDERLINE' ? 'bg-amber-600' :
      'bg-red-600'
    }`}>
      {stability_label}: {rmsd_mean.toFixed(2)} ± 0.3 Ų
    </div>
    <div className="mt-4 space-y-2">
      <div>Binding Frame Fraction: <strong>{(binding_frame_fraction * 100).toFixed(0)}%</strong></div>
      <div>Native Contact Retention: <strong>{(native_contact_retention * 100).toFixed(0)}%</strong></div>
      <div>MM-GBSA ΔG: <strong>{mmgbsa_dg.toFixed(2)} ± {mmgbsa_uncertainty} kcal/mol</strong></div>
    </div>
  </TabsContent>
</Tabs>
```

---

### **Stage 8-9: Context Analysis**

**Backend Outputs:**
```json
{
  "similarity_to_known": 0.72,
  "known_inhibitor_analogs": ["Erlotinib", "Gefitinib"],
  "clinical_trials": [
    {
      "trial_id": "NCT04123456",
      "title": "Phase II EGFR T790M",
      "status": "RECRUITING",
      "phase": "Phase 2",
      "interventions": ["AZD9291"],
      "url": "https://clinicaltrials.gov/..."
    }
  ],
  "synergistic_partners": [
    { "target": "MET", "mechanism": "bypass resistance" }
  ]
}
```

**Frontend Display: Clinical Trials Table**
```typescript
<TabsContent value="trials">
  <DataTable
    columns={[
      { accessorKey: "trial_id", header: "Trial ID" },
      { accessorKey: "title", header: "Title" },
      { accessorKey: "phase", header: "Phase" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={
            row.original.status === 'RECRUITING' ? 'bg-green-600' :
            row.original.status === 'ACTIVE_NOT_RECRUITING' ? 'bg-amber-600' :
            'bg-slate-600'
          }>
            {row.original.status}
          </Badge>
        )
      },
      {
        accessorKey: "url",
        header: "Link",
        cell: ({ row }) => (
          <a href={row.original.url} target="_blank" className="text-blue-500 hover:underline">
            View
          </a>
        )
      }
    ]}
    data={clinical_trials}
  />
</TabsContent>
```

---

### **Stage 10: Synthesis & Report**

**Backend Outputs (per molecule):**
```json
{
  "sa_score": 4.2,
  "sa_category": "moderate",
  "estimated_steps": 5,
  "cost_estimate": "$750 (moderate)",
  "reactions": [
    {
      "step": 1,
      "reaction_type": "Coupling reaction",
      "precursors": ["Precursor_1_A", "Precursor_1_B"],
      "conditions": "Pd catalyst, base, solvent"
    }
  ],
  "synthetic_route_summary": "5-step synthesis, SA score 4.2 (moderate)"
}
```

**Frontend Display: Synthesis Route**
```typescript
<TabsContent value="synthesis">
  <div className="space-y-4">
    {/* SA Score Badge */}
    <div className="flex items-center gap-4">
      <div className="text-lg font-bold">Synthetic Accessibility (SA):</div>
      <div className={`px-4 py-2 rounded font-bold text-white ${
        sa_score < 3 ? 'bg-green-600' :
        sa_score < 6 ? 'bg-amber-600' :
        'bg-red-600'
      }`}>
        {sa_score.toFixed(1)} ({sa_category})
      </div>
    </div>
    
    {/* Cost & Steps */}
    <div className="grid grid-cols-2 gap-4">
      <InfoCard label="Estimated Steps" value={estimated_steps} />
      <InfoCard label="Cost Estimate" value={cost_estimate} />
    </div>
    
    {/* Reaction Steps Timeline */}
    <div className="space-y-3">
      <h4 className="font-bold">Synthesis Steps:</h4>
      {reactions.map((rxn, i) => (
        <div key={i} className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
              {rxn.step}
            </div>
            <div>
              <div className="font-bold">{rxn.reaction_type}</div>
              <div className="text-sm text-slate-400">Precursors: {rxn.precursors.join(', ')}</div>
              <div className="text-sm text-slate-400">Conditions: {rxn.conditions}</div>
            </div>
          </div>
          {i < reactions.length - 1 && <div className="text-center py-2">↓</div>}
        </div>
      ))}
    </div>
  </div>
</TabsContent>
```

---

### **Real-time Monitoring: Execution Timeline**

**Backend Outputs:**
```json
{
  "execution_time_ms": 345000,
  "agent_timings": {
    "MutationParserAgent": 50,
    "StructurePrepAgent": 12000,
    "DockingAgent": 85000,
    "GNNAffinityAgent": 45000,
    ...
  },
  "agent_statuses": {
    "MutationParserAgent": "COMPLETE",
    "DockingAgent": "RUNNING",
    ...
  }
}
```

**Frontend Display: Real-time Progress Timeline**
```typescript
<ResponsiveContainer width="100%" height={400}>
  <BarChart 
    data={Object.entries(agent_timings).map(([agent, time]) => ({
      agent: agent.replace('Agent', ''),
      time: time / 1000,  // Convert to seconds
      status: agent_statuses[agent + 'Agent']
    }))}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="agent" angle={-45} textAnchor="end" height={100} />
    <YAxis label={{ value: 'Time (s)', angle: -90, position: 'insideLeft' }} />
    <Tooltip formatter={(value) => `${value.toFixed(2)}s`} />
    <Bar 
      dataKey="time" 
      fill="#3b82f6"
      shape={({ x, y, width, height, payload }) => (
        <g>
          <rect x={x} y={y} width={width} height={height} fill={
            payload.status === 'COMPLETE' ? '#22c55e' :
            payload.status === 'RUNNING' ? '#3b82f6' :
            payload.status === 'FAILED' ? '#ef4444' :
            '#94a3b8'
          } />
        </g>
      )}
    />
  </BarChart>
</ResponsiveContainer>

{/* Total execution time */}
<div className="mt-4 p-4 bg-slate-700 rounded-lg">
  <div className="text-sm text-slate-400">Total Execution Time</div>
  <div className="text-2xl font-bold">{(execution_time_ms / 1000).toFixed(1)}s</div>
</div>
```

---

## Pages

### 1. Home Page (/)
- **Header:** Hero section with mutation input
- **Search Form:** Gene + position + AA mutation fields
- **Example Queries:** Preset buttons (EGFR T790M, BRAF V600E, etc.)
- **Features Overview:** Cards showing pipeline capabilities
- **Recent Discoveries:** Quick access to past queries

### 2. Analysis Progress (/analysis/[sessionId])
**Real-time Progress Dashboard:**
- **Progress Bar:** 0-100% with time elapsed
- **Agent Grid:** 19 agent status cards (PENDING → RUNNING → COMPLETE/FAILED)
- **Event Log:** Scrollable stream of agent events (JSON formatted)
- **Timing Chart:** Bar chart showing agent execution times (updates in real-time)
- **Current Stage:** Large badge showing current pipeline stage
- **Auto-Redirect:** When pipeline_complete event received, redirect to `/results/[sessionId]`

### 3. Results Report (/results/[sessionId])

**Main Layout:**
- **Top Banner:** Disclaimer + confidence tier + execution metrics
- **Tab Navigation:** 13 tabs with icons
- **Export Panel:** Download buttons (top-right)

**Tabs:**
1. **Overview** - Summary, execution time, agent count, error summary
2. **Leads** - Top 2 finalists with comparison cards
3. **Affinity** - GNN ranking chart + comparison table
4. **Pocket** - Binding pocket geometry (delta analysis)
5. **Selectivity** - Off-target selectivity heatmap + bar chart
6. **ADMET** - Drug-likeness radar chart + detail table
7. **MD** - RMSD trajectory chart + stability label + binding retention %
8. **Synthesis** - Reaction steps timeline + SA score badge
9. **Trials** - Clinical trials searchable table
10. **Timing** - Agent execution timeline chart (shows all 19 agents)
11. **Structure** - 3D protein viewer (Three.js)
12. **Analysis** - Full JSON inspection view
13. **Export** - Download JSON, PDF, CSV

### 4. Discoveries (/discoveries)
- **Search Bar:** Filter by mutation, gene, date
- **List/Grid Toggle:** View as list or card grid
- **Cards Display:**
  - Query name
  - Date created
  - Top lead affinity
  - Execution time
  - Confidence tier badge
  - Action buttons (View, Delete, Export)
- **Pagination:** 10 per page with load more

---

## API Integration

### Endpoints

```bash
POST /api/analyze
→ { session_id, status }

GET /api/stream/{session_id}
→ SSE: pipeline_start, agent_start, agent_complete, pipeline_complete

GET /api/session/{session_id}
→ Full results

GET /api/discoveries
→ [{ id, query, created_at }...]

GET /api/discoveries/{id}
→ Complete discovery

GET /api/export/{id}?format=json|pdf|csv
→ File download
```

## Real-time SSE Streaming

Hook: `useSSEStream(sessionId)`

```typescript
const { events, isComplete, progress } = useSSEStream(sessionId)

// events = [
//   { event: "pipeline_start" },
//   { event: "agent_start", agent: "...", progress: 5 },
//   { event: "agent_complete", agent: "...", data: {...} },
//   { event: "pipeline_complete", data: {...all_results...} }
// ]
```

## Component Structure

```
components/
├── Navbar.tsx              # Top nav + theme toggle
├── SearchForm.tsx          # Mutation input form
├── PipelineProgress.tsx    # Progress indicator + agent grid
├── ResultsTabs.tsx         # Tab navigation
├── MoleculeCard.tsx        # Lead compound display
├── ProteinViewer3D.tsx     # 3D protein (Three.js)
├── ClinicalTrialsList.tsx  # Trials table
├── SynthesisRoute.tsx      # Retrosynthesis steps
└── ExportButton.tsx        # Download options
```

## Hooks

- `useAnalysis(query)` - Trigger pipeline
- `useSSEStream(sessionId)` - Stream events
- `useDiscoveries()` - Fetch saved discoveries
- `useSessionHistory(sessionId)` - Get session state
- `useTheme()` - Dark/light mode

## Results Display Format

Each result shows:

```json
{
  "affinity": "-9.1 ± 1.2 kcal/mol (GNN)",
  "selectivity": "3.4-fold",
  "admet_score": 9,
  "rmsd": "1.5 ± 0.3 Å (STABLE)",
  "sa_score": "4.2 (moderate)",
  "synthesis_steps": 5,
  "cost_estimate": "$750 (moderate)",
  "smiles": "CC(C)Nc1nccc(...)..."
}
```

All scores include uncertainty ranges & method labels.

## UI/UX

### Colors (Dark Theme)
- Background: #0f172a (slate-900)
- Surface: #1e293b (slate-800)
- Text: #f1f5f9 (slate-50)
- Accent: #3b82f6 (blue)
- Success: #22c55e (green)
- Warning: #f59e0b (amber)
- Error: #ef4444 (red)

### Responsive
- Mobile: 320px+
- Tablet: 768px+ (md)
- Desktop: 1024px+ (lg)

### Typography
- Font: Inter (system)
- Mono: Fira Code
- Sizes: 12, 14, 16, 20, 24, 30, 36px

## Environment

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Build & Deploy

```bash
# Development
npm run dev

# Production build
npm run build
npm run start

# Docker
docker build -t axonengine-frontend .
docker run -p 3000:3000 axonengine-frontend
```

## Key Features

✅ Real-time SSE progress streaming
✅ 8-tab results interface
✅ Dark mode support
✅ Responsive design (mobile/tablet/desktop)
✅ Export to JSON, PDF, CSV
✅ Discovery history & persistence
✅ 3D protein visualization (optional)
✅ No external CDN (self-contained)
✅ Type-safe (TypeScript)
✅ Accessibility compliant

## Database

Discoveries stored in PostgreSQL:

```sql
CREATE TABLE discoveries (
  id UUID PRIMARY KEY,
  session_id UUID,
  query VARCHAR(256),
  results JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Status

✅ Architecture complete
✅ API specification finalized
✅ Component structure defined
✅ Real-time integration specified
🚀 Ready for development
