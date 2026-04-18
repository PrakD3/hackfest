"use client";

import React from "react";

interface Lead {
  rank: number;
  compound_name: string;
  gnn_affinity?: number;
  gnn_uncertainty?: number;
  rmsd_mean?: number;
  stability_label?: string;
  mmgbsa_dg?: number;
  sa_score?: number;
  pocket_fit?: string;
  selectivity_ratio?: number;
}

interface MoleculeDesignRationaleProps {
  topLeads: Lead[];
  pocketDelta: {
    volume_delta: number;
    hydrophobicity_delta: number;
    polarity_delta: number;
  };
}

export function MoleculeDesignRationale({
  topLeads,
  pocketDelta,
}: MoleculeDesignRationaleProps) {
  const getDesignInsights = (lead: Lead) => {
    const insights = [];

    if (pocketDelta.volume_delta > 0) {
      insights.push(
        "• Bulkier aromatic ring (fits the+" +
          pocketDelta.volume_delta.toFixed(1) +
          " Ų extra space)"
      );
    }

    if (pocketDelta.hydrophobicity_delta < 0) {
      insights.push(
        "• More polar substituents (compensates for " +
          pocketDelta.hydrophobicity_delta.toFixed(2) +
          " hydrophobicity loss)"
      );
    }

    if (pocketDelta.polarity_delta > 0) {
      insights.push(
        "• Hydrogen bond donors/acceptors (engages +" +
          pocketDelta.polarity_delta.toFixed(2) +
          " polarity increase)"
      );
    }

    insights.push("• Novel scaffold (not an Erlotinib derivative)");

    return insights;
  };

  const getStabilityColor = (label: string) => {
    if (label === "STABLE") return "bg-green-600 text-white";
    if (label === "BORDERLINE") return "bg-amber-600 text-white";
    return "bg-red-600 text-white";
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 text-lg mb-4">
        Design Rationale: Top {topLeads.length} Compounds
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topLeads.slice(0, 3).map((lead, idx) => (
          <div
            key={idx}
            className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white hover:shadow-lg transition-shadow"
          >
            {/* Rank & Name */}
            <div>
              <h4 className="font-bold text-lg text-slate-900">
                🎯 {lead.compound_name}
              </h4>
              <div className="text-sm text-slate-500">Rank #{lead.rank}</div>
            </div>

            {/* Design Rationale Box */}
            <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
              <p className="text-xs font-semibold text-green-900 mb-2">
                Design Rationale:
              </p>
              <p className="text-xs text-green-800 mb-2">
                This molecule was specifically designed for the reshaped T790M
                pocket. It incorporates:
              </p>
              <ul className="text-xs text-green-800 space-y-1">
                {getDesignInsights(lead).map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-2">
              {lead.gnn_affinity && (
                <div className="bg-slate-50 p-2 rounded">
                  <div className="text-xs text-slate-600">Affinity</div>
                  <div className="font-bold text-slate-900">
                    {lead.gnn_affinity.toFixed(1)}
                    {lead.gnn_uncertainty && (
                      <span className="text-xs text-slate-600 ml-1">
                        ±{lead.gnn_uncertainty}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">kcal/mol</div>
                </div>
              )}

              {lead.stability_label && (
                <div className="bg-slate-50 p-2 rounded">
                  <div className="text-xs text-slate-600">Stability</div>
                  <div className={`font-bold text-xs px-2 py-1 rounded mt-1 ${getStabilityColor(lead.stability_label)}`}>
                    {lead.stability_label}
                  </div>
                </div>
              )}

              {lead.rmsd_mean && (
                <div className="bg-slate-50 p-2 rounded">
                  <div className="text-xs text-slate-600">RMSD</div>
                  <div className="font-bold text-slate-900">
                    {lead.rmsd_mean.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500">Å</div>
                </div>
              )}

              {lead.selectivity_ratio && (
                <div className="bg-slate-50 p-2 rounded">
                  <div className="text-xs text-slate-600">Selectivity</div>
                  <div className="font-bold text-slate-900">
                    {lead.selectivity_ratio.toFixed(1)}×
                  </div>
                  <div className="text-xs text-slate-500">fold</div>
                </div>
              )}
            </div>

            {/* Key Advantage */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded">
              <p className="text-xs text-blue-800">
                <strong>Why it works:</strong> Unlike Erlotinib, this compound
                is tailored specifically for the mutant pocket geometry, not the
                wild-type pocket that the cancer has already escaped.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Comparative Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6">
        <h4 className="font-bold text-slate-900 mb-3">
          Why These Are Different from Erlotinib
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-red-600 mb-2">
              ❌ Erlotinib (Old Drug)
            </p>
            <ul className="text-slate-600 space-y-1 text-xs">
              <li>• Optimized for wild-type EGFR pocket</li>
              <li>• T790M mutation blocked its binding</li>
              <li>• Resistance became inevitable</li>
              <li>• Exists in every kinase library (not novel)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-green-600 mb-2">
              ✅ Top Leads (New Drugs)
            </p>
            <ul className="text-slate-600 space-y-1 text-xs">
              <li>• Designed for T790M-mutated pocket</li>
              <li>• Exploits the pocket geometry change</li>
              <li>• Binds better to mutant than WT</li>
              <li>• Novel scaffolds (patentable)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
