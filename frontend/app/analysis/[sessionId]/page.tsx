"use client";

import { AlertCircle, ArrowLeft, Loader2, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { ADMETPanel } from "@/app/components/analysis/ADMETPanel";
import { ClinicalTrialPanel } from "@/app/components/analysis/ClinicalTrialPanel";
import { ConfidenceBanner } from "@/app/components/analysis/ConfidenceBanner";
import { DockingScoreChart } from "@/app/components/analysis/DockingScoreChart";
import { EvolutionTree } from "@/app/components/analysis/EvolutionTree";
import { ExportButton } from "@/app/components/analysis/ExportButton";
import { KnowledgeGraph } from "@/app/components/analysis/KnowledgeGraph";
import { LangSmithTrace } from "@/app/components/analysis/LangSmithTrace";
import { MoleculeViewer3D } from "@/app/components/analysis/MoleculeViewer3D";
import { MDValidation } from "@/app/components/analysis/MDValidation";
import { MoleculeCard } from "@/app/components/analysis/MoleculeCard";
// Components
import { PipelineStatus } from "@/app/components/analysis/PipelineStatus";
import { PocketGeometryAnalysis } from "@/app/components/analysis/PocketGeometryAnalysis";
import { ReasoningTrace } from "@/app/components/analysis/ReasoningTrace";
import { ResistanceProfile } from "@/app/components/analysis/ResistanceProfile";
import { SaveDiscoveryButton } from "@/app/components/analysis/SaveDiscoveryButton";
import { SimilarityPanel } from "@/app/components/analysis/SimilarityPanel";
import { SynthesisRoute } from "@/app/components/analysis/SynthesisRoute";
import { ToxicophorePanel } from "@/app/components/analysis/ToxicophorePanel";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useSSEStream } from "@/app/hooks/useSSEStream";
import { cancelAnalysis, getDockedPoseUrl, getSessionResult, getStructureUrl } from "@/app/lib/api";
import { Matrix } from "@/components/unlumen-ui/matrix";
import Counter from "@/components/Counter";
import type {
  FinalReport,
  PipelineState,
  SelectivityResult,
  SynthesisScore,
} from "@/app/lib/types";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

type SelectivityTone = "high" | "moderate" | "low" | "danger";

const CLINICAL_SELECTIVITY_THRESHOLDS = {
  high: 10,
  moderate: 3.2,
  low: 1.5,
} as const;

function deriveClinicalSelectivityRow(entry: SelectivityResult): {
  targetAffinity: number | null;
  offTargetAffinity: number | null;
  foldSelectivity: number | null;
  label: string;
  tone: SelectivityTone;
} {
  const data = entry as Record<string, unknown>;
  const targetAffinity = [data.target_affinity, data.mutant_affinity].find(
    (value): value is number => typeof value === "number"
  ) ?? null;
  const offTargetAffinity = [
    data.off_target_affinity,
    data.wildtype_affinity,
    data.best_off_target_affinity,
  ].find((value): value is number => typeof value === "number") ?? null;

  let foldSelectivity: number | null = null;
  if (typeof data.fold_selectivity === "number") {
    foldSelectivity = data.fold_selectivity;
  } else if (
    typeof targetAffinity === "number" &&
    typeof offTargetAffinity === "number" &&
    offTargetAffinity !== 0
  ) {
    foldSelectivity = Math.abs(targetAffinity) / Math.abs(offTargetAffinity);
  } else if (typeof data.selectivity_ratio === "number") {
    foldSelectivity = data.selectivity_ratio;
  }

  if (typeof foldSelectivity === "number" && Number.isFinite(foldSelectivity)) {
    if (foldSelectivity >= CLINICAL_SELECTIVITY_THRESHOLDS.high) {
      return {
        targetAffinity,
        offTargetAffinity,
        foldSelectivity,
        label: "High selectivity",
        tone: "high",
      };
    }
    if (foldSelectivity >= CLINICAL_SELECTIVITY_THRESHOLDS.moderate) {
      return {
        targetAffinity,
        offTargetAffinity,
        foldSelectivity,
        label: "Moderate selectivity",
        tone: "moderate",
      };
    }
    if (foldSelectivity >= CLINICAL_SELECTIVITY_THRESHOLDS.low) {
      return {
        targetAffinity,
        offTargetAffinity,
        foldSelectivity,
        label: "Low selectivity",
        tone: "low",
      };
    }
  }

  return {
    targetAffinity,
    offTargetAffinity,
    foldSelectivity,
    label: "Non-selective",
    tone: "danger",
  };
}

export default function AnalysisPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [isLocallyStopped, setIsLocallyStopped] = useState(false);
  const { events, isComplete, error: streamError, latestState } = useSSEStream(
    sessionId,
    !isLocallyStopped
  );
  const [result, setResult] = useState<PipelineState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const startTimeRef = useRef(Date.now());
  const MATRIX_COLS = 30;
  const MATRIX_ROWS = 7;
  const [matrixLevels, setMatrixLevels] = useState<number[]>(
    Array.from({ length: MATRIX_COLS }, () => 0.2)
  );
  const ACTIVE_ANALYSIS_KEY = "dda-active-analysis";
  const STOPPED_ANALYSIS_KEY = "dda-stopped-analyses";

  const readStoppedSessions = () => {
    if (typeof window === "undefined") return [] as string[];
    const stored = localStorage.getItem(STOPPED_ANALYSIS_KEY);
    if (!stored) return [] as string[];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      return [] as string[];
    }
  };

  const writeStoppedSessions = (sessions: string[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STOPPED_ANALYSIS_KEY, JSON.stringify(sessions));
  };

  const markStoppedSession = (session: string) => {
    const sessions = readStoppedSessions();
    if (!sessions.includes(session)) {
      sessions.push(session);
      writeStoppedSessions(sessions);
    }
  };

  const unmarkStoppedSession = (session: string) => {
    const sessions = readStoppedSessions();
    const next = sessions.filter((id) => id !== session);
    if (next.length !== sessions.length) {
      writeStoppedSessions(next);
    }
  };

  const mergeAll = (prev: PipelineState | null, next: Partial<PipelineState>) => {
    return { ...(prev ?? {}), ...next } as PipelineState;
  };

  const mergeNonNull = (prev: PipelineState | null, next: Partial<PipelineState>) => {
    const merged: Record<string, unknown> = { ...(prev ?? {}) };
    for (const [key, value] of Object.entries(next)) {
      if (value !== undefined && value !== null) {
        merged[key] = value;
      }
    }
    return merged as PipelineState;
  };

  const currentAgentFromEvents = [...events].reverse().find((e) => e.event === "agent_start")?.agent;
  const currentAgentFromState = Object.entries(result?.agent_statuses ?? {}).find(
    ([, status]) => status === "running"
  )?.[0];
  const currentAgent = currentAgentFromEvents ?? currentAgentFromState;
  // Determine progress from events (fallback to stored statuses for refresh)
  const completedAgentsFromEvents = events.filter((e) => e.event === "agent_complete").length;
  const statusValues = Object.values(result?.agent_statuses ?? {});
  const completedAgentsFromState = statusValues.filter((status) => status === "complete").length;
  const completedAgents = completedAgentsFromEvents || completedAgentsFromState;
  const runningBoost = currentAgent ? 0.5 : 0;
  const progress = Math.min(95, ((completedAgents + runningBoost) / 22) * 100);
  const currentAgentId = currentAgent?.endsWith("Agent")
    ? currentAgent.slice(0, -5)
    : currentAgent;

  const agentMessages: Record<string, string> = {
    MutationParser: "Parsing mutation and validating query context.",
    Planner: "Building the execution plan for this run.",
    Fetch: "Fetching literature, sequences, structures, and known compounds.",
    StructurePrep: "Preparing protein structures (PDB/ESMFold).",
    VariantEffect: "Scoring mutation effects for pathogenicity.",
    PocketDetection: "Detecting binding pocket geometry with fpocket.",
    MoleculeGeneration: "Generating candidate molecules for the pocket.",
    Docking: "Docking candidates to estimate binding affinity.",
    Selectivity: "Comparing target vs off-target binding.",
    ADMET: "Filtering candidates by ADMET constraints.",
    LeadOptimization: "Optimizing leads via local analog exploration.",
    GNNAffinity: "Ranking candidates with GNN affinity scoring.",
    MDValidation: "Validating top leads with molecular dynamics.",
    Resistance: "Scanning potential resistance escape mutations.",
    Similarity: "Searching for known analogs and similarity matches.",
    Synergy: "Evaluating potential synergy partners.",
    ClinicalTrial: "Matching clinical trials to the target profile.",
    Synthesis: "Planning synthesis routes and cost estimates.",
    Explainability: "Assembling reasoning trace and evidence summary.",
    Report: "Compiling final ranked report.",
  };

  const hasFinal = Boolean(result?.final_report);
  const isSessionComplete = isComplete || hasFinal;
  const isStopped = isSessionComplete || isCancelled;
  const statusMessage = isCancelled
    ? "Analysis stopped."
    : currentAgentId
    ? agentMessages[currentAgentId] ?? `Running ${currentAgentId}...`
    : "Initializing pipeline...";

  useEffect(() => {
    if (isStopped) return;
    let rafId = 0;
    let lastTick = 0;

    const tick = (time: number) => {
      if (time - lastTick > 120) {
        lastTick = time;
        const intensity = Math.min(1, 0.35 + (progress / 100) * 0.6);
        setMatrixLevels((prev) =>
          prev.map((_, idx) => {
            const wave = Math.sin(time / 220 + idx * 0.6) * 0.18;
            const jitter = Math.random() * 0.2;
            const base = 0.12 + intensity * 0.55;
            return Math.max(0.05, Math.min(1, base + wave + jitter));
          })
        );
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isSessionComplete, isCancelled, progress]);

  useEffect(() => {
    if (!latestState) return;
    setResult((prev) => mergeAll(prev, latestState));
  }, [latestState]);

  useEffect(() => {
    if (
      latestState?.cancelled ||
      result?.cancelled ||
      result?.status === "cancelled" ||
      result?.status === "not_found"
    ) {
      setIsCancelled(true);
      setIsLocallyStopped(true);
      markStoppedSession(sessionId);
    }
  }, [latestState?.cancelled, result?.cancelled, result?.status, sessionId]);

  useEffect(() => {
    const stoppedSessions = readStoppedSessions();
    if (stoppedSessions.includes(sessionId)) {
      setIsCancelled(true);
      setIsLocallyStopped(true);
    }
  }, [sessionId]);

  useEffect(() => {
    let isMounted = true;

    const applySnapshot = (data: Record<string, unknown>) => {
      if (!isMounted) return;
      setResult((prev) => mergeNonNull(prev, data as PipelineState));
      const status = (data as { status?: string }).status;
      const cancelled = Boolean((data as { cancelled?: boolean }).cancelled);
      const hasFinalReport = Boolean((data as { final_report?: unknown }).final_report);
      if (status === "not_found" || status === "cancelled" || cancelled) {
        setIsCancelled(true);
        setIsLocallyStopped(true);
        markStoppedSession(sessionId);
      } else if (hasFinalReport) {
        unmarkStoppedSession(sessionId);
      }
    };

    const refresh = async () => {
      try {
        const data = await getSessionResult(sessionId);
        applySnapshot(data as Record<string, unknown>);
      } catch {
        // ignore polling errors
      }
    };

    refresh();
    const interval = window.setInterval(() => {
      if (isLocallyStopped || isCancelled || isSessionComplete) return;
      refresh();
    }, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [sessionId, isLocallyStopped, isCancelled, isSessionComplete]);

  // Load final result when complete (fallback for refresh / missed SSE)
  useEffect(() => {
    if (!isSessionComplete) return;
    if (latestState?.final_report || result?.final_report) return;
    getSessionResult(sessionId)
      .then((data) => setResult((prev) => mergeNonNull(prev, data as PipelineState)))
      .catch((e) => setLoadError(e.message));
  }, [isSessionComplete, latestState, sessionId, result?.final_report]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(ACTIVE_ANALYSIS_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { sessionId?: string; startedAt?: number };
      if (parsed?.sessionId === sessionId && parsed?.startedAt) {
        startTimeRef.current = parsed.startedAt;
      }
    } catch {
      // ignore parse errors
    }
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionId) return;
    if (isSessionComplete || isCancelled || isLocallyStopped) {
      localStorage.removeItem(ACTIVE_ANALYSIS_KEY);
      return;
    }

    const stored = localStorage.getItem(ACTIVE_ANALYSIS_KEY);
    let startedAt = Date.now();
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { startedAt?: number };
        if (parsed?.startedAt) startedAt = parsed.startedAt;
      } catch {
        localStorage.removeItem(ACTIVE_ANALYSIS_KEY);
      }
    }

    const query = typeof result?.query === "string" ? result?.query : latestState?.query;
    localStorage.setItem(
      ACTIVE_ANALYSIS_KEY,
      JSON.stringify({ sessionId, query: typeof query === "string" ? query : undefined, startedAt })
    );
  }, [sessionId, result?.query, latestState?.query, isSessionComplete, isCancelled, isLocallyStopped]);

  const handleCancel = async () => {
    if (isCancelling || isSessionComplete || isCancelled) return;
    setIsCancelling(true);
    try {
      const response = await cancelAnalysis(sessionId);
      setIsCancelled(true);
      setIsLocallyStopped(true);
      markStoppedSession(sessionId);
      if (typeof window !== "undefined") {
        localStorage.removeItem(ACTIVE_ANALYSIS_KEY);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setIsCancelling(false);
    }
  };

  const report = result?.final_report as FinalReport | null;
  const confidenceObject =
    (report as any)?.confidence_object ||
    (result as any)?.confidence ||
    (result as any)?.confidence_scores ||
    {};
  const finalConfidence =
    typeof confidenceObject?.final === "number"
      ? confidenceObject.final
      : Math.min(
          ...[
            confidenceObject?.structure,
            confidenceObject?.docking,
            confidenceObject?.selectivity,
            confidenceObject?.admet,
          ].filter((v) => typeof v === "number")
        );
  const confidenceEntries = [
    { label: "Structure", value: confidenceObject?.structure },
    { label: "Docking", value: confidenceObject?.docking },
    { label: "Selectivity", value: confidenceObject?.selectivity },
    { label: "ADMET", value: confidenceObject?.admet },
    { label: "Final", value: finalConfidence },
  ].filter((entry) => typeof entry.value === "number");
  const selectivity = (result?.selectivity_results ?? []) as SelectivityResult[];
  const normalizePdbId = (value?: string | null) => {
    const trimmed = value?.trim().toUpperCase();
    return trimmed && /^[0-9A-Z]{4}$/.test(trimmed) ? trimmed : undefined;
  };
  const primaryPdbId = normalizePdbId(result?.structures?.[0]?.pdb_id);
  const dockingResults = result?.docking_results ?? [];
  const topDock = dockingResults[0];
  const buildPoseUrl = (poseId?: string | null) =>
    poseId ? getDockedPoseUrl(sessionId, poseId) : undefined;
  const topDockPoseUrl = topDock?.pose_id ? buildPoseUrl(topDock.pose_id) : undefined;
  const proteinUrl = result?.pdb_content ? getStructureUrl(sessionId) : undefined;
  const rawSimilar = (result as Record<string, unknown> | null)?.similar_molecules;
  const similarMolecules = Array.isArray(result?.similar_compounds)
    ? result?.similar_compounds
        .map((c) => c.smiles || c.chembl_id)
        .filter(Boolean)
    : Array.isArray(rawSimilar)
      ? rawSimilar.filter((s): s is string => typeof s === "string")
      : [];
  const resistanceFlags = Array.isArray(result?.resistance_flags)
    ? result.resistance_flags
        .map((f) => f.reason || f.drug_name || f.mutation)
        .filter(Boolean)
    : [];
  const synthesisScores = (result?.sa_scores ?? []) as SynthesisScore[];
  const reasoningTrace = result?.reasoning_trace
    ? result.reasoning_trace
    : {
        "pipeline_overview": `Pipeline run for ${result?.query || "the requested target"}. ` +
          `Structures: ${result?.structures?.length ?? 0}. ` +
          `Molecules generated: ${result?.generated_molecules?.length ?? 0}. ` +
          `Docked: ${dockingResults.length}.`,
        "structure_evidence": `Structure method: ${result?.pocket_detection_method || "unknown"}. ` +
          `Binding pocket center: ` +
          `(${result?.binding_pocket?.center_x ?? 0}, ` +
          `${result?.binding_pocket?.center_y ?? 0}, ` +
          `${result?.binding_pocket?.center_z ?? 0}).`,
        "docking_summary": `Top docking score: ` +
          `${topDock?.binding_energy ?? "N/A"} kcal/mol ` +
          `(${topDock?.method ?? "unknown"}).`,
        "selectivity_summary": selectivity.length
          ? `Selective leads: ${selectivity.filter((s) => s.selective).length} / ${selectivity.length}.`
          : "Selectivity analysis not available.",
        "admet_summary": `ADMET passing: ${result?.admet_profiles?.filter((p) => p.lipinski_pass).length ?? 0} ` +
          `of ${result?.admet_profiles?.length ?? 0}.`,
        "optimization_steps": `Optimized leads: ${result?.optimized_leads?.length ?? 0}. ` +
          `Evolution nodes: ${report?.evolution_tree?.nodes?.length ?? 0}.`,
        "resistance_notes": resistanceFlags.length
          ? `Resistance flags: ${resistanceFlags.slice(0, 3).join("; ")}.`
          : "No resistance flags reported.",
        "trial_context": `Clinical trial entries: ${report?.clinical_trials?.length ?? 0}.`,
      };
  const synthesisItems = report
    ? report.ranked_leads
        .slice(0, 3)
        .map((lead: any) => ({
          key: lead.smiles,
          title: lead.compound_name || `Candidate #${lead.rank}`,
          rank: lead.rank,
          numSteps: lead.synthesis_steps,
          saScore: lead.sa_score,
          estimatedCost: lead.synthesis_cost,
        }))
        .filter((item: any) =>
          [item.numSteps, item.saScore, item.estimatedCost].some((v) => v !== undefined)
        )
    : [];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={14} />
            New Analysis
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--muted-foreground)]">
              Session: {sessionId}
            </span>
            {isSessionComplete && result && !isCancelled && (
              <SaveDiscoveryButton sessionId={sessionId} initialDiscoveryId={result.discovery_id} />
            )}
          </div>
        </div>

        {/* Error state */}
        {((streamError && !isLocallyStopped && !isCancelled) || loadError) && (
          <div className="mb-6 p-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 flex items-center gap-3">
            <AlertCircle size={16} className="text-[var(--destructive)] shrink-0" />
            <span className="text-sm">{loadError || streamError}</span>
          </div>
        )}

        {result?.warnings?.length ? (
          <div className="mb-6 p-4 rounded-lg border border-amber-400/40 bg-amber-400/10">
            <div className="text-xs font-semibold text-amber-700 mb-2">Pipeline warnings</div>
            <ul className="text-xs text-amber-900 space-y-1">
              {result.warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Main layout: sidebar + content */}
        <div className="flex gap-6 items-start">
          {/* Left: pipeline status */}
          <div className="hidden lg:block w-72 shrink-0 sticky top-20">
            {!isSessionComplete && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--muted-foreground)]">
                    {currentAgent || "Starting…"}
                  </span>
                  <span className="text-[var(--primary)] font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            <PipelineStatus
              events={events}
              isComplete={isSessionComplete}
              isCancelled={isCancelled}
              agentStatuses={result?.agent_statuses}
              startTime={startTimeRef.current}
            />
            {!isSessionComplete && !isCancelled && (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full gap-2"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop analysis
              </Button>
            )}
          </div>

          {/* Right: results */}
          <div className="flex-1 min-w-0">
            {/* Mobile progress */}
            <div className="lg:hidden mb-4">
              {!isSessionComplete && (
                <>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--muted-foreground)]">
                      {currentAgent || "Starting…"}
                    </span>
                    <span className="text-[var(--primary)] font-medium">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} />
                </>
              )}
            </div>

            {/* Loading skeletons */}
            {!isSessionComplete && (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="w-full max-w-xl p-6">
                  <div className="flex justify-center py-6">
                    <Matrix
                      rows={MATRIX_ROWS}
                      cols={MATRIX_COLS}
                      mode="vu"
                      levels={matrixLevels}
                      fps={14}
                      size={13}
                      gap={4}
                      palette={{
                        on: "var(--primary)",
                        off: "var(--border)",
                      }}
                      ariaLabel="analysis signal matrix"
                      className="text-[var(--primary)]"
                    />
                  </div>

                  <div className="text-sm text-[var(--muted-foreground)] text-center">
                    {statusMessage}
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {isSessionComplete && result && report && (
              <>
                {/* Confidence Banner */}
                {(result as any).confidence_banner && (
                  <div className="mb-6">
                    <ConfidenceBanner
                      tier={(result as any).confidence_banner?.tier || "WELL_KNOWN"}
                      plddt={(result as any).confidence_banner?.plddt}
                      esm1vScore={(result as any).esm1v_score}
                      esm1vLabel={(result as any).esm1v_confidence}
                      disclaimer={
                        (result as any).confidence_banner?.disclaimer ||
                        "All outputs are computational predictions only. Experimental synthesis and binding validation required."
                      }
                    />
                  </div>
                )}

                {/* Summary */}
                {report.summary && (
                  <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="success">Analysis Complete</Badge>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {report.metrics.execution_time_ms
                          ? `${(report.metrics.execution_time_ms / 1000).toFixed(1)}s`
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{report.summary}</p>
                  </div>
                )}

                <Tabs defaultValue="leads" className="w-full">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="leads">Top Leads</TabsTrigger>
                    <TabsTrigger value="pocket">Pocket Geometry</TabsTrigger>
                    <TabsTrigger value="selectivity">Selectivity</TabsTrigger>
                    <TabsTrigger value="evolution">Evolution Tree</TabsTrigger>
                    <TabsTrigger value="admet">ADMET</TabsTrigger>
                    <TabsTrigger value="md">Molecular Dynamics</TabsTrigger>
                    <TabsTrigger value="synthesis">Synthesis</TabsTrigger>
                    <TabsTrigger value="docking">Docking</TabsTrigger>
                    <TabsTrigger value="trials">Clinical Trials</TabsTrigger>
                    <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
                    <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                    <TabsTrigger value="literature">Literature</TabsTrigger>
                    <TabsTrigger value="export">Export</TabsTrigger>
                  </TabsList>

                  {/* Top Leads */}
                  <TabsContent value="leads">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {report.ranked_leads.slice(0, 5).map((lead: any) => (
                        <MoleculeCard
                          key={lead.smiles}
                          lead={lead}
                          rank={lead.rank}
                          pdbId={normalizePdbId(lead.structure) || primaryPdbId}
                          proteinUrl={proteinUrl}
                          ligandPoseUrl={buildPoseUrl(lead.pose_id)}
                          ligandPoseFormat={lead.pose_format}
                          showProtein={false}
                        />
                      ))}
                    </div>
                    {report.ranked_leads.length === 0 && (
                      <p className="text-sm text-[var(--muted-foreground)] p-4">
                        No leads generated.
                      </p>
                    )}
                  </TabsContent>

                  {/* Pocket Geometry */}
                  <TabsContent value="pocket">
                    <PocketGeometryAnalysis
                      volumeDelta={(result as any).pocket_delta?.volume_delta}
                      hydrophobicityDelta={(result as any).pocket_delta?.hydrophobicity_score_delta}
                      polarityDelta={(result as any).pocket_delta?.polarity_score_delta}
                      chargeDelta={(result as any).pocket_delta?.charge_score_delta}
                      pocketReshaped={(result as any).pocket_delta?.pocket_reshaped}
                    />
                  </TabsContent>

                  {/* Selectivity */}
                  <TabsContent value="selectivity">
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                      <div className="p-4 bg-[var(--muted)] border-b border-[var(--border)]">
                        <h3 className="font-semibold text-sm">Selectivity Analysis</h3>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          Fold-selectivity compares target binding against the strongest off-target
                          binder. Higher is generally safer; clinical suitability still needs
                          wet-lab validation.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--muted)]/50">
                            <tr>
                              {[
                                "Molecule",
                                "Target (kcal/mol)",
                                "Off-Target (kcal/mol)",
                                "Ratio",
                                "Label",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="p-3 text-left text-xs font-medium text-[var(--muted-foreground)]"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectivity.map((s) => {
                              const {
                                targetAffinity,
                                offTargetAffinity,
                                foldSelectivity,
                                label,
                                tone,
                              } = deriveClinicalSelectivityRow(s);

                              return (
                                <tr
                                  key={`${s.smiles}-${(s as any).off_target_pdb ?? "wt"}`}
                                  className="border-t border-[var(--border)] hover:bg-[var(--muted)]/30"
                                >
                                  <td className="p-3 font-mono text-xs max-w-32 truncate">
                                    {s.smiles.slice(0, 20)}…
                                  </td>
                                  <td className="p-3 text-emerald-600">
                                    {typeof targetAffinity === "number"
                                      ? targetAffinity.toFixed(2)
                                      : "N/A"}
                                  </td>
                                  <td className="p-3 text-red-500">
                                    {typeof offTargetAffinity === "number"
                                      ? offTargetAffinity.toFixed(2)
                                      : "N/A"}
                                  </td>
                                  <td className="p-3 font-bold">
                                    {typeof foldSelectivity === "number"
                                      ? foldSelectivity.toFixed(2)
                                      : "N/A"}
                                    ×
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                      style={{
                                        color:
                                          tone === "high"
                                            ? "var(--selectivity-high)"
                                            : tone === "moderate"
                                              ? "var(--selectivity-moderate)"
                                              : tone === "low"
                                                ? "var(--selectivity-low)"
                                                : "var(--selectivity-dangerous)",
                                        background:
                                          tone === "high"
                                            ? "color-mix(in srgb, var(--selectivity-high) 10%, transparent)"
                                            : tone === "moderate"
                                              ? "color-mix(in srgb, var(--selectivity-moderate) 10%, transparent)"
                                              : tone === "low"
                                                ? "color-mix(in srgb, var(--selectivity-low) 10%, transparent)"
                                                : "color-mix(in srgb, var(--selectivity-dangerous) 10%, transparent)",
                                      }}
                                    >
                                      {label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {!selectivity.length && (
                          <p className="p-4 text-sm text-[var(--muted-foreground)]">
                            No selectivity data.
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Evolution Tree */}
                  <TabsContent value="evolution">
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                      <div className="p-4 bg-[var(--muted)] border-b border-[var(--border)]">
                        <h3 className="font-semibold text-sm">Molecule Evolution Tree</h3>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          How seed molecules were transformed across optimization generations.
                        </p>
                      </div>
                      <EvolutionTree tree={report.evolution_tree} />
                    </div>
                  </TabsContent>

                  {/* ADMET */}
                  <TabsContent value="admet">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="rounded-xl border border-[var(--border)] p-4">
                        <h3 className="font-semibold text-sm mb-3">ADMET Profiles</h3>
                        <ADMETPanel profiles={result.admet_profiles ?? []} />
                      </div>
                      <div className="rounded-xl border border-[var(--border)] p-4">
                        <h3 className="font-semibold text-sm mb-3">Toxicophore Highlights</h3>
                        <ToxicophorePanel highlights={result.toxicophore_highlights ?? []} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Molecular Dynamics */}
                  <TabsContent value="md">
                    {result?.md_results && result.md_results.length > 0 ? (
                      <div className="space-y-4">
                        {result.md_results.map((md: any) => (
                          <MDValidation
                            key={md.smiles}
                            rmsdStable={md.rmsd_stable}
                            rmsdMean={md.rmsd_mean}
                            stabilityLabel={md.stability_label}
                            mmgbsaDg={md.mmgbsa_dg}
                            rmsdTrajectory={md.rmsd_trajectory}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)] p-4">
                        MD simulations not yet available or in progress.
                      </p>
                    )}
                  </TabsContent>

                  {/* Synthesis */}
                  <TabsContent value="synthesis">
                    {synthesisItems.length > 0 &&
                      synthesisItems.map((item: any) => (
                        <div key={item.key} className="mb-6">
                          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                            {item.title}
                            <Badge variant="secondary">{item.rank}</Badge>
                          </h4>
                          <SynthesisRoute
                            numSteps={item.numSteps}
                            saScore={item.saScore}
                            estimatedCost={item.estimatedCost}
                            synthesizable={
                              item.numSteps !== undefined ? item.numSteps <= 6 : undefined
                            }
                          />
                        </div>
                      ))}
                    {synthesisItems.length === 0 && synthesisScores.length > 0 && (
                      <div className="space-y-6">
                        {synthesisScores.slice(0, 3).map((score, i) => (
                          <div key={`${score.smiles}-${i}`}>
                            <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                              Candidate #{i + 1}
                              <Badge variant="secondary">{i + 1}</Badge>
                            </h4>
                            <SynthesisRoute
                              numSteps={score.estimated_steps}
                              saScore={score.sa_score}
                              estimatedCost={score.cost_estimate}
                              synthesizable={
                                score.estimated_steps !== undefined
                                  ? score.estimated_steps <= 6
                                  : undefined
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {synthesisItems.length === 0 && synthesisScores.length === 0 && (
                      <p className="text-sm text-[var(--muted-foreground)] p-4">
                        No synthesis data available.
                      </p>
                    )}
                  </TabsContent>

                  {/* Docking */}
                  <TabsContent value="docking">
                    {topDock ? (
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-4 mb-6">
                        <div className="rounded-xl border border-[var(--border)] p-4">
                          <h3 className="font-semibold text-sm mb-3">
                            Docked Pose (Top-ranked)
                          </h3>
                          <MoleculeViewer3D
                            pdbId={normalizePdbId(topDock.structure) || primaryPdbId}
                            proteinUrl={proteinUrl}
                            ligandPoseUrl={topDockPoseUrl}
                            ligandPoseFormat={topDock.pose_format}
                            className="h-64 rounded-lg"
                          />
                          <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
                            {topDockPoseUrl
                              ? "Docked ligand pose loaded from Vina output."
                              : "Docked pose not available for this ligand."}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                          <div>
                            <div className="text-xs text-[var(--muted-foreground)]">Ligand</div>
                            <div className="text-sm font-semibold">{topDock.compound_name}</div>
                            <div className="text-[10px] font-mono text-[var(--muted-foreground)] break-all mt-1">
                              {topDock.smiles}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--muted-foreground)]">Binding energy</span>
                            <span className="font-mono font-semibold">
                              {topDock.binding_energy.toFixed(2)} kcal/mol
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--muted-foreground)]">Method</span>
                            <span className="font-medium uppercase">{topDock.method}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--muted-foreground)]">Structure</span>
                            <span className="font-medium">
                              {normalizePdbId(topDock.structure) || primaryPdbId || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)] p-4">
                        No docking data available.
                      </p>
                    )}

                    <div className="rounded-xl border border-[var(--border)] p-4">
                      <h3 className="font-semibold text-sm mb-3">Docking Score Distribution</h3>
                      <DockingScoreChart results={dockingResults} />
                    </div>
                  </TabsContent>

                  {/* Clinical Trials */}
                  <TabsContent value="trials">
                    <div className="rounded-xl border border-[var(--border)] p-4">
                      <h3 className="font-semibold text-sm mb-3">
                        Matching Clinical Trials
                        {report.clinical_trials?.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {report.clinical_trials.length}
                          </Badge>
                        )}
                      </h3>
                      <ClinicalTrialPanel trials={report.clinical_trials ?? []} />
                    </div>
                  </TabsContent>

                  {/* Knowledge Graph */}
                  <TabsContent value="graph">
                    <div className="rounded-xl border border-[var(--border)] p-4">
                      <h3 className="font-semibold text-sm mb-3">Knowledge Graph</h3>
                      <KnowledgeGraph graph={result.knowledge_graph} />
                    </div>
                  </TabsContent>

                  {/* Reasoning */}
                  <TabsContent value="reasoning">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="rounded-xl border border-[var(--border)] p-4">
                        <h3 className="font-semibold text-sm mb-3">Agent Reasoning</h3>
                        <ReasoningTrace trace={reasoningTrace} />
                      </div>
                      <div className="rounded-xl border border-[var(--border)] p-4">
                        <h3 className="font-semibold text-sm mb-3">Resistance Analysis</h3>
                        <ResistanceProfile
                          forecast={report.resistance_forecast}
                          resistanceFlags={resistanceFlags}
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="rounded-xl border border-[var(--border)] p-4">
                          <h3 className="font-semibold text-sm mb-3">Model Confidence</h3>
                          {confidenceEntries.length > 0 ? (
                            <div className="space-y-3">
                              {confidenceEntries.map((entry) => (
                                <div key={entry.label} className="flex items-center justify-between">
                                  <span className="text-xs text-[var(--muted-foreground)]">
                                    {entry.label}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Counter
                                      value={Math.round(((entry.value as number) || 0) * 100)}
                                      fontSize={20}
                                      padding={2}
                                      gap={2}
                                      textColor="var(--foreground)"
                                      fontWeight={600}
                                      gradientFrom="transparent"
                                      gradientTo="transparent"
                                    />
                                    <span className="text-xs text-[var(--muted-foreground)]">%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-[var(--muted-foreground)]">
                              Confidence data not available.
                            </div>
                          )}
                        </div>
                        <LangSmithTrace
                          runId={result.langsmith_run_id}
                          metrics={report.metrics}
                          agentCount={Object.keys(result.agent_statuses ?? {}).length}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Literature */}
                  <TabsContent value="literature">
                    <div className="space-y-3">
                      {(result.literature ?? []).length === 0 && (
                        <p className="text-sm text-[var(--muted-foreground)] p-4">
                          No literature retrieved.
                        </p>
                      )}
                      {(result.literature ?? []).map((paper: any) => (
                        <div
                          key={paper.pubmed_id}
                          className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                        >
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pubmed_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-sm hover:text-[var(--primary)] transition-colors block mb-1"
                          >
                            {paper.title}
                          </a>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {paper.journal} · {paper.publication_date} · PMID {paper.pubmed_id}
                          </div>
                        </div>
                      ))}
                      <SimilarityPanel similarMolecules={similarMolecules} />
                    </div>
                  </TabsContent>

                  {/* Export */}
                  <TabsContent value="export">
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                        <h3 className="font-semibold text-sm mb-3">Export Discovery</h3>
                        <ExportButton sessionId={sessionId} />
                      </div>
                      <LangSmithTrace
                        runId={result.langsmith_run_id}
                        metrics={report.metrics}
                        agentCount={Object.keys(result.agent_statuses ?? {}).length}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}

            {/* Stream complete but no report yet */}
            {isSessionComplete && !report && !loadError && (
              <div className="text-sm text-[var(--muted-foreground)] p-6 text-center">
                Loading results…
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
>>>>>>> Stashed changes
