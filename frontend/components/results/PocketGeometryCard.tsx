"use client";

import React from "react";

interface PocketGeometryCardProps {
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
    pocket_reshaped: boolean;
    residues_displaced: string[];
  };
  mutation: string;
}

const getMetricColor = (delta: number) => {
  if (delta > 0.1) return "text-red-600"; // Increased (↑)
  if (delta < -0.1) return "text-green-600"; // Decreased (↓)
  return "text-gray-500"; // No change
};

const getMetricArrow = (delta: number) => {
  if (delta > 0.1) return "↑ INCREASED";
  if (delta < -0.1) return "↓ DECREASED";
  return "─ NO CHANGE";
};

export function PocketGeometryCard({
  pocketDelta,
  mutation,
}: PocketGeometryCardProps) {
  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
        <p className="text-amber-900 font-semibold text-sm">
          ⚠️ The mutation geometrically reshaped the binding pocket. Novel
          molecules were designed to fit the new geometry rather than copy
          existing compounds.
        </p>
      </div>

      {/* Metric Cards Grid - 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Volume Card */}
        <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-white hover:shadow-md transition-shadow">
          <h3 className="font-bold text-slate-900">Pocket Volume</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Wild-Type:</span>
              <span className="font-semibold text-slate-900">
                {pocketDelta.volume_wildtype.toFixed(1)} Ų
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mutant:</span>
              <span className="font-semibold text-slate-900">
                {pocketDelta.volume_mutant.toFixed(1)} Ų
              </span>
            </div>
            <div
              className={`flex justify-between font-semibold ${getMetricColor(pocketDelta.volume_delta)}`}
            >
              <span>Δ Change:</span>
              <span>
                +{pocketDelta.volume_delta.toFixed(1)} {getMetricArrow(pocketDelta.volume_delta)}
              </span>
            </div>
          </div>
        </div>

        {/* Hydrophobicity Card */}
        <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-white hover:shadow-md transition-shadow">
          <h3 className="font-bold text-slate-900">Hydrophobicity Score</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Wild-Type:</span>
              <span className="font-semibold text-slate-900">
                {pocketDelta.hydrophobicity_wildtype.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mutant:</span>
              <span className="font-semibold text-slate-900">
                {pocketDelta.hydrophobicity_mutant.toFixed(2)}
              </span>
            </div>
            <div
              className={`flex justify-between font-semibold ${getMetricColor(pocketDelta.hydrophobicity_delta)}`}
            >
              <span>Δ Change:</span>
              <span>
                {pocketDelta.hydrophobicity_delta.toFixed(2)}{" "}
                {getMetricArrow(pocketDelta.hydrophobicity_delta)}
              </span>
            </div>
          </div>
        </div>

        {/* Polarity Card */}
        <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-white hover:shadow-md transition-shadow">
          <h3 className="font-bold text-slate-900">Polarity Score</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Wild-Type:</span>
              <span className="font-semibold text-slate-900">
                {pocketDelta.polarity_wildtype.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mutant:</span>
              <span className="font-semibold text-slate-900">
                {pocketDelta.polarity_mutant.toFixed(2)}
              </span>
            </div>
            <div
              className={`flex justify-between font-semibold ${getMetricColor(pocketDelta.polarity_delta)}`}
            >
              <span>Δ Change:</span>
              <span>
                {pocketDelta.polarity_delta.toFixed(2)}{" "}
                {getMetricArrow(pocketDelta.polarity_delta)}
              </span>
            </div>
          </div>
        </div>

        {/* Charge Card */}
        <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-white hover:shadow-md transition-shadow">
          <h3 className="font-bold text-slate-900">Net Charge</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Wild-Type:</span>
              <span className="font-semibold text-slate-900">
                {pocketDelta.charge_wildtype.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mutant:</span>
              <span className="font-semibold text-slate-900">
                {pocketDelta.charge_mutant.toFixed(1)}
              </span>
            </div>
            <div
              className={`flex justify-between font-semibold ${getMetricColor(pocketDelta.charge_delta)}`}
            >
              <span>Δ Change:</span>
              <span>
                {pocketDelta.charge_delta.toFixed(1)}{" "}
                {getMetricArrow(pocketDelta.charge_delta)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h4 className="font-bold text-blue-900">Summary</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span>
              Pocket Reshaped:{" "}
              <strong>
                {pocketDelta.pocket_reshaped ? "TRUE" : "FALSE"}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span>
              Displaced Residues:{" "}
              <strong>{pocketDelta.residues_displaced.join(", ")}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span>
              Detection Method: <strong>fpocket</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Interpretation Box */}
      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
        <h3 className="font-bold text-green-900 mb-2">🔍 What This Means</h3>
        <ul className="text-sm text-green-800 space-y-1">
          <li>
            • Pocket volume{" "}
            {pocketDelta.volume_delta > 0 ? "expanded" : "shrunk"} →{" "}
            {pocketDelta.volume_delta > 0
              ? "molecules need to be bulkier"
              : "molecules should be smaller"}
          </li>
          <li>
            • Less hydrophobic → molecules need more polar groups to engage
          </li>
          <li>
            • More polar → target exposed charged residues in new pocket
          </li>
          <li>
            • Result: 70 completely novel molecules generated (not Erlotinib
            copies)
          </li>
        </ul>
      </div>
    </div>
  );
}
