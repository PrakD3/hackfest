"use client";

/**
 * TourGuide.tsx
 * ─────────────────────────────────────────────────────────────
 * Pure-frontend spotlight tour for Drug Discovery AI.
 * No LLM calls. Steps are hardcoded content.
 *
 * HOW IT WORKS:
 *   1. Wrap your entire page layout with <TourGuide>.
 *   2. Add data-tour="step-id" to any element you want spotlighted.
 *   3. The tour reads each element's bounding rect, cuts a spotlight
 *      hole in a full-screen overlay, and shows a tooltip box.
 *
 * USAGE:
 *   // In your layout or page:
 *   import TourGuide from "@/components/TourGuide";
 *   import { useTourStore } from "@/components/TourGuide";
 *
 *   // Trigger from your Easy Mode toggle:
 *   const { startTour } = useTourStore();
 *   <button onClick={startTour}>Start Tour</button>
 *
 *   // Tag elements across any page:
 *   <div data-tour="query-input"> ... </div>
 *   <div data-tour="pipeline-status"> ... </div>
 *
 * DEPENDENCIES:
 *   npm install zustand           (lightweight state — or swap for useState/context)
 *   (framer-motion is already in the project per package.json)
 */

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";
import { usePathname, useRouter } from "next/navigation";

// ─── TOUR STEP DEFINITIONS ────────────────────────────────────────────────────

export interface TourStep {
  /** Must match a data-tour="..." attribute in the DOM */
  id: string;
  /** Tooltip heading */
  title: string;
  /** Plain-English body. Use \n for line breaks. */
  body: string;
  /** Where to anchor the tooltip relative to the spotlight */
  placement: "top" | "bottom" | "left" | "right" | "center";
  /** Extra padding around the spotlight cutout (px) */
  padding?: number;
  /** Optional page path — tour can tell user to navigate if needed */
  page?: string;
  /** Icon shown in the tooltip header (emoji or single char) */
  icon?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "query-panel",
    title: "Start here — run your mutation",
    icon: "🧬",
    placement: "bottom",
    padding: 12,
    page: "/research",
    body: `Type a gene mutation like "EGFR T790M" [Copy] in the search box, and click the Launch button.\n\nA gene mutation is a tiny typo in your body's instruction manual. EGFR is a protein — a tiny machine inside cells. T790M means one letter at position 790 was accidentally swapped, making cancer cells resist common drugs.\n\nThat's exactly what this platform is built to solve.`,
  },
  {
    id: "pipeline-status",
    title: "Live pipeline — watch the agents work",
    icon: "📡",
    placement: "right",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `This waterfall shows all 22 agents in real time.\n\n✅ Green checkmark = that agent finished\n⟳ Spinning = working right now\n○ Grey circle = waiting for its turn\n\nYou can click any agent row to read a plain-English summary of what it just did and what it found.`,
  },
  {
    id: "database-fetch-agents",
    title: "The internet detectives — fetching real science",
    icon: "🔍",
    placement: "right",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `These four agents run at the same time, each searching a different database:\n\n📚 PubMed — reads thousands of medical papers about your mutation\n🏗 PDB — downloads the 3D blueprint of the protein\n🧪 PubChem — finds chemicals already known to target this protein\n🏥 ClinicalTrials.gov — checks what drugs are being tested on real patients right now\n\nA human researcher would need weeks to cover all this. The agents do it in seconds.`,
  },
  {
    id: "pocket-detection",
    title: "Finding the keyhole",
    icon: "🔑",
    placement: "right",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `The Pocket Detection agent examines the 3D shape of the protein and finds the best spot for a drug to grip onto. Scientists call this the "binding pocket".\n\nThink of the protein as a lock. This agent is finding the keyhole — the exact cavity where a drug-shaped key could fit and block the protein from causing harm.\n\nThe software used (fpocket) scores each cavity by how "druggable" it is.`,
  },
  {
    id: "molecule-generator",
    title: "Inventing new drug candidates",
    icon: "⚗️",
    placement: "right",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `Now the fun part — the AI invents up to 30 brand-new molecules designed to fit that keyhole.\n\nIt starts with known drug-shaped skeletons ("scaffolds") and creatively swaps chemical groups — like trying different-shaped keys until some seem promising.\n\nEach molecule is described as a SMILES string — a short text code that fully encodes a molecule's structure. For example: CC1=CC=C(C=C1)NC2=NC=CC(=N2) — that's a complete molecule in text form!`,
  },
  {
    id: "docking-agent",
    title: "Testing the keys in the lock",
    icon: "🔒",
    placement: "right",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `The Docking agent tests each molecule by virtually placing it into the binding pocket and measuring how well it fits.\n\nThe tool (AutoDock Vina) tries many orientations — like rotating a key — and reports a docking score in kcal/mol. More negative = better fit.\n\n-9.5 kcal/mol is a strong binder.\n-6.0 kcal/mol is weak.\n\nOnly the top-scoring molecules survive to the next round.`,
  },
  {
    id: "docking-tab",
    title: "Deep Dive into Poses",
    icon: "🔬",
    placement: "top",
    padding: 8,
    page: "/analysis/[sessionId]",
    body: `We've moved the detailed Docking results right here. In this tab, you can inspect 3D interactions for every single candidate.\n\nYou can see which amino acids are gripping the drug and exactly where the "hotspots" are. High-end discovery requires this visual proof.`,
  },
  {
    id: "selectivity-filter",
    title: "Safety check — only hit the right target",
    icon: "🎯",
    placement: "right",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `A drug that hits 11 proteins instead of 1 causes side effects. This agent checks each molecule against 10 healthy "off-target" proteins.\n\nWe only keep molecules that grip the broken EGFR at least 3.2× more tightly than any healthy protein. That's our selectivity floor.\n\nMolecules that fail are eliminated here — no matter how good their docking score was.`,
  },
  {
    id: "admet-filter",
    title: "Can the body actually use this?",
    icon: "💊",
    placement: "right",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `ADMET checks five things about how a drug survives inside a human body:\n\nA — Absorption: will it enter the bloodstream?\nD — Distribution: will it reach the right cells?\nM — Metabolism: will the liver destroy it too quickly?\nE — Excretion: can the body safely remove it?\nT — Toxicity: will it damage healthy tissue?\n\nMolecules failing these rules (like being too large, too fatty, or carrying toxic groups) are removed. Usually only 2–4 molecules survive from the original 30.`,
  },
  {
    id: "waiting-for-pipeline",
    title: "Grab a coffee ☕",
    icon: "⏱",
    placement: "center",
    padding: 0,
    page: "/analysis/[sessionId]",
    body: `The remaining agents are now crunching through millions of possibilities. This process usually takes around 300 seconds to generate the safest, strongest drug candidates.\n\nThe tour is pausing so you can roam around the page, watch the live agent log, or ask the AI Assistant (bottom right) questions about the science while you wait.\n\nWe'll prompt you to resume the tour as soon as the results load! [Pause]`,
  },
  {
    id: "molecule-cards",
    title: "Your drug candidates",
    icon: "🗂",
    placement: "top",
    padding: 12,
    page: "/analysis/[sessionId]",
    body: `Each card here is a drug candidate that survived every filter. Here's what the numbers mean:\n\nVina Score — how tightly it docks (more negative = better)\nGNN Score — a neural network's prediction of effectiveness (0–1, higher = better)\nSA Score — how hard it would be to make in a real lab (1 = easy, 10 = very hard)\nADMET Radar — the web chart. Bigger coverage = safer drug profile\n\nClick any card to open the 3D viewer.`,
  },
  {
    id: "molecule-viewer-3d",
    title: "See the drug inside the protein — in 3D",
    icon: "🔬",
    placement: "left",
    padding: 8,
    page: "/analysis/[sessionId]",
    body: `This is the protein (large shape) with your drug molecule (smaller colourful structure) sitting inside its binding pocket.\n\nClick + drag to rotate. Scroll to zoom.\n\n🟢 Green contacts — the drug is forming a helpful bond. Good!\n🔴 Red contacts — a slight clash. Not ideal but sometimes acceptable.\n\nThis view tells scientists whether the molecule will hold on long enough to actually block the harmful protein.`,
  },
  {
    id: "admet-radar",
    title: "The safety web chart",
    icon: "🕸",
    placement: "left",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `This spider-web chart shows 6 drug-safety categories at a glance.\n\nThe further each axis extends toward the edge, the better that property is. A molecule with a large, balanced web is a good all-rounder.\n\nIf one axis collapses toward the centre, that property is weak — for example, poor absorption means the drug might not enter the bloodstream well.`,
  },
  {
    id: "evolution-tree",
    title: "How the AI evolved the molecules",
    icon: "🌳",
    placement: "top",
    padding: 10,
    page: "/analysis/[sessionId]",
    body: `This branching diagram shows the evolution of your drug candidates — starting from one seed molecule at the root and branching outward as the AI made creative changes.\n\nThe highlighted teal paths are the branches that survived all the filters and made it to the final results.\n\nIt's like a family tree for molecules — you can see exactly which "ancestor" each final drug came from.`,
  },
  {
    id: "discoveries-nav",
    title: "Your saved results library",
    icon: "📂",
    placement: "bottom",
    padding: 8,
    page: "/discoveries",
    body: `The Discoveries page stores every pipeline run you've saved. You can compare results across different mutations side by side, re-open any run, or export the full report.\n\nEach saved run includes the complete molecule set, all scores, the 3D structures, and the synthesis routes — a full record of what the AI found.`,
  },
];

// ─── ZUSTAND STORE ────────────────────────────────────────────────────────────

interface TourState {
  isActive: boolean;
  currentIndex: number;
  startTour: () => void;
  stopTour: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  isActive: false,
  currentIndex: 0,
  startTour: () => set({ isActive: true, currentIndex: 0 }),
  stopTour: () => set({ isActive: false, currentIndex: 0 }),
  next: () => {
    const { currentIndex } = get();
    if (currentIndex < TOUR_STEPS.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    } else {
      set({ isActive: false, currentIndex: 0 });
    }
  },
  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },
  goTo: (index: number) => set({ currentIndex: index }),
}));

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  padding: number;
}

// ─── SPOTLIGHT SVG MASK ───────────────────────────────────────────────────────

function SpotlightOverlay({
  rect,
  onClick,
}: {
  rect: SpotlightRect | null;
  onClick: () => void;
}) {
  const { top, left, width, height, padding } = rect ?? {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    padding: 0,
  };

  const r = 8; // border-radius of spotlight cutout
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const x = left - padding;
  const y = top - padding;
  const w = width + padding * 2;
  const h = height + padding * 2;

  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9998,
        pointerEvents: "none",
      }}
    >
      <path
        d={
          rect
            ? `M 0,0 H ${vw} V ${vh} H 0 Z M ${x + r},${y} h ${w - 2 * r} a ${r},${r} 0 0 1 ${r},${r} v ${h - 2 * r} a ${r},${r} 0 0 1 -${r},${r} h -${w - 2 * r} a ${r},${r} 0 0 1 -${r},-${r} v -${h - 2 * r} a ${r},${r} 0 0 1 ${r},-${r} z`
            : `M 0,0 H ${vw} V ${vh} H 0 Z`
        }
        fillRule="evenodd"
        fill="rgba(0, 0, 0, 0.65)"
        style={{ backdropFilter: "blur(4px)", pointerEvents: "auto" }}
        onClick={onClick}
      />
      {/* Spotlight border ring */}
      {rect && (
        <rect
          x={x - 1}
          y={y - 1}
          width={w + 2}
          height={h + 2}
          rx={r + 1}
          ry={r + 1}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}

// ─── TOOLTIP BOX ─────────────────────────────────────────────────────────────

const TOOLTIP_W = 380; // wider to prevent overlapping in footer
const TOOLTIP_GAP = 18; // gap between spotlight edge and tooltip

function computeTooltipPosition(
  rect: SpotlightRect,
  placement: TourStep["placement"],
  vw: number,
  vh: number
): React.CSSProperties {
  const { top, left, width, height, padding } = rect;
  const x = left - padding;
  const y = top - padding;
  const w = width + padding * 2;
  const h = height + padding * 2;

  switch (placement) {
    case "bottom":
      return {
        top: Math.min(y + h + TOOLTIP_GAP, vh - 260),
        left: Math.max(8, Math.min(x + w / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8)),
      };
    case "top":
      return {
        top: Math.max(8, y - TOOLTIP_GAP - 240),
        left: Math.max(8, Math.min(x + w / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8)),
      };
    case "right":
      return {
        top: Math.max(8, Math.min(y + h / 2 - 120, vh - 280)),
        left: Math.min(x + w + TOOLTIP_GAP, vw - TOOLTIP_W - 8),
      };
    case "left":
      return {
        top: Math.max(8, Math.min(y + h / 2 - 120, vh - 280)),
        left: Math.max(8, x - TOOLTIP_W - TOOLTIP_GAP),
      };
    case "center":
    default:
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
  }
}

function TooltipBox({
  step,
  stepIndex,
  totalSteps,
  spotlightRect,
  onNext,
  onPrev,
  onClose,
  isCorrectPage,
  isInteractive,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  spotlightRect: SpotlightRect | null;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isCorrectPage: boolean;
  isInteractive: boolean;
}) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const posStyle: React.CSSProperties =
    spotlightRect
      ? computeTooltipPosition(spotlightRect, step.placement, vw, vh)
      : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  const isLast = stepIndex === totalSteps - 1;

  const bodyContent = isInteractive
    ? "Gene mutation 'EGFR T790M' has been copied to your clipboard. \n\nPlease click into the highlighted search box, paste it, and click the Launch button to witness the 22 AI agents in action! \n\nThe tour will resume automatically as soon as the pipeline starts."
    : !isCorrectPage && step.page?.includes("[sessionId]")
    ? "To continue the tour, please launch an analysis by clicking the 'Launch' button, or open an existing run from your Discoveries."
    : step.body;

  const lines = bodyContent.split("\n");

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        position: "fixed",
        zIndex: 9999,
        width: TOOLTIP_W,
        ...posStyle,
        pointerEvents: "all",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--border)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "var(--muted)",
            borderBottom: "1px solid var(--border)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {step.icon && (
            <span
              style={{
                fontSize: 18,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {step.icon}
            </span>
          )}
          <span
            style={{
              fontFamily: "'Trebuchet MS', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--primary)",
              letterSpacing: 0.2,
              flex: 1,
            }}
          >
            {step.title}
          </span>
          {/* Close */}
          <button
            onClick={onClose}
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              padding: "2px 4px",
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
              borderRadius: 4,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.color = "var(--foreground)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.color = "var(--muted-foreground)")
            }
            aria-label="Close tour"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 16px 12px" }}>
          {lines.map((line, i) =>
            line === "" ? (
              <div key={i} style={{ height: 8 }} />
            ) : (
              <p
                key={i}
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color:
                    line.startsWith("✅") ||
                    line.startsWith("🟢") ||
                    line.startsWith("🔴") ||
                    line.startsWith("📚") ||
                    line.startsWith("🏗") ||
                    line.startsWith("🧪") ||
                    line.startsWith("🏥") ||
                    line.startsWith("A —") ||
                    line.startsWith("D —") ||
                    line.startsWith("M —") ||
                    line.startsWith("E —") ||
                    line.startsWith("T —")
                      ? "var(--muted-foreground)"
                      : "var(--foreground)",
                  fontFamily: "'Calibri', sans-serif",
                  fontWeight:
                    line.startsWith("✅") ||
                    line.startsWith("🟢") ||
                    line.startsWith("🔴")
                      ? 400
                      : 400,
                  paddingLeft:
                    line.startsWith("✅") ||
                    line.startsWith("🟢") ||
                    line.startsWith("🔴") ||
                    line.startsWith("📚") ||
                    line.startsWith("🏗") ||
                    line.startsWith("🧪") ||
                    line.startsWith("🏥") ||
                    line.startsWith("A —") ||
                    line.startsWith("D —") ||
                    line.startsWith("M —") ||
                    line.startsWith("E —") ||
                    line.startsWith("T —")
                      ? 4
                      : 0,
                }}
              >
                {line}
              </p>
            )
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => useTourStore.getState().goTo(i)}
                style={{
                  width: i === stepIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === stepIndex
                      ? "var(--primary)"
                      : i < stepIndex
                      ? "hsl(var(--primary) / 0.4)"
                      : "var(--border)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.2s",
                }}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {stepIndex > 0 && (
              <button
                onClick={onPrev}
                type="button"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--muted-foreground)",
                  fontSize: 12,
                  fontFamily: "'Calibri', sans-serif",
                  padding: "6px 12px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "var(--muted)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                }
              >
                ← Back
              </button>
            )}
            {isInteractive ? (
              <span className="text-[12px] font-bold text-primary font-mono bg-primary/10 px-3 py-1.5 rounded-md">
                Waiting for Launch...
              </span>
            ) : bodyContent.includes("[Pause]") ? (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("tour:pause-for-pipeline"));
                  window.dispatchEvent(new CustomEvent("tour:check-pipeline"));
                  onClose();
                }}
                type="button"
                style={{
                  background: "var(--primary)",
                  border: "1px solid var(--primary)",
                  borderRadius: 6,
                  color: "var(--primary-foreground)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Trebuchet MS', sans-serif",
                  padding: "6px 16px",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
                }
              >
                Pause Tour
              </button>
            ) : bodyContent.includes("[Copy]") ? (
              <button
                onClick={() => {
                  navigator.clipboard.writeText("EGFR T790M");
                  // Trigger interactive paste mode using close callback, we'll handle this securely downstream.
                  // Actually, let's just dispatch an event so parent can hide tooltip but keep overlay.
                  window.dispatchEvent(new CustomEvent("tour:interactive-mode"));
                }}
                type="button"
                style={{
                  background: "var(--primary)",
                  border: "1px solid var(--primary)",
                  borderRadius: 6,
                  color: "var(--primary-foreground)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Trebuchet MS', sans-serif",
                  padding: "6px 16px",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
                }
              >
                Copy & Paste →
              </button>
            ) : (
              <button
                onClick={onNext}
                type="button"
                style={{
                  background: isLast ? "transparent" : "var(--primary)",
                  border: isLast
                    ? "1px solid var(--primary)"
                    : "1px solid var(--primary)",
                  borderRadius: 6,
                  color: isLast ? "var(--primary)" : "var(--primary-foreground)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Trebuchet MS', sans-serif",
                  padding: "6px 16px",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
                }
              >
                {isLast ? "Finish tour" : "Next →"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step counter */}
      <div
        style={{
          textAlign: "center",
          marginTop: 8,
          fontSize: 11,
          color: "var(--muted-foreground)",
          fontFamily: "'Calibri', sans-serif",
          letterSpacing: 0.5,
        }}
      >
        Step {stepIndex + 1} of {totalSteps}
      </div>
    </motion.div>
  );
}

// ─── WELCOME AND RESUME MODALS ────────────────────────────────────────────────

function ResumeModal({
  onResume,
  onDecline,
}: {
  onResume: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5, 10, 20, 0.8)",
        backdropFilter: "blur(4px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.28, ease: "easeOut" }}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "36px 40px",
          maxWidth: 460,
          width: "90vw",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--muted)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 20px",
          }}
        >
          🔬
        </div>

        <h2
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--foreground)",
            margin: "0 0 8px",
            letterSpacing: 0.3,
          }}
        >
          Pipeline complete!
        </h2>

        <p
          style={{
            fontFamily: "'Calibri', sans-serif",
            fontSize: 15,
            color: "var(--muted-foreground)",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          The 22 agents have successfully finished generating and docking new molecule candidates. Would you like to resume the tour to explore your results?
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onDecline}
            type="button"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--muted-foreground)",
              fontSize: 14,
              fontFamily: "'Calibri', sans-serif",
              padding: "10px 20px",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "var(--muted)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
            }
          >
            No thanks
          </button>
          <button
            onClick={onResume}
            type="button"
            style={{
              background: "var(--primary)",
              border: "1px solid var(--primary)",
              borderRadius: 8,
              color: "var(--primary-foreground)",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Trebuchet MS', sans-serif",
              padding: "10px 24px",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
            }
          >
            Resume Tour
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── WELCOME MODAL ────────────────────────────────────────────────────────────

function WelcomeModal({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5, 10, 20, 0.8)",
        backdropFilter: "blur(4px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.28, ease: "easeOut" }}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "36px 40px",
          maxWidth: 460,
          width: "90vw",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        {/* Animated DNA icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--muted)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 20px",
          }}
        >
          🧬
        </div>

        <h2
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--foreground)",
            margin: "0 0 8px",
            letterSpacing: 0.3,
          }}
        >
          Welcome to Drug Discovery AI
        </h2>

        <p
          style={{
            fontFamily: "'Calibri', sans-serif",
            fontSize: 15,
            color: "var(--muted-foreground)",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          This platform uses 22 AI agents to find potential drug molecules for
          specific gene mutations — all in under 60 seconds.
        </p>

        <div
          style={{
            background: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 28,
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontFamily: "'Trebuchet MS', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--primary)",
              margin: "0 0 6px",
            }}
          >
            New to this? Take the guided tour!
          </p>
          <p
            style={{
              fontFamily: "'Calibri', sans-serif",
              fontSize: 13,
              color: "var(--muted-foreground)",
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            We'll spotlight each part of the platform and explain exactly what
            it does — in plain English, no science degree needed.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onSkip}
            type="button"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--muted-foreground)",
              fontSize: 14,
              fontFamily: "'Calibri', sans-serif",
              padding: "10px 20px",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "var(--muted)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
            }
          >
            Skip tour
          </button>
          <button
            onClick={onStart}
            type="button"
            style={{
              background: "var(--primary)",
              border: "none",
              borderRadius: 8,
              color: "var(--primary-foreground)",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Trebuchet MS', sans-serif",
              padding: "10px 28px",
              cursor: "pointer",
              letterSpacing: 0.3,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
            }
          >
            Start the tour →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN TOUR GUIDE COMPONENT ────────────────────────────────────────────────

export interface TourGuideProps {
  /** Whether Easy Mode is currently active (tour only shows in Easy Mode) */
  isEasyMode: boolean;
  children: React.ReactNode;
}

export default function TourGuide({ isEasyMode, children }: TourGuideProps) {
  const { isActive, currentIndex, startTour, stopTour, next, prev, goTo } =
    useTourStore();

  const [showWelcome, setShowWelcome] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [isInteractive, setIsInteractive] = useState(false);
  
  const isPendingResumeRef = useRef(false);
  const completedSessionIdRef = useRef<string | null>(null);
  const [isPendingResume, setIsPendingResume] = useState(false);

  const step = TOUR_STEPS[currentIndex];
  const pathname = usePathname();
  const router = useRouter();

  const isCorrectPage = step?.page 
    ? (step.page.includes("[sessionId]") ? pathname.startsWith("/analysis/") : pathname === step.page)
    : true;

  // Auto layout router
  useEffect(() => {
    if (!isActive || !step || !step.page) return;
    
    // Auto advance if we were waiting for launch and the user actually launched.
    if (isInteractive && pathname.startsWith("/analysis/")) {
      setIsInteractive(false);
      next();
      return; 
    }

    if (!isCorrectPage && !step.page.includes("[")) {
      router.push(step.page);
    }
  }, [isActive, step, isCorrectPage, router, isInteractive, pathname, next]);

  // Listen for the custom event to enter interactive mode (hide tooltip)
  useEffect(() => {
    const handleInteractive = () => setIsInteractive(true);
    window.addEventListener("tour:interactive-mode", handleInteractive);
    return () => window.removeEventListener("tour:interactive-mode", handleInteractive);
  }, []);

  // Listen for pause and pipeline completion events
  useEffect(() => {
    const handlePause = () => {
      isPendingResumeRef.current = true;
      setIsPendingResume(true);
    };
    const handleComplete = (e: any) => {
      if (e.detail?.sessionId) {
        completedSessionIdRef.current = e.detail.sessionId;
      }
      // Logic 1: If the tour was explicitly paused by user clicking "Grab a coffee"
      if (isPendingResumeRef.current) {
        isPendingResumeRef.current = false;
        setIsPendingResume(false);
        setTimeout(() => {
          setShowResumeModal(true);
        }, 500);
      } 
      // Logic 2: If the tour is still active and visible, but we were on the "waiting" step
      else if (isActive && step?.id === "waiting-for-pipeline") {
        setTimeout(() => {
          next();
        }, 800);
      }
    };
    window.addEventListener("tour:pause-for-pipeline", handlePause);
    window.addEventListener("tour:pipeline-complete", handleComplete);
    return () => {
      window.removeEventListener("tour:pause-for-pipeline", handlePause);
      window.removeEventListener("tour:pipeline-complete", handleComplete);
    };
  }, [isActive, step, next]);

  useEffect(() => {
    if (!isActive) setIsInteractive(false);
  }, [isActive]);

  // Show welcome modal manually via event
  useEffect(() => {
    const handleShowWelcome = () => setShowWelcome(true);
    window.addEventListener("tour:show-welcome", handleShowWelcome);
    return () => window.removeEventListener("tour:show-welcome", handleShowWelcome);
  }, []);

  // Stop tour if user switches out of easy mode
  useEffect(() => {
    if (!isEasyMode) {
      stopTour();
      setShowWelcome(false);
    }
  }, [isEasyMode, stopTour]);

  // Find and measure the spotlight target element
  const measureTarget = useCallback(() => {
    if (!isActive || !step || !isCorrectPage) {
      setSpotlightRect((prev) => (prev !== null ? null : prev));
      return;
    }
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (!el) {
      setSpotlightRect((prev) => (prev !== null ? null : prev));
      return;
    }
    const rect = el.getBoundingClientRect();
    const pad = step.padding ?? 12;

    setSpotlightRect((prev) => {
      if (
        prev &&
        prev.top === rect.top &&
        prev.left === rect.left &&
        prev.width === rect.width &&
        prev.height === rect.height &&
        prev.padding === pad
      ) {
        return prev;
      }
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        padding: pad,
      };
    });
  }, [isActive, step, isCorrectPage]);

  useLayoutEffect(() => {
    measureTarget();
  }, [measureTarget]);

  // Scroll into view ONLY ONCE when the step changes
  useEffect(() => {
    if (!isActive || !step || !isCorrectPage) return;
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isActive, step, isCorrectPage, currentIndex]);

  // Re-measure on resize, scroll, or DOM mutation
  useEffect(() => {
    if (!isActive) return;
    const handler = () => measureTarget();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);

    const observer = new MutationObserver(handler);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      observer.disconnect();
    };
  }, [isActive, measureTarget]);

  const handleOverlayClick = () => {
    if (window.confirm("Do you want to quit the tour?")) {
      stopTour();
    }
  };

  return (
    <>
      {children}

      <AnimatePresence>
        {showWelcome && !isActive && (
          <WelcomeModal
            onStart={() => {
              setShowWelcome(false);
              startTour();
            }}
            onSkip={() => setShowWelcome(false)}
          />
        )}
        {showResumeModal && !isActive && (
          <ResumeModal
            onResume={() => {
              setShowResumeModal(false);
              
              // Handle cross-page navigation
              if (completedSessionIdRef.current) {
                const targetPath = `/analysis/${completedSessionIdRef.current}`;
                if (!pathname.startsWith(targetPath)) {
                  router.push(targetPath);
                }
              }

              startTour();
              const targetIdx = TOUR_STEPS.findIndex((s) => s.id === "molecule-cards");
              if (targetIdx !== -1) {
                goTo(targetIdx);
              }
            }}
            onDecline={() => setShowResumeModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isActive && (
          <>
            <SpotlightOverlay
              rect={spotlightRect}
              onClick={handleOverlayClick}
            />
            <TooltipBox
              step={step}
              stepIndex={currentIndex}
              totalSteps={TOUR_STEPS.length}
              spotlightRect={spotlightRect}
              onNext={next}
              onPrev={prev}
              onClose={stopTour}
              isCorrectPage={isCorrectPage}
              isInteractive={isInteractive}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── RESTART TOUR BUTTON ──────────────────────────────────────────────────────
// Drop this anywhere in Easy Mode UI to let users re-trigger the tour.

export function RestartTourButton() {
  const startTour = useTourStore((s) => s.startTour);
  return (
    <button
      onClick={startTour}
      type="button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "var(--muted)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        color: "var(--primary)",
        fontSize: 13,
        fontFamily: "'Trebuchet MS', sans-serif",
        fontWeight: 600,
        padding: "7px 14px",
        cursor: "pointer",
        letterSpacing: 0.2,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "hsl(var(--primary) / 0.1)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "var(--muted)")
      }
    >
      🧭 Restart tour
    </button>
  );
}
