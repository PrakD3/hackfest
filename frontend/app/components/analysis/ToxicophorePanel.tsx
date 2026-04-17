"use client";
import type { ToxicophoreHighlight } from "@/app/lib/types";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  highlights: ToxicophoreHighlight[];
}

export function ToxicophorePanel({ highlights }: Props) {
  if (!highlights.length) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-200">
        <CheckCircle size={16} />
        No toxicophore flags — all leads are PAINS-clean
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {highlights.map((h, i) => (
        <div
          key={i}
          className="p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-2"
        >
          <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
            <AlertTriangle size={14} />
            ⚠ PAINS Alert: {h.pains_match_name}
          </div>
          {h.highlight_b64 ? (
            <img
              src={`data:image/png;base64,${h.highlight_b64}`}
              alt="toxicophore"
              className="w-full rounded"
            />
          ) : (
            <div className="text-xs font-mono text-[var(--muted-foreground)]">
              Substructure: {h.pains_match_name}
            </div>
          )}
          <p className="text-xs text-amber-700">{h.reason}</p>
        </div>
      ))}
    </div>
  );
}
