"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
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
import { Progress } from "@/app/components/ui/progress";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useSSEStream } from "@/app/hooks/useSSEStream";
import { getSessionResult } from "@/app/lib/api";
import type { FinalReport, PipelineState, SelectivityResult } from "@/app/lib/types";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function AnalysisPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { events, isComplete, error: streamError } = useSSEStream(sessionId);
  const [result, setResult] = useState<PipelineState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());

  // Determine progress from events
  const completedAgents = events.filter((e) => e.event === "agent_complete").length;
  const progress = Math.min(95, (completedAgents / 22) * 100);
  const currentAgent = [...events].reverse().find((e) => e.event === "agent_start")?.agent;

  // Load final result when complete
  useEffect(() => {
    if (!isComplete) return;
    getSessionResult(sessionId)
      .then((data) => setResult(data as unknown as PipelineState))
      .catch((e) => setLoadError(e.message));
  }, [isComplete, sessionId]);

  const report = result?.final_report as FinalReport | null;
  const selectivity = (result?.selectivity_results ?? []) as SelectivityResult[];
  const primaryPdbId = result?.structures?.[0]?.pdb_id;

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
            {isComplete && result && (
              <SaveDiscoveryButton sessionId={sessionId} initialDiscoveryId={result.discovery_id} />
            )}
          </div>
        </div>

        {/* Error state */}
        {(streamError || loadError) && (
          <div className="mb-6 p-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 flex items-center gap-3">
            <AlertCircle size={16} className="text-[var(--destructive)] shrink-0" />
            <span className="text-sm">{streamError || loadError}</span>
          </div>
        )}

        {/* Main layout: sidebar + content */}
        <div className="flex gap-6 items-start">
          {/* Left: pipeline status */}
          <div className="hidden lg:block w-56 shrink-0 sticky top-20">
            {!isComplete && (
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
              isComplete={isComplete}
              startTime={startTimeRef.current}
            />
          </div>

          {/* Right: results */}
          <div className="flex-1 min-w-0">
            {/* Mobile progress */}
            <div className="lg:hidden mb-4">
              {!isComplete && (
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
            {!isComplete && !result && (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {isComplete && result && report && (
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
                          pdbId={primaryPdbId}
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
                          Ratio = target affinity / off-target affinity. Higher is safer.
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
                            {selectivity.map((s) => (
                              <tr
                                key={`${s.smiles}-${s.off_target_pdb}`}
                                className="border-t border-[var(--border)] hover:bg-[var(--muted)]/30"
                              >
                                <td className="p-3 font-mono text-xs max-w-32 truncate">
                                  {s.smiles.slice(0, 20)}…
                                </td>
                                <td className="p-3 text-emerald-600">
                                  {s.target_affinity != null ? s.target_affinity.toFixed(2) : "N/A"}
                                </td>
                                <td className="p-3 text-red-500">
                                  {s.off_target_affinity != null
                                    ? s.off_target_affinity.toFixed(2)
                                    : "N/A"}
                                </td>
                                <td className="p-3 font-bold">
                                  {s.selectivity_ratio != null
                                    ? s.selectivity_ratio.toFixed(2)
                                    : "N/A"}
                                  ×
                                </td>
                                <td className="p-3">
                                  <span
                                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                    style={{
                                      color:
                                        s.selectivity_label === "High"
                                          ? "var(--selectivity-high)"
                                          : s.selectivity_label === "Moderate"
                                            ? "var(--selectivity-moderate)"
                                            : s.selectivity_label === "Low"
                                              ? "var(--selectivity-low)"
                                              : "var(--selectivity-dangerous)",
                                      background:
                                        s.selectivity_label === "High"
                                          ? "color-mix(in srgb, var(--selectivity-high) 10%, transparent)"
                                          : "color-mix(in srgb, var(--selectivity-dangerous) 10%, transparent)",
                                    }}
                                  >
                                    {s.selectivity_label}
                                  </span>
                                </td>
                              </tr>
                            ))}
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    {(result as any).md_results && (result as any).md_results.length > 0 ? (
                      <div className="space-y-4">
                        {(result as any).md_results.map((md: any) => (
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
                    {report.ranked_leads.slice(0, 3).map((lead: any) => (
                      <div key={lead.smiles} className="mb-6">
                        <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                          {lead.compound_name || `Candidate #${lead.rank}`}
                          <Badge variant="secondary">{lead.rank}</Badge>
                        </h4>
                        <SynthesisRoute
                          numSteps={lead.synthesis_steps}
                          saScore={lead.sa_score}
                          estimatedCost={lead.synthesis_cost}
                          synthesizable={
                            lead.synthesis_steps ? lead.synthesis_steps <= 6 : undefined
                          }
                        />
                      </div>
                    ))}
                  </TabsContent>

                  {/* Docking */}
                  <TabsContent value="docking">
                    <div className="rounded-xl border border-[var(--border)] p-4">
                      <h3 className="font-semibold text-sm mb-3">Docking Score Distribution</h3>
                      <DockingScoreChart results={result.docking_results ?? []} />
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
                        <ReasoningTrace trace={result.reasoning_trace} />
                      </div>
                      <div className="space-y-4">
                        <div className="rounded-xl border border-[var(--border)] p-4">
                          <h3 className="font-semibold text-sm mb-3">Resistance Analysis</h3>
                          <ResistanceProfile forecast={report.resistance_forecast} />
                        </div>
                        <LangSmithTrace runId={result.langsmith_run_id} metrics={report.metrics} />
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
                      <SimilarityPanel
                        similarMolecules={
                          (result as unknown as Record<string, unknown>).similar_molecules as
                            | string[]
                            | undefined
                        }
                      />
                    </div>
                  </TabsContent>

                  {/* Export */}
                  <TabsContent value="export">
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                        <h3 className="font-semibold text-sm mb-3">Export Discovery</h3>
                        <ExportButton sessionId={sessionId} />
                      </div>
                      <LangSmithTrace runId={result.langsmith_run_id} metrics={report.metrics} />
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}

            {/* Stream complete but no report yet */}
            {isComplete && !report && !loadError && (
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
