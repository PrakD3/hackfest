"use client";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { Badge } from "@/app/components/ui/badge";
import type { ADMETProfile } from "@/app/lib/types";

interface Props {
  profiles: ADMETProfile[];
}

export function ADMETPanel({ profiles }: Props) {
  if (!profiles.length) {
    return (
      <div className="text-sm text-[var(--muted-foreground)] p-4">No ADMET data available.</div>
    );
  }

  const top = profiles[0];

  const radarData = [
    {
      metric: "MW",
      value: top.mw !== undefined ? Math.min(100, top.mw / 5) : 0,
    },
    {
      metric: "LogP",
      value: top.logp !== undefined ? Math.min(100, ((top.logp + 2) / 9) * 100) : 50,
    },
    {
      metric: "HBD",
      value: top.hbd !== undefined ? Math.min(100, (1 - top.hbd / 5) * 100) : 100,
    },
    {
      metric: "HBA",
      value: top.hba !== undefined ? Math.min(100, (1 - top.hba / 10) * 100) : 100,
    },
    {
      metric: "Bioavail",
      value: (top.bioavailability ?? 0) * 100,
    },
    {
      metric: "Solubility",
      value: top.solubility === "Good" ? 90 : top.solubility === "Moderate" ? 60 : 30,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
            <Radar
              dataKey="value"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {profiles.slice(0, 6).map((p, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: profiles have no stable id
            key={i}
            className="flex items-center justify-between p-2 rounded border border-[var(--border)]"
          >
            <span className="font-mono truncate text-[var(--muted-foreground)]">
              {p.smiles.slice(0, 12)}…
            </span>
            <div className="flex gap-1">
              <Badge
                variant={p.lipinski_pass ? "success" : "destructive"}
                className="text-[10px] px-1"
              >
                Lipinski
              </Badge>
              {p.pains_flag && (
                <Badge variant="warning" className="text-[10px] px-1">
                  PAINS
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
