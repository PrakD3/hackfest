"use client";
import type { DockingResult } from "@/app/lib/types";
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
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.score <= -9
                  ? "#059669"
                  : d.score <= -7
                    ? "#d97706"
                    : "#f59e0b"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
