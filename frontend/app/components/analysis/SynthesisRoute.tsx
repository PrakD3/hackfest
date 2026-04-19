import { AlertCircle, DollarSign, FlaskConical } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { useModeStore } from "@/components/ModeToggle";
import { simplifyTerm, simplifyText } from "@/app/lib/easy-mode";

interface SynthesisRouteProps {
  numSteps?: number;
  saScore?: number;
  estimatedCost?: string;
  synthesizable?: boolean;
}

export function SynthesisRoute({
  numSteps,
  saScore,
  estimatedCost,
  synthesizable,
}: SynthesisRouteProps) {
  const { isEasyMode } = useModeStore();
  const getSALabel = (sa?: number): string => {
    if (sa === undefined) return "N/A";
    if (sa < 3) return "Easy";
    if (sa < 6) return "Moderate";
    return "Complex";
  };

  const getSAColor = (sa?: number): string => {
    if (sa === undefined) return "bg-gray-500/10";
    if (sa < 3) return "bg-emerald-500/10";
    if (sa < 6) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  const getSyntheticabilityBadge = (): string => {
    if (synthesizable === false) return "Not Feasible";
    if (synthesizable === true) return "Feasible";
    return "Unknown";
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FlaskConical size={16} />
          {simplifyTerm("Synthesis Planning", isEasyMode)}
        </h3>
        <Badge variant={synthesizable ? "success" : "destructive"}>
          {getSyntheticabilityBadge()}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {numSteps !== undefined && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Steps</div>
            <div className="text-2xl font-bold">{numSteps}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {numSteps <= 3 ? "Rapid" : numSteps <= 5 ? "Standard" : "Complex"}
            </div>
          </div>
        )}

        {saScore !== undefined && (
          <div className={`p-3 rounded-lg border border-[var(--border)]/50 ${getSAColor(saScore)}`}>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">{simplifyTerm("SA Score", isEasyMode)}</div>
            <div className="text-2xl font-bold">{saScore.toFixed(1)}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{getSALabel(saScore)}</div>
          </div>
        )}

        {estimatedCost && (
          <div className="p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
              <DollarSign size={12} />
              Est. Cost
            </div>
            <div className="text-sm font-bold truncate">{estimatedCost}</div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            {simplifyText("Synthesis route planned with ASKCOS retrosynthesis. All reagents and intermediates are purchasable or easily derived from commercial materials.", isEasyMode)}
          </p>
        </div>
      </div>
    </div>
  );
}
