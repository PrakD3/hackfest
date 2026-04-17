"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, AlertCircle, Loader2 } from "lucide-react";
import type { AgentEvent } from "@/app/lib/types";

const AGENTS = [
  // Stage 1: Data Acquisition
  "MutationParser",
  "Planner",
  "Fetch (PubMed/UniProt/PDB/PubChem)",
  // Stage 2-3: Structure & Variant Analysis
  "StructurePrep",
  "VariantEffect",
  // Stage 4-5: Pocket & Molecule Design
  "PocketDetection",
  "MoleculeGeneration",
  // Stage 6-9: Docking & Safety
  "Docking",
  "Selectivity",
  "ADMET",
  "LeadOptimization",
  // Stage 10-11: Ranking & Validation
  "GNNAffinity",
  "MDValidation",
  // Stage 12-14: Context Analysis
  "Resistance",
  "Similarity",
  "Synergy",
  // Stage 15-16: Output Generation
  "ClinicalTrial",
  "Synthesis",
  "Explainability",
  "Report",
];

type AgentStatus = "running" | "complete" | "error" | "waiting";

interface Props {
  events: AgentEvent[];
  isComplete: boolean;
  startTime?: number;
}

function normalizeAgentName(name: string): string {
  // Backend emits "<Name>Agent" while UI labels omit the suffix.
  return name.endsWith("Agent") ? name.slice(0, -5) : name;
}

export function PipelineStatus({ events, isComplete, startTime }: Props) {
  const statusMap: Record<string, AgentStatus> = {};
  for (const e of events) {
    if (e.agent) {
      const key = normalizeAgentName(e.agent);
      if (e.event === "agent_start") statusMap[key] = "running";
      if (e.event === "agent_complete") statusMap[key] = "complete";
      if (e.event === "agent_error") statusMap[key] = "error";
    }
  }

  const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

  return (
    <div className="space-y-1 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Pipeline Progress</h3>
        {!isComplete && startTime && (
          <span className="text-xs text-[var(--muted-foreground)]">{elapsed}s</span>
        )}
        {isComplete && (
          <span className="text-xs text-emerald-600 font-medium">✓ Complete</span>
        )}
      </div>
      <AnimatePresence>
        {AGENTS.map((agent) => {
          const status: AgentStatus = statusMap[agent] ?? "waiting";
          return (
            <motion.div
              key={agent}
              layout
              className="flex items-center gap-2 py-1 px-2 rounded text-xs"
              style={{
                background: status === "running" ? "var(--accent)" : "transparent",
              }}
            >
              {status === "complete" && (
                <CheckCircle size={12} className="text-emerald-500 shrink-0" />
              )}
              {status === "running" && (
                <Loader2
                  size={12}
                  className="text-[var(--primary)] shrink-0 animate-spin"
                />
              )}
              {status === "error" && (
                <AlertCircle
                  size={12}
                  className="text-[var(--destructive)] shrink-0"
                />
              )}
              {status === "waiting" && (
                <Circle
                  size={12}
                  className="text-[var(--muted-foreground)] shrink-0"
                />
              )}
              <span
                className={
                  status === "running"
                    ? "font-medium"
                    : status === "complete"
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                }
              >
                {agent}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
