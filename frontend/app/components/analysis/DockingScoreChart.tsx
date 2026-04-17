"use client";
import { useEffect, useState } from "react";
import type { DockingResult } from "@/app/lib/types";
import { getCSSVariableValue } from "@/app/lib/theme";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  results: DockingResult[];
}

export function DockingScoreChart({ results }: Props) {
  const [barColors, setBarColors] = useState<string[]>([]);

  useEffect(() => {
    const stableColor = getCSSVariableValue("stability-stable", "#10b981");
    const borderlineColor = getCSSVariableValue("stability-borderline", "#f59e0b");
    const colors = results.slice(0, 10).map((r) =>
      r.binding_energy <= -9 ? stableColor : r.binding_energy <= -7 ? borderlineColor : borderlineColor
    );
    setBarColors(colors);
  }, [results]);

  if (!results.length) {
    return (
      <div className="text-sm text-[var(--muted-foreground)] p-4">
        No docking data.
      </div>
    );
  }

  const data = results.slice(0, 10).map((r) => ({
    name: r.compound_name.slice(0, 10),
    score: r.binding_energy,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
        <XAxis
          type="number"
          domain={["auto", 0]}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10 }}
          width={80}
        />
        <Tooltip
          formatter={(value) => [
            `${Number(value).toFixed(2)} kcal/mol`,
            "Score",
          ]}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {barColors.map((color, i) => (
            <Cell key={i} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
