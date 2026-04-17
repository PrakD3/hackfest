# Quick Implementation Guide — Add Real Data Display

**Time estimate:** 1-2 hours to fully integrate  
**Difficulty:** Easy (mostly string formatting)  
**Impact:** Makes backend real data visible in UI

---

## 1. Add Uncertainty Ranges to MoleculeCard

### File: `frontend/app/components/analysis/MoleculeCard.tsx`

**Current (line ~60):**
```typescript
<div className="text-sm">
  Affinity: {docking_affinity?.toFixed(1)} kcal/mol
</div>
```

**Change to:**
```typescript
<div className="text-sm">
  <span className="text-slate-400">Affinity</span>
  <div className="font-semibold">
    {docking_affinity?.toFixed(1)} ± {docking_affinity_uncertainty?.toFixed(1)} kcal/mol
  </div>
  <div className="text-xs text-slate-500">(Vina)</div>
</div>
```

**Full example with type safety:**
```typescript
interface MoleculeCardProps {
  smiles: string;
  compound_name: string;
  docking_affinity: number;
  docking_affinity_uncertainty: number;  // ADD THIS
  docking_method?: string;                // ADD THIS
  selectivity_ratio: number;
  admet_score: number;
}

export function MoleculeCard({
  smiles,
  compound_name,
  docking_affinity,
  docking_affinity_uncertainty,
  docking_method = "vina",
  selectivity_ratio,
  admet_score,
}: MoleculeCardProps) {
  return (
    <Card className="p-4">
      {/* Molecule structure */}
      <MoleculeViewer2D smiles={smiles} className="h-32 w-full mb-3" />
      
      {/* Name */}
      <div className="font-semibold mb-3">{compound_name}</div>
      
      {/* Affinity with uncertainty */}
      <div className="space-y-1 mb-3">
        <div className="text-xs text-slate-400">Binding Affinity</div>
        <div className="text-lg font-bold">
          {docking_affinity?.toFixed(1)} ± {docking_affinity_uncertainty?.toFixed(1)}
        </div>
        <div className="text-xs text-slate-500">kcal/mol ({docking_method?.toUpperCase()})</div>
      </div>
      
      {/* Selectivity */}
      <div className="space-y-1 mb-3">
        <div className="text-xs text-slate-400">Selectivity</div>
        <div className="text-lg font-bold">{selectivity_ratio?.toFixed(1)}×</div>
      </div>
      
      {/* ADMET */}
      <div className="space-y-1">
        <div className="text-xs text-slate-400">ADMET Score</div>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">{admet_score}/10</div>
          <Badge className={admet_score >= 8 ? "bg-green-600" : "bg-amber-600"}>
            {admet_score >= 8 ? "PASS" : "REVIEW"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
```

---

## 2. Add GNN Score to Top 2 Finalists

### File: `frontend/app/analysis/[sessionId]/page.tsx` (Results section)

**Current (line ~200):**
```typescript
{report.ranked_leads.slice(0, 2).map((lead, i) => (
  <MoleculeCard key={lead.smiles} {...lead} />
))}
```

**Change to:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-2 border-blue-500 p-4 rounded-lg bg-blue-500/5">
  <h3 className="col-span-full text-lg font-bold text-blue-400 flex items-center gap-2">
    <span className="text-2xl">🎯</span> MD Validation Finalists
  </h3>
  
  {report.ranked_leads.slice(0, 2).map((lead, i) => (
    <div key={lead.smiles} className="border border-blue-500/30 p-3 rounded-lg">
      <div className="text-sm font-bold text-blue-400 mb-2">#{i + 1} — {lead.rank}</div>
      <MoleculeCard {...lead} />
      
      {/* GNN Score */}
      {lead.affinity_gnn && (
        <div className="mt-3 pt-3 border-t border-slate-600">
          <div className="text-xs text-slate-400">GNN Ranking Score</div>
          <div className="text-lg font-bold text-blue-400">
            {lead.affinity_gnn.toFixed(1)} ± {lead.gnn_uncertainty?.toFixed(1)} kcal/mol
          </div>
        </div>
      )}
    </div>
  ))}
</div>
```

---

## 3. Show MM-GBSA with Uncertainty in MDValidation

### File: `frontend/app/components/analysis/MDValidation.tsx`

**Current (line ~80):**
```typescript
<div>MM-GBSA: {mmgbsa_dg?.toFixed(2)} kcal/mol</div>
```

**Change to:**
```typescript
<div className="space-y-1">
  <div className="text-sm text-slate-400">Free Energy (MM-GBSA)</div>
  <div className="text-lg font-bold">
    {mmgbsa_dg?.toFixed(2)} ± {mmgbsa_uncertainty?.toFixed(2)} kcal/mol
  </div>
  <div className="text-xs text-slate-500">(OpenMM)</div>
</div>
```

**Full component update:**
```typescript
interface MDValidationProps {
  rmsdMean?: number;
  rmsdTrajectory?: number[];
  stabilityLabel?: "STABLE" | "BORDERLINE" | "UNSTABLE";
  mmgbsaDg?: number;
  mmgbsaUncertainty?: number;  // ADD THIS
  bindingFrameFraction?: number;
  nativeContactRetention?: number;
}

export function MDValidation({
  rmsdMean,
  rmsdTrajectory,
  stabilityLabel = "BORDERLINE",
  mmgbsaDg,
  mmgbsaUncertainty = 0.5,
  bindingFrameFraction,
  nativeContactRetention,
}: MDValidationProps) {
  return (
    <div className="space-y-4">
      {/* RMSD Trajectory Chart */}
      {rmsdTrajectory && (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rmsdTrajectory.map((rmsd, i) => ({
                frame: i,
                rmsd,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="frame" />
              <YAxis label={{ value: "RMSD (Å)", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(value) => `${(value as number).toFixed(2)} Å`} />
              <Line
                type="monotone"
                dataKey="rmsd"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <ReferenceLine
                y={2.0}
                stroke="#22c55e"
                label={{ value: "Stable (2.0 Å)", position: "right" }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stability Badge */}
      <div
        className={`p-4 rounded-lg font-bold text-2xl text-white ${
          stabilityLabel === "STABLE"
            ? "bg-green-600"
            : stabilityLabel === "BORDERLINE"
              ? "bg-amber-600"
              : "bg-red-600"
        }`}
      >
        {stabilityLabel}: {rmsdMean?.toFixed(2)} Å
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* MM-GBSA */}
        <div className="bg-slate-700 p-3 rounded-lg">
          <div className="text-slate-400 mb-1">Free Energy (MM-GBSA)</div>
          <div className="text-xl font-bold">
            {mmgbsaDg?.toFixed(2)} ± {mmgbsaUncertainty?.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">kcal/mol (OpenMM)</div>
        </div>

        {/* Binding Frames */}
        {bindingFrameFraction && (
          <div className="bg-slate-700 p-3 rounded-lg">
            <div className="text-slate-400 mb-1">Binding Frames</div>
            <div className="text-xl font-bold">
              {(bindingFrameFraction * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500">of simulation</div>
          </div>
        )}

        {/* Native Contacts */}
        {nativeContactRetention && (
          <div className="bg-slate-700 p-3 rounded-lg">
            <div className="text-slate-400 mb-1">Native Contacts</div>
            <div className="text-xl font-bold">
              {(nativeContactRetention * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500">retained</div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 4. Verify SelectivityBadge Shows Real Values

### File: `frontend/app/components/analysis/SelectivityBadge.tsx`

**Current (likely shows N/A if backend doesn't return value):**
```typescript
<div className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-sm font-semibold">
  Selectivity: {selectivityRatio || "N/A"}×
</div>
```

**Check backend returns this:**
```typescript
// In DockingAgent output, should have:
{
  "selectivity_ratio": 3.4,
  "selectivity_method": "dual_dock"
}
```

**If missing from backend**, update DockingAgent to return this value.

---

## 5. Test All Backend Data Flows

### Testing Checklist

```bash
# 1. Start backend
cd backend
python -m uvicorn main:app --reload

# 2. Start frontend
cd ../frontend
npm run dev

# 3. Run test mutation
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"mutation": "EGFR T790M"}'

# 4. Get session ID from response
# 5. Go to http://localhost:3000/analysis/{session_id}

# 6. Verify in results:
# ✓ Affinity shows: "-8.5 ± 2.0 kcal/mol (Vina)"
# ✓ Selectivity shows: "3.4×" (not N/A)
# ✓ ADMET shows: "9/10" (not 0)
# ✓ MD tab shows RMSD with uncertainty
# ✓ Synthesis shows SA score with color
# ✓ No "SIMULATED" labels anywhere
```

---

## 6. Add Fallback Display if Data Missing

### Pattern for Optional Backend Data

```typescript
// If backend sometimes doesn't return a field, show gracefully
{docking_affinity_uncertainty ? (
  <div className="text-lg font-bold">
    {docking_affinity?.toFixed(1)} ± {docking_affinity_uncertainty.toFixed(1)} kcal/mol
  </div>
) : (
  <div className="text-lg font-bold">
    {docking_affinity?.toFixed(1)} kcal/mol
  </div>
)}
```

---

## Files Summary

| File | Change | Priority |
|------|--------|----------|
| `MoleculeCard.tsx` | Add uncertainty, method label | HIGH |
| `MDValidation.tsx` | Add uncertainty to MM-GBSA | HIGH |
| `SelectivityBadge.tsx` | Verify backend value shows | MEDIUM |
| `SynthesisRoute.tsx` | Already good — verify only | LOW |
| `[sessionId]/page.tsx` | Highlight top 2 with GNN | MEDIUM |

---

## Expected Result After Implementation

### Before (Hardcoded/Fake)
```
Affinity: -9.0 kcal/mol [SIMULATED]
Selectivity: N/A
ADMET: 0/10
RMSD: 1.5 Å
SA Score: 0.0
```

### After (Real Backend Data)
```
Affinity: -8.5 ± 2.0 kcal/mol (Vina)
Selectivity: 3.4×
ADMET: 9/10 ✓ PASS
RMSD: 1.5 ± 0.3 Å (STABLE)
SA Score: 4.2 (moderate)
```

---

## Deploy Checklist

Before pushing to production:

- [ ] Run `npm run build` — no TypeScript errors
- [ ] Run `npx biome check --write` — no linting errors
- [ ] Test 3 different mutations — all show real values
- [ ] Verify uncertainty ranges display correctly
- [ ] Check mobile responsiveness
- [ ] Remove any hardcoded/SIMULATED text
- [ ] Verify no console errors
- [ ] Test dark mode rendering

---

## Questions?

If backend data doesn't show:
1. Check API returns the field (log in DevTools Network tab)
2. Verify prop passed to component (check props.tsx or API types)
3. Check component actually renders field (not in comment or conditional)
4. Use `console.log(props)` to debug data flow

All components are already there—just display the real data! ✨
