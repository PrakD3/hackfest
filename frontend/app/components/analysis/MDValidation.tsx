"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/app/components/ui/badge";

interface MDValidationProps {
  rmsdStable?: boolean;
  rmsdMean?: number;
  stabilityLabel?: "STABLE" | "BORDERLINE" | "UNSTABLE";
  mmgbsaDg?: number;
  rmsdTrajectory?: number[];
}

export function MDValidation({
  rmsdStable,
  rmsdMean,
  stabilityLabel,
  mmgbsaDg,
  rmsdTrajectory,
}: MDValidationProps) {
  const getStabilityColor = (
    label?: string
  ): "success" | "warning" | "destructive" | "secondary" => {
    if (label === "STABLE") return "success";
    if (label === "BORDERLINE") return "warning";
    if (label === "UNSTABLE") return "destructive";
    return "secondary";
  };

  const rmsdData = rmsdTrajectory
    ? rmsdTrajectory.map((value, i) => ({
        frame: i,
        rmsd: parseFloat(value.toFixed(2)),
      }))
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Molecular Dynamics Validation</h3>
        {stabilityLabel && (
          <Badge variant={getStabilityColor(stabilityLabel)}>{stabilityLabel}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {rmsdMean !== undefined && (
          <div className="p-4 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-2">
              Mean RMSD (last 10 ns)
            </div>
            <div className="text-2xl font-bold">{rmsdMean.toFixed(2)} Å</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-2">
              {rmsdMean < 2.0
                ? "Molecule remains in pocket"
                : rmsdMean < 4.0
                  ? "Molecule may dissociate"
                  : "Molecule left pocket"}
            </div>
          </div>
        )}

        {mmgbsaDg !== undefined && (
          <div className="p-4 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <div className="text-xs text-[var(--muted-foreground)] mb-2">MM-GBSA ΔG</div>
            <div className="text-2xl font-bold">{mmgbsaDg.toFixed(1)} kcal/mol</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-2">
              ±0.5 kcal/mol (MM-GBSA)
            </div>
          </div>
        )}
      </div>

      {rmsdData.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">RMSD Trajectory (50 ns)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rmsdData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="frame"
                tick={{ fontSize: 12 }}
                label={{ value: "Frames (500 total)", position: "insideBottomRight", offset: -5 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: "RMSD (Å)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                formatter={(value: number) => value.toFixed(3)}
              />
              <Line
                type="monotone"
                dataKey="rmsd"
                stroke="var(--primary)"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          💡 50 ns molecular dynamics simulation validating the docking prediction. RMSD measures
          ligand displacement from initial pose. Flat trajectory indicates stable binding.
        </p>
      </div>
    </div>
  );
}
