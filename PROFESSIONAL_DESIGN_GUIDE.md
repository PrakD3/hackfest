# Professional Design Principles for AXONENGINE Frontend
## Keep It Simple, Readable, Scientific

**Based on:** UI/UX Pro Max design system + WCAG accessibility standards  
**Goal:** Display complex scientific data without overwhelming users  
**Audience:** Judges, researchers, scientists, biotech professionals

---

## Core Design Philosophy

### ✅ DO: Data-Driven Clarity
- Show real numbers with uncertainty ranges
- Use clear labels (what is this metric?)
- Provide context (method: Vina, GNN, OpenMM)
- Let numbers speak for themselves

### ❌ DON'T: Flashy Complexity
- No unnecessary animations (slow, distracting)
- No 3D protein viewers (overkill, adds load time)
- No AI reasoning visualizations (confusing, not needed)
- No multiple competing visualizations (choose ONE per metric)

---

## Typography Principles

**Font:** Plus Jakarta Sans (friendly, clean, professional)

### Hierarchy
```
H1: 30px bold — Page title (Results, Analysis)
H2: 24px bold — Section headers (Leads, Pocket Geometry, MD)
H3: 20px bold — Subsection (GNN Score, MM-GBSA)
Body: 14px regular — Description text
Metric: 18px bold — Key numbers (-9.1 kcal/mol)
Label: 12px gray — Field names (Affinity, Selectivity)
```

### Examples of Good Text Hierarchy
```
┌─────────────────────────────────────────┐
│ Drug Discovery Results          ← H1    │
├─────────────────────────────────────────┤
│ Mutation: EGFR T790M            ← Body │
│ Execution: 45s                  ← Body │
├─────────────────────────────────────────┤
│ Top Candidates              ← H2 Section │
│                                         │
│ Binding Affinity            ← H3        │
│ -8.5 ± 2.0 kcal/mol (Vina)  ← Metric  │
│ [green icon] Favorable                 │
│                                         │
│ Selectivity                 ← H3        │
│ 3.4× vs off-targets         ← Metric  │
└─────────────────────────────────────────┘
```

---

## Color Scheme (Dark OLED)

### Primary Colors
```css
Primary:    #15803D (pharmacy green)  — For success/approval
Secondary:  #22C55E (light green)     — For positive data
CTA:        #0369A1 (trust blue)      — For buttons, highlights
```

### Supporting Colors
```css
Background:     #0F172A (slate-900)   — Main background
Surface:        #1E293B (slate-800)   — Card background
Text:           #F1F5F9 (slate-50)    — Primary text
Muted:          #94A3B8 (slate-400)   — Secondary text
Border:         #334155 (slate-700)   — Dividers

Alerts:
  Success:      #22C55E (green)
  Warning:      #F59E0B (amber)
  Error:        #EF4444 (red)
  Info:         #3B82F6 (blue)
```

### Contrast Ratios (WCAG AAA Compliant)
- **Text on background:** 7:1+ (excellent readability)
- **Metric numbers on surface:** 5:1+ (clear emphasis)
- **Labels on surface:** 4.5:1+ (minimum readable)
- **Borders:** Always visible (no transparency)

---

## Layout Principles

### Grid System
- **Max width:** 1200px (centered on desktop)
- **Padding:** 16px mobile, 24px tablet, 32px desktop
- **Spacing:** Use multiples of 4px (4, 8, 12, 16, 24, 32)
- **Gap between cards:** 16px (consistent throughout)

### Card Design
```
┌────────────────────────────────┐
│ Title (H3)                     │
├────────────────────────────────┤
│ Label         Value            │
│ Metric Name   -8.5 kcal/mol    │
│               ± 2.0 (Vina)     │
│                                │
│ Label         Value            │
│ Selectivity   3.4×             │
└────────────────────────────────┘
```

**Card Properties:**
- Background: `bg-slate-800`
- Padding: `p-4` (16px)
- Border: `border border-slate-700`
- Rounded: `rounded-lg`
- No shadow (unless hover)

### Spacing Inside Cards
```
┌─────────────────────────┐
│ ▌ 16px margin           │
│                         │
│  Field Label (12px)     │ ← Muted color
│  Metric Value (18px)    │ ← Bold, primary color
│  Sub-label (12px)       │ ← Muted color
│                         │
│ ▌ 16px margin           │
└─────────────────────────┘
```

---

## Data Display Best Practices

### Metric Formatting

✅ **Good Examples:**
```
Affinity:          -8.5 ± 2.0 kcal/mol (Vina)
RMSD (Stability):  1.5 ± 0.3 Å (STABLE)
Free Energy:       -8.3 ± 0.5 kcal/mol (MM-GBSA)
Synthesis:         4.2 (moderate difficulty)
Selectivity:       3.4× vs off-targets
ADMET:             9/10 ✓ PASS
```

❌ **Bad Examples:**
```
Affinity:          -8.5                          (no uncertainty, no method)
RMSD:              1.5                           (ambiguous)
Free Energy:       -8.3 kcal/mol (not validated) (unclear)
Synthesis:         0.0                           (placeholder)
Selectivity:       N/A                           (no data)
ADMET:             0/10                          (clearly fake)
```

### Chart Guidelines

**Do:**
- Use `Recharts` for interactive charts
- Limit chart height to 300-400px
- Show 3-5 data series maximum
- Include legend below chart
- Add reference lines (stability threshold)

**Don't:**
- Use 3D charts (hard to read)
- Add animations to charts (distracting)
- Show >10 series (too cluttered)
- Use gradients in chart backgrounds
- Include multiple Y-axes (confusing)

### Table Display

**Mobile (< 768px):**
- Stack as cards instead of table
- One field per row
- Full width, readable

**Desktop (≥ 768px):**
- Show as table with overflow scroll
- Sticky header row
- Alternating row colors (subtle)
- Sortable columns (optional)

---

## Interactivity Standards

### Buttons
```css
/* Default State */
background: #0369A1 (trust blue)
text-color: white
padding: 10px 16px
border-radius: 6px

/* Hover State */
background: #0284C7 (darker blue)
transform: none (don't scale!)
transition: background 200ms

/* Disabled State */
background: #64748B (gray)
opacity: 0.6
cursor: not-allowed
```

### Hover Effects (Non-Scaling)
```css
/* Good: Color transition */
button {
  background: #0369A1;
  transition: background-color 200ms;
}
button:hover {
  background: #0284C7;
}

/* Good: Opacity + border */
card {
  background: #1E293B;
  border: 1px solid #334155;
  transition: all 200ms;
}
card:hover {
  border-color: #64748B;
  background: #1E293B;
}

/* Bad: Scale transform (shifts layout) */
card:hover {
  transform: scale(1.05);  ❌ AVOID
}

/* Bad: Width change */
button:hover {
  width: 120%;  ❌ AVOID
}
```

### Focus States (Keyboard Navigation)
```css
button:focus {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}

input:focus {
  border: 2px solid #3B82F6;
  background: rgba(3, 105, 161, 0.1);
}
```

---

## Accessibility Checklist

### Required
- [ ] **Contrast:** All text meets 4.5:1 ratio
- [ ] **Alt text:** Images have descriptive alt
- [ ] **Labels:** All inputs have `<label>` tags
- [ ] **Focus:** Visible focus ring on interactive elements
- [ ] **Keyboard nav:** All features accessible via Tab
- [ ] **Errors:** Error messages in `role="alert"`
- [ ] **Cursor:** `cursor-pointer` on all clickable elements

### Nice-to-Have
- [ ] **Reduced motion:** Respect `prefers-reduced-motion`
- [ ] **Dark mode:** Verify readability in both modes
- [ ] **Zoom:** Content readable at 200% zoom
- [ ] **Screen readers:** Test with NVDA (free, Windows)

---

## What to Display vs. Hide

### Always Show
- ✅ Real numerical results (affinity, RMSD, etc.)
- ✅ Uncertainty ranges (±2.0)
- ✅ Method labels (Vina, GNN, OpenMM)
- ✅ Key metrics with clear labels
- ✅ Professional charts (single metric each)
- ✅ Disclaimers & warnings
- ✅ Execution time & agent count

### Show on Click/Expand (Collapsible)
- 🔽 ADMET details (10 properties, too much to show by default)
- 🔽 Reaction steps (detailed synthesis)
- 🔽 Raw JSON output (for researchers only)
- 🔽 Agent execution logs (debugging)

### Don't Show (Ever)
- ❌ "SIMULATED" labels (we have real data now)
- ❌ Hardcoded placeholder values (0.0, N/A)
- ❌ Raw backend error messages (user-friendly errors only)
- ❌ Internal IDs unless researcher-focused
- ❌ 3D protein viewers (too heavy)
- ❌ AI reasoning graphs (too complex)

---

## Mobile Responsiveness

### Breakpoints
```
Mobile:   320px - 639px   (single column, stacked cards)
Tablet:   640px - 1023px  (2 columns, larger text)
Desktop:  1024px+         (3+ columns, full layout)
```

### Mobile Best Practices
- **Font size:** 16px minimum (prevents zoom on input)
- **Touch targets:** 44x44px minimum
- **Padding:** 16px (mobile has limited space)
- **Columns:** 1 column max (no scrolling sideways)
- **Charts:** Full width, 300px height max
- **Tables:** Convert to cards or horizontal scroll

### Tablet Optimization
- 2-column grid where possible
- Larger buttons (easier to tap)
- Horizontal tabs instead of dropdown
- Tables acceptable with horizontal scroll

---

## Color Psychology for Scientific Data

| Color | When to Use | Avoid |
|-------|------------|-------|
| 🟢 **Green** | Success, favorable binding, PASS | More than once per page |
| 🟡 **Amber** | Warning, borderline stability, REVIEW | Background (too harsh) |
| 🔴 **Red** | Error, unstable, FAIL | Text on dark (hard to read) |
| 🔵 **Blue** | Information, CTA buttons, ranking | Everything else |
| ⚫ **Gray** | Muted text, disabled, neutral | Text (use for labels only) |

---

## Typography Rules

### Do
- Use **Plus Jakarta Sans** for entire UI
- Keep line-height at 1.5 (readable)
- Limit line length to 65-75 characters
- Use **bold** for metrics, *italic* for emphasis
- Use monospace (`font-mono`) for SMILES, IDs, code

### Don't
- Mix fonts (One font for entire app)
- Use ALL CAPS for body text (hard to read)
- Justify text (leaves gaps, looks broken)
- Use < 14px for body text (too small)
- Use text-shadow effects (unless for glow aesthetic)

---

## Animation Guidelines

### Safe (Use These)
```css
/* Button hover */
transition: background-color 200ms ease;

/* Card hover (color only, no scale) */
transition: border-color 200ms, background-color 200ms;

/* Loading spinner */
animation: spin 1s linear infinite;

/* Fade in on mount */
animation: fadeIn 300ms ease-out;
```

### Avoid (Skip These)
```css
/* Layout shifts */
transform: scale(1.05);      ❌
width: 100% → 110%;          ❌

/* Slow animations */
animation-duration: 1000ms;  ❌

/* Complex animations */
keyframes: morph transform... ❌
```

### `prefers-reduced-motion` Support
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Quality Checklist Before Demo

### Visual Quality
- [ ] No placeholder/0.0 values showing
- [ ] All uncertainty ranges present
- [ ] Method labels visible (Vina, GNN, OpenMM)
- [ ] Charts are crisp and readable
- [ ] Text has no rendering issues
- [ ] Dark mode looks professional

### Data Integrity
- [ ] Real Vina scores showing (not -9.0)
- [ ] Real selectivity showing (not N/A)
- [ ] Real ADMET scores (not 0/10)
- [ ] Real MD trajectories (not flat lines)
- [ ] Real synthesis routes (not generic)

### Interaction
- [ ] Buttons respond smoothly
- [ ] Hover states visible
- [ ] Forms work correctly
- [ ] No console errors
- [ ] Mobile responsive

### Accessibility
- [ ] Tab navigation works
- [ ] Focus ring visible
- [ ] Contrast acceptable (4.5:1+)
- [ ] No keyboard traps
- [ ] Screen reader friendly

---

## Final Design Philosophy

**SIMPLICITY OVER COMPLEXITY**

If you're asking:
- "Should we add a 3D protein viewer?" → **NO** (current design is better)
- "Should we show all agent timings?" → **NO** (too much detail)
- "Should we add animation effects?" → **NO** (distracting)
- "Should we show uncertainty ranges?" → **YES** (important for science)
- "Should we show the method used?" → **YES** (transparency matters)
- "Should we keep it readable?" → **YES** (always)

**The best design is invisible. Users see data, not design.**

---

## Summary

✅ **Keep:**
- Dark OLED theme
- Plus Jakarta Sans typography
- Clear color scheme
- Professional spacing
- Scientific numbers with uncertainty
- Method labels
- Clean tab interface

❌ **Remove:**
- Hardcoded/fake data
- Placeholder values
- Unnecessary animations
- Complex visualizations
- Confusing explanations

🚀 **Result:**
A professional, scientific UI that judges can trust because all data is real and clearly labeled.

The goal is not to impress with design—it's to impress with **results** that are **real**, **verified**, and **transparent**.

---

**Next step:** Implement the 2-3 code changes in QUICK_IMPLEMENTATION_GUIDE.md  
**Expected time:** 1-2 hours  
**Impact:** Frontend becomes production-ready for demo 🎯
