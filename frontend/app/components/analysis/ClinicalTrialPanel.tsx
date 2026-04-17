"use client";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import type { ClinicalTrial } from "@/app/lib/types";

interface Props {
  trials: ClinicalTrial[];
}

function phaseVariant(phase: string): "success" | "warning" | "secondary" {
  if (phase.includes("3") || phase.includes("4")) return "success";
  if (phase.includes("2")) return "warning";
  return "secondary";
}

export function ClinicalTrialPanel({ trials }: Props) {
  if (!trials.length) {
    return (
      <div className="text-sm text-[var(--muted-foreground)] p-4 text-center">
        No matching clinical trials found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trials.map((t) => (
        <div
          key={t.nct_id}
          className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
        >
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant={phaseVariant(t.phase)}>{t.phase}</Badge>
                <Badge variant={t.status === "Recruiting" ? "default" : "outline"}>
                  {t.status}
                </Badge>
                <span className="text-xs font-mono text-[var(--muted-foreground)]">{t.nct_id}</span>
              </div>
              <p className="text-sm font-medium leading-snug">{t.title}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Condition: {t.condition}
              </p>
              {t.interventions.length > 0 && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Interventions: {t.interventions.join(", ")}
                </p>
              )}
            </div>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1 rounded hover:bg-[var(--muted)]"
            >
              <ExternalLink size={14} className="text-[var(--primary)]" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
