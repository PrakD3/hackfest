"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PocketComparisonChartProps {
  pocketDelta: {
    volume_delta: number;
    volume_wildtype: number;
    volume_mutant: number;
    hydrophobicity_delta: number;
    hydrophobicity_wildtype: number;
    hydrophobicity_mutant: number;
    polarity_delta: number;
    polarity_wildtype: number;
    polarity_mutant: number;
    charge_delta: number;
    charge_wildtype: number;
    charge_mutant: number;
  };
}

export function PocketComparisonChart({
  pocketDelta,
}: PocketComparisonChartProps) {
  const chartData = [
    {
      metric: "Volume (Ų)",
      wildtype: pocketDelta.volume_wildtype,
      mutant: pocketDelta.volume_mutant,
      delta: pocketDelta.volume_delta,
    },
    {
      metric: "Hydrophobicity",
      wildtype: pocketDelta.hydrophobicity_wildtype,
      mutant: pocketDelta.hydrophobicity_mutant,
      delta: Math.abs(pocketDelta.hydrophobicity_delta),
    },
    {
      metric: "Polarity",
      wildtype: pocketDelta.polarity_wildtype,
      mutant: pocketDelta.polarity_mutant,
      delta: pocketDelta.polarity_delta,
    },
    {
      metric: "Charge",
      wildtype: pocketDelta.charge_wildtype,
      mutant: pocketDelta.charge_mutant,
      delta: Math.abs(pocketDelta.charge_delta),
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dataKey = payload[0].dataKey;

      let displayValue = payload[0].value;
      let unit = "";

      if (data.metric.includes("Volume")) {
        unit = " Ų";
      }

      return (
        <div className="bg-white p-3 border border-slate-300 rounded shadow-lg">
          <p className="font-semibold text-slate-900">{data.metric}</p>
          <p className="text-sm text-slate-600">
            {dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}:{" "}
            <span className="font-semibold">
              {displayValue.toFixed(2)}
              {unit}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-bold text-slate-900 mb-4">
        Pocket Property Comparison: Wild-Type vs Mutant
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="metric"
            angle={-20}
            textAnchor="end"
            height={80}
            tick={{ fill: "#64748b", fontSize: 12 }}
          />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="square"
            formatter={(value) => {
              if (value === "wildtype") return "Wild-Type";
              if (value === "mutant") return "Mutant";
              return "Δ Change";
            }}
          />
          <Bar dataKey="wildtype" fill="#3b82f6" name="wildtype" />
          <Bar dataKey="mutant" fill="#f97316" name="mutant" />
          <Bar dataKey="delta" fill="#64748b" name="delta" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
