"use client";
import type { PipelineMetrics } from "@/app/lib/types";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  runId: string | null;
  metrics: PipelineMetrics | null;
}

export function LangSmithTrace({ runId, metrics }: Props) {
  const [open, setOpen] = useState(false);

  if (!runId && !metrics) return null;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm hover:bg-[var(--muted)] transition-colors"
      >
        <span className="font-medium">Pipeline Trace</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="p-4 border-t border-[var(--border)] space-y-2 text-sm">
          {metrics && (
            <>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Execution time</span>
                <span>{(metrics.execution_time_ms / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">LLM Provider</span>
                <span>{metrics.llm_provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Molecules docked</span>
                <span>{metrics.molecules_docked}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">ADMET passing</span>
                <span>{metrics.admet_passing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Selective leads</span>
                <span>{metrics.selective_leads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Agents run</span>
                <span>18</span>
              </div>
            </>
          )}
          {runId && (
            <a
              href={`https://smith.langchain.com/runs/${runId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[var(--primary)] hover:underline mt-2"
            >
              <ExternalLink size={12} />
              View Pipeline Trace →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
