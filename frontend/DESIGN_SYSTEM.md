# AXONENGINE Design System

## Overview

A **professional, minimal, data-driven** design system for scientific drug discovery. Emphasizes clarity, transparency, and computational rigor with careful attention to typography, spacing, and visual hierarchy.

---

## Design Principles

### 1. **Scientific Authenticity**
- Every visual element serves information architecture
- No decorative elements without purpose
- Grounded in real computational data
- Avoid "AI slop" aesthetics

### 2. **Minimalism + Clarity**
- Clean whitespace (abundant negative space)
- Careful typography hierarchy
- Functional color use (not arbitrary)
- Precision in alignment and spacing

### 3. **Data Transparency**
- Show all computational confidence scores
- Display uncertainty ranges (±X kcal/mol)
- Trace reasoning through explainability
- Link to source evidence

### 4. **Scientific Accessibility**
- Use icons from Lucide React (not emojis)
- Proper contrast ratios (4.5:1 minimum)
- Semantic HTML for screen readers
- Keyboard navigation support

---

## Color Palette

### Primary Colors
- **Primary (Action):** `#3B82F6` (Blue-500) — Buttons, links, active states
- **Success:** `#10B981` (Emerald-500) — Positive results, "STABLE", checkmarks
- **Warning:** `#F59E0B` (Amber-500) — Caution results, "UNCERTAIN", warnings
- **Destructive:** `#EF4444` (Red-500) — Negative results, errors, "UNSTABLE"

### Neutral
- **Background:** `#FFFFFF` (Light) / `#0F172A` (Dark mode)
- **Surface/Card:** `#F8FAFC` (Light) / `#1E293B` (Dark)
- **Border:** `#E2E8F0` (Light) / `#334155` (Dark)
- **Text Primary:** `#0F172A` (Light) / `#F1F5F9` (Dark)
- **Text Muted:** `#64748B` (Light) / `#94A3B8` (Dark)

### Semantic
- **Confidence Tiers:**
  - `WELL_KNOWN` (Green): `#10B981`
  - `PARTIAL` (Amber): `#F59E0B`
  - `NOVEL` (Red): `#EF4444`

---

## Typography

### Font Stack
```
Heading: "Geist", -apple-system, sans-serif (custom geometric sans)
Body: "Inter", sans-serif (default Next.js, refined)
Mono: "Roboto Mono", monospace (for SMILES, code)
```

### Scale

| Role | Size | Weight | Line Height | Use Case |
|------|------|--------|------------|----------|
| **Display** | 56px | Bold (700) | 1.1 | Page title |
| **Heading 1** | 32px | Bold (700) | 1.2 | Section headers |
| **Heading 2** | 24px | Bold (700) | 1.25 | Subsection |
| **Heading 3** | 20px | Semibold (600) | 1.3 | Card title |
| **Body** | 16px | Regular (400) | 1.5 | Main content |
| **Small** | 14px | Regular (400) | 1.5 | Secondary text |
| **Caption** | 12px | Regular (400) | 1.4 | Micro labels |
| **Mono** | 13px | Regular (400) | 1.6 | SMILES, code |

---

## Spacing System

Tailwind default (multiples of 4px):
```
xs:  2px
sm:  4px
md:  8px
lg:  12px
xl:  16px
2xl: 24px
3xl: 32px
4xl: 48px
```

**Card Padding:** `p-6` (24px) inside, `gap-6` between sections  
**Section Padding:** `px-8 py-12` outer sections  
**Compact Items:** `gap-3` between inline elements

---

## Component Patterns

### Buttons

**Primary Action:**
```tsx
<button className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors cursor-pointer">
  Action
</button>
```

**Secondary (Bordered):**
```tsx
<button className="px-5 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors cursor-pointer">
  Secondary
</button>
```

**Icon Button (with aria-label):**
```tsx
<button aria-label="Copy" className="p-2 hover:bg-muted rounded cursor-pointer transition-colors">
  <CopyIcon className="w-4 h-4" />
</button>
```

### Cards

**Standard Card:**
```tsx
<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
  {/* content */}
</div>
```

**Data Card (with highlight border):**
```tsx
<div className="rounded-lg border-l-4 border-l-primary border border-border bg-card/50 p-6">
  {/* content */}
</div>
```

### Score Display

**With Uncertainty:**
```tsx
<div className="flex items-baseline gap-2">
  <span className="text-2xl font-bold">{value.toFixed(1)}</span>
  <span className="text-sm text-muted-foreground">
    ± {uncertainty.toFixed(2)} kcal/mol
  </span>
  <span className="text-xs font-mono text-muted-foreground">(GNN)</span>
</div>
```

**Confidence Badge:**
```tsx
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
  style={{
    backgroundColor: tier === "WELL_KNOWN" ? "#10B98130" : tier === "PARTIAL" ? "#F59E0B30" : "#EF444430",
    color: tier === "WELL_KNOWN" ? "#059669" : tier === "PARTIAL" ? "#D97706" : "#DC2626"
  }}>
  ● {tier}
</span>
```

### Tables

**Selectivity Table:**
- Compact: `p-3 text-xs`
- Row hover: `hover:bg-muted/30`
- Column colors (target affinity: emerald, off-target: red)
- Truncate long SMILES: `max-w-32 truncate`

---

## Animation & Motion

### Timing
- **Micro-interactions:** 150-200ms (page state changes)
- **Transitions:** 300ms (element reveal, scroll-based)
- **Loading spinners:** 2-3 second loop

### Easing
- **In/Out:** `cubic-bezier(0.4, 0, 0.2, 1)` (standard)
- **Bounce:** `cubic-bezier(0.34, 1.56, 0.64, 1)` (delightful reveals)

### Reserved for GSAP (Home Page)
- Hero word stagger on load
- Scroll-pinning sections
- Horizontal panel scroll
- Scale transitions

### CSS Transitions Only (Other Pages)
- Hover states: `transition-colors duration-200`
- Focus rings: `focus-visible:ring-2 ring-offset-2`
- Loading states: `opacity-50 pointer-events-none`

---

## Icons & Imagery

### Icon Guidelines
✅ Use **Lucide React** for all UI icons (consistent set)  
✅ Typical sizes: `w-4 h-4` (16px), `w-6 h-6` (24px)  
✅ Color: inherit parent text color or explicitly set  

❌ NO emojis in UI (🚀, 📊, ⚙️)  
❌ NO raster images without optimization  
❌ NO mixed icon libraries  

### Icons by Context

| Context | Icon | Example |
|---------|------|---------|
| Navigation | `ChevronRight`, `Menu`, `X` | Links, dropdowns |
| Status | `CheckCircle`, `AlertCircle`, `Info` | Results, alerts |
| Action | `Download`, `Share`, `Copy`, `Trash2` | Buttons, toolbars |
| Data | `TrendingUp`, `BarChart3`, `Activity` | Metrics, trends |
| Science | `Beaker`, `AtomIcon`, `Microscope` | Headers, badges |

---

## Responsive Design

### Breakpoints
- **Mobile:** 375px (min content width)
- **Tablet:** 768px
- **Desktop:** 1024px
- **Wide:** 1440px+

### Patterns
- **Mobile First:** Build mobile layout, enhance on larger screens
- **Touch Targets:** Minimum 44x44px for tap areas
- **Font Size:** 16px+ body text on mobile (no zooming)
- **Horizontal Scroll:** Never! Content always fits viewport width

---

## Accessibility Checklist

- [ ] All images have alt text (or `alt=""` if decorative)
- [ ] Form inputs have associated labels (`<label htmlFor="...">`)
- [ ] Interactive elements have visible focus states (`focus-visible:ring-2`)
- [ ] Color contrast ≥ 4.5:1 (normal text)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] ARIA labels on icon-only buttons (`aria-label="..."`)
- [ ] Semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`, not divs
- [ ] Error messages near problem input
- [ ] Page title describes current context

---

## Light & Dark Mode

### Implementation
- Use `var(--background)`, `var(--foreground)`, `var(--border)` (shadcn defaults)
- Colors flip automatically via CSS custom properties
- Test both modes before shipping

### Specific Dark Mode Fixes
- **Glass cards:** Use `bg-white/80` light, `bg-slate-900/50` dark (opacity-based)
- **Borders:** `border-gray-200` light, `border-slate-700` dark
- **Muted text:** `text-slate-600` light, `text-slate-400` dark
- **Hover states:** Reduce opacity on dark, add subtle light on light

---

## Page Templates

### Research/Analysis Page
1. **Top Bar:** Mutation query + Session ID + Actions
2. **Sidebar:** Pipeline status (sticky, 56 agents)
3. **Main Content:** Tabs for different analyses
4. **Footer:** Disclaimers

### Discoveries Page
1. **Header:** Search + Filters
2. **Grid/Table:** Discovery cards with quick stats
3. **Detail Drawer:** Click to expand full results
4. **Export:** Buttons for JSON/PDF/SDF

### Settings Page
1. **Theme Selector:** Light/Dark/Auto
2. **API Endpoint:** Configuration
3. **System Status:** Backend health
4. **Export Preferences:** Default formats

---

## Common Pitfalls to Avoid

❌ Using `var(--primary)` without understanding the color  
❌ Hardcoding colors instead of using CSS variables  
❌ Mixing Tailwind utility classes with inline styles  
❌ Emojis in component text  
❌ Text sizes not following scale  
❌ Z-index values without documented scale  
❌ Hover states that shift layout  
❌ Missing focus states on interactive elements  
❌ Colors as only indicator (use icons + color + text)  
❌ Touching edges (always pad sections from viewport)  

---

## References

- **Components:** shadcn/ui (`components.json` in root)
- **Icons:** Lucide React (https://lucide.dev)
- **Theme:** CSS custom properties in `globals.css`
- **Responsive:** Tailwind default breakpoints + mobile-first

