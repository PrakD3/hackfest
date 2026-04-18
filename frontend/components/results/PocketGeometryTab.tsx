"use client";

import React from "react";
import {
  PocketGeometryCard,
  PocketComparisonChart,
  PipelineExplanationPanel,
  MoleculeDesignRationale,
} from "./index";

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

interface PocketGeometryTabProps {
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
  topLeads: Lead[];
  generatedMoleculesCount?: number;
}

/**
 * Complete Pocket Geometry Analysis Tab
 * 
 * Displays:
 * 1. Alert banner + metric cards (volume, hydrophobicity, polarity, charge)
 * 2. Comparison chart (wild-type vs mutant)
 * 3. Pipeline explanation (how pocket geometry drives design)
 * 4. Design rationale (why top compounds were designed)
 */
export function PocketGeometryTab({
  pocketDelta,
  mutation,
  topLeads,
  generatedMoleculesCount = 70,
}: PocketGeometryTabProps) {
  return (
    <div className="space-y-6 pb-8">
      {/* Section 1: Metric Cards */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Pocket Geometry Metrics
        </h2>
        <PocketGeometryCard pocketDelta={pocketDelta} mutation={mutation} />
      </div>

      {/* Section 2: Comparison Chart */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Wild-Type vs Mutant Comparison
        </h2>
        <PocketComparisonChart pocketDelta={pocketDelta} />
      </div>

      {/* Section 3: Pipeline Explanation */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          How This Drives the Pipeline
        </h2>
        <PipelineExplanationPanel
          pocketDelta={pocketDelta}
          moleculesGenerated={generatedMoleculesCount}
          topLeadsCount={Math.min(topLeads.length, 3)}
        />
      </div>

      {/* Section 4: Design Rationale */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Why Top Compounds Work
        </h2>
        <MoleculeDesignRationale topLeads={topLeads} pocketDelta={pocketDelta} />
      </div>

      {/* Footer: Educational Summary */}
      <div className="bg-indigo-50 border-l-4 border-indigo-400 p-6 rounded-lg">
        <h3 className="font-bold text-indigo-900 mb-3">
          🎓 Key Takeaway: Pocket Geometry-Driven Design
        </h3>
        <div className="text-sm text-indigo-800 space-y-2">
          <p>
            Most drug discovery starts with "Can we make variants of known
            drugs?" This limits innovation to incremental improvements.
          </p>
          <p>
            AXONENGINE starts with "The pocket changed. How?" This enables
            radical innovation—designing molecules that exploit the mutation
            rather than fighting it.
          </p>
          <p className="font-semibold">
            Result: Novel, patentable compounds with superior binding to the
            mutant target.
          </p>
        </div>
      </div>
    </div>
  );
}
