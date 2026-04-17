"use client";
import { TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";

interface PocketGeometryProps {
  volumeDelta?: number;
  hydrophobicityDelta?: number;
  polarityDelta?: number;
  chargeDelta?: number;
  pocketReshaped?: boolean;
}

export function PocketGeometryAnalysis({
  volumeDelta,
  hydrophobicityDelta,
  polarityDelta,
  chargeDelta,
  pocketReshaped,
}: PocketGeometryProps) {
  const getVolumeTrend = (delta?: number) => {
    if (delta === undefined) return null;
    if (delta > 50) return { label: "Expanded", color: "text-blue-500" };
    if (delta < -50) return { label: "Contracted", color: "text-red-500" };
    return { label: "Minimal", color: "text-gray-500" };
  };

  const volumeTrend = getVolumeTrend(volumeDelta);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Pocket Geometry Analysis</h3>
        {pocketReshaped && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle size={12} />
            Reshaped
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {volumeDelta !== undefined && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">
              Volume Change
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className={volumeTrend?.color} />
              <span className="font-semibold">
                {volumeDelta > 0 ? "+" : ""}{volumeDelta.toFixed(1)} Å³
              </span>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {volumeTrend?.label}
            </div>
          </div>
        )}

        {hydrophobicityDelta !== undefined && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">
              Hydrophobicity
            </div>
            <span className="font-semibold">
              {hydrophobicityDelta > 0 ? "+" : ""}{hydrophobicityDelta.toFixed(2)}
            </span>
          </div>
        )}

        {polarityDelta !== undefined && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">
              Polarity
            </div>
            <span className="font-semibold">
              {polarityDelta > 0 ? "+" : ""}{polarityDelta.toFixed(2)}
            </span>
          </div>
        )}

        {chargeDelta !== undefined && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">
              Charge
            </div>
            <span className="font-semibold">
              {chargeDelta > 0 ? "+" : ""}{chargeDelta.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          💡 The mutation geometrically reshaped the binding pocket. Novel molecules were designed
          to fit the new geometry rather than copy existing compounds.
        </p>
      </div>
    </div>
  );
}
