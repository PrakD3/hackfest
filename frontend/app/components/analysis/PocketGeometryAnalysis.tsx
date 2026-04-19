import { AlertCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { useModeStore } from "@/components/ModeToggle";
import { simplifyTerm } from "@/app/lib/easy-mode";

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
  const { isEasyMode } = useModeStore();
  const getVolumeTrend = (delta?: number) => {
    if (delta === undefined) return null;
    if (delta > 50) return { label: "Expanded", color: "text-blue-500" };
    if (delta < -50) return { label: "Contracted", color: "text-red-500" };
    return { label: "Minimal", color: "text-gray-500" };
  };

  const getDesignImplications = () => {
    const implications: string[] = [];

    if (volumeDelta && volumeDelta > 30) {
      implications.push("✓ Larger aromatic rings or bulkier substituents will fit the expanded pocket");
    }
    if (volumeDelta && volumeDelta < -30) {
      implications.push("✓ More compact structures are required to avoid clashes");
    }

    if (hydrophobicityDelta && hydrophobicityDelta < -0.2) {
      implications.push(isEasyMode ? "✓ Better for water-attracting groups" : "✓ More polar groups (NH, OH) will engage with newly hydrophilic pocket");
    }
    if (hydrophobicityDelta && hydrophobicityDelta > 0.2) {
      implications.push(isEasyMode ? "✓ Better for oily/greasy groups" : "✓ More lipophilic substituents (CF3, phenyl) will fill hydrophobic regions");
    }

    if (polarityDelta && polarityDelta > 0.1) {
      implications.push("✓ H-bond donors/acceptors are now more favorable");
    }

    if (implications.length === 0) {
      implications.push("✓ Subtle geometrical changes require careful structure optimization");
    }

    return implications;
  };

  const volumeTrend = getVolumeTrend(volumeDelta);
  const implications = getDesignImplications();

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{simplifyTerm("Pocket Geometry Analysis", isEasyMode)}</h3>
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
            <div className="text-xs text-[var(--muted-foreground)] mb-1">{simplifyTerm("Volume Change", isEasyMode)}</div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className={volumeTrend?.color} />
              <span className="font-semibold">
                {volumeDelta > 0 ? "+" : ""}
                {volumeDelta.toFixed(1)} Å³
              </span>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{volumeTrend?.label}</div>
          </div>
        )}

        {hydrophobicityDelta !== undefined && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">{simplifyTerm("Hydrophobicity", isEasyMode)}</div>
            <span className="font-semibold">
              {hydrophobicityDelta > 0 ? "+" : ""}
              {hydrophobicityDelta.toFixed(2)}
            </span>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {hydrophobicityDelta > 0 ? "More lipophilic" : "More polar"}
            </div>
          </div>
        )}

        {polarityDelta !== undefined && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">{simplifyTerm("Polarity", isEasyMode)}</div>
            <span className="font-semibold">
              {polarityDelta > 0 ? "+" : ""}
              {polarityDelta.toFixed(2)}
            </span>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {polarityDelta > 0 ? "More polar" : "More nonpolar"}
            </div>
          </div>
        )}

        {chargeDelta !== undefined && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Charge</div>
            <span className="font-semibold">
              {chargeDelta > 0 ? "+" : ""}
              {chargeDelta.toFixed(2)}
            </span>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {chargeDelta === 0 ? "No change" : "Electrostatic shift"}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          💡 Why These Molecules Were Designed
        </p>
        <ul className="space-y-1">
          {implications.map((impl, idx) => (
            <li key={idx} className="text-xs text-blue-800 dark:text-blue-200">
              {impl}
            </li>
          ))}
        </ul>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-3 border-t border-blue-500/20 pt-2">
          The generated molecules were specifically designed to fit the mutant pocket geometry rather than 
          copy existing drugs. Each structural feature targets a specific geometric or chemical change.
        </p>
      </div>
    </div>
  );
}
