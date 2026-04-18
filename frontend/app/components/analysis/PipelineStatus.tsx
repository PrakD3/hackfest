"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Circle, CircleDashed, Loader2 } from "lucide-react";
import type { AgentEvent } from "@/app/lib/types";

const AGENTS = [
  // Stage 1: Data Acquisition
  { id: "MutationParser", label: "MutationParser" },
  { id: "Planner", label: "Planner" },
  { id: "Fetch", label: "Fetch (PubMed/UniProt/PDB/PubChem)" },
  // Stage 2-3: Structure & Variant Analysis
  { id: "StructurePrep", label: "StructurePrep" },
  { id: "VariantEffect", label: "VariantEffect" },
  // Stage 4-5: Pocket & Molecule Design
  { id: "PocketDetection", label: "PocketDetection" },
  { id: "MoleculeGeneration", label: "MoleculeGeneration" },
  // Stage 6-9: Docking & Safety
  { id: "Docking", label: "Docking" },
  { id: "Selectivity", label: "Selectivity" },
  { id: "ADMET", label: "ADMET" },
  { id: "LeadOptimization", label: "LeadOptimization" },
  // Stage 10-11: Ranking & Validation
  { id: "GNNAffinity", label: "GNNAffinity" },
  { id: "MDValidation", label: "MDValidation" },
  // Stage 12-14: Context Analysis
  { id: "Resistance", label: "Resistance" },
  { id: "Similarity", label: "Similarity" },
  { id: "Synergy", label: "Synergy" },
  // Stage 15-16: Output Generation
  { id: "ClinicalTrial", label: "ClinicalTrial" },
  { id: "Synthesis", label: "Synthesis" },
  { id: "Explainability", label: "Explainability" },
  { id: "Report", label: "Report" },
];

type AgentStatus = "running" | "complete" | "error" | "waiting" | "skipped";

interface Props {
  events: AgentEvent[];
  isComplete: boolean;
  isCancelled?: boolean;
  agentStatuses?: Record<string, string>;
  startTime?: number;
}

function normalizeAgentName(name: string): string {
  // Backend emits "<Name>Agent" while UI labels omit the suffix.
  return name.endsWith("Agent") ? name.slice(0, -5) : name;
}

function mapAgentStatus(status: string): AgentStatus {
  if (status === "running") return "running";
  if (status === "complete") return "complete";
  if (status === "failed") return "error";
  if (status === "skipped") return "skipped";
  return "waiting";
}

export function PipelineStatus({ events, isComplete, isCancelled, agentStatuses, startTime }: Props) {
  const statusMap: Record<string, AgentStatus> = {};
  if (agentStatuses) {
    for (const [name, status] of Object.entries(agentStatuses)) {
      const key = normalizeAgentName(name);
      statusMap[key] = mapAgentStatus(status);
    }
  }
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
    <div className="space-y-1 p-4 min-h-[620px] rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Pipeline Progress</h3>
        {!isComplete && startTime && (
          <span className="text-xs text-[var(--muted-foreground)]">{elapsed}s</span>
        )}
        {isCancelled && <span className="text-xs text-amber-600 font-medium">Stopped</span>}
        {!isCancelled && isComplete && (
          <span className="text-xs text-emerald-600 font-medium">✓ Complete</span>
        )}
      </div>
      <AnimatePresence>
        {AGENTS.map((agent) => {
          const status: AgentStatus = statusMap[agent.id] ?? "waiting";
          return (
            <motion.div
              key={agent.id}
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
                <Loader2 size={12} className="text-[var(--primary)] shrink-0 animate-spin" />
              )}
              {status === "error" && (
                <AlertCircle size={12} className="text-[var(--destructive)] shrink-0" />
              )}
              {status === "skipped" && (
                <CircleDashed size={12} className="text-[var(--muted-foreground)] shrink-0" />
              )}
              {status === "waiting" && (
                <Circle size={12} className="text-[var(--muted-foreground)] shrink-0" />
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
                {agent.label}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
