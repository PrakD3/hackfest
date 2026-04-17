"use client";
import { Tooltip } from "@/app/components/ui/tooltip";

interface Props {
  ratio: number;
  label: "High" | "Moderate" | "Low" | "Dangerous";
  offTargetName: string;
}

const COLOR_MAP: Record<"High" | "Moderate" | "Low" | "Dangerous", string> = {
  High: "var(--selectivity-high)",
  Moderate: "var(--selectivity-moderate)",
  Low: "var(--selectivity-low)",
  Dangerous: "var(--selectivity-dangerous)",
};

export function SelectivityBadge({ ratio, label, offTargetName }: Props) {
  const color = COLOR_MAP[label];
  return (
    <Tooltip content={`Binds ${ratio.toFixed(1)}× harder to target than ${offTargetName}`}>
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border"
        style={{ color, borderColor: color, background: `${color}15` }}
      >
        <span className="text-base font-bold">{ratio.toFixed(1)}×</span>
        {label}
      </span>
    </Tooltip>
  );
}
