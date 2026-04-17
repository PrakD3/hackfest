"use client";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";

interface ConfidenceBannerProps {
  tier: "WELL_KNOWN" | "PARTIAL" | "NOVEL";
  plddt?: number;
  esm1vScore?: number;
  esm1vLabel?: "PATHOGENIC" | "UNCERTAIN" | "BENIGN";
  disclaimer: string;
}

export function ConfidenceBanner({
  tier,
  plddt,
  esm1vScore,
  esm1vLabel,
  disclaimer,
}: ConfidenceBannerProps) {
  const tierConfig = {
    WELL_KNOWN: {
      color: "bg-emerald-500/10 border-emerald-500/30",
      icon: CheckCircle,
      label: "Well-Known Target",
      description: "Clinical data available. Results contextualized by experimental evidence.",
    },
    PARTIAL: {
      color: "bg-amber-500/10 border-amber-500/30",
      icon: AlertTriangle,
      label: "Partial Evidence",
      description: "Some experimental data available. Results carry moderate uncertainty.",
    },
    NOVEL: {
      color: "bg-red-500/10 border-red-500/30",
      icon: AlertCircle,
      label: "Novel / No Clinical Data",
      description: "No prior experimental validation. Results are computational hypothesis only.",
    },
  };

  const config = tierConfig[tier];
  const IconComponent = config.icon;

  return (
    <div className={`rounded-xl border p-6 space-y-4 ${config.color}`}>
      <div className="flex items-start gap-3">
        <IconComponent size={20} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{config.label}</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            {config.description}
          </p>
        </div>
      </div>

      {(plddt !== undefined || esm1vScore !== undefined) && (
        <div className="space-y-2 pt-2 border-t border-[var(--border)]/50">
          {plddt !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">
                Structure Confidence (pLDDT)
              </span>
              <Badge variant={plddt >= 90 ? "success" : plddt >= 70 ? "secondary" : "destructive"}>
                {plddt.toFixed(1)}
              </Badge>
            </div>
          )}
          {esm1vScore !== undefined && esm1vLabel && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">
                Variant Effect (ESM-1v)
              </span>
              <Badge
                variant={
                  esm1vLabel === "PATHOGENIC"
                    ? "destructive"
                    : esm1vLabel === "BENIGN"
                      ? "success"
                      : "secondary"
                }
              >
                {esm1vLabel} ({esm1vScore.toFixed(2)})
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg bg-[var(--muted)]/40 p-3 border border-[var(--border)]/50">
        <p className="text-xs text-[var(--muted-foreground)]">
          ⚠️ <strong>Disclaimer:</strong> {disclaimer}
        </p>
      </div>
    </div>
  );
}
