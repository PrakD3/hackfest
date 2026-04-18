"use client";

import React from "react";

interface PipelineExplanationPanelProps {
  pocketDelta: {
    volume_delta: number;
    hydrophobicity_delta: number;
    polarity_delta: number;
  };
  moleculesGenerated?: number;
  topLeadsCount?: number;
}

export function PipelineExplanationPanel({
  pocketDelta,
  moleculesGenerated = 70,
  topLeadsCount = 2,
}: PipelineExplanationPanelProps) {
  return (
    <div className="space-y-6">
      {/* Pipeline Flow Diagram */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg">
        <h3 className="font-bold text-slate-900 mb-4">
          How Pocket Detection Drives the Pipeline
        </h3>

        <div className="space-y-4">
          {/* Flow Steps */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Step 1 */}
            <div className="flex-1 bg-white border-2 border-blue-300 rounded-lg p-3 text-center">
              <div className="text-sm font-semibold text-blue-700">
                STEP 1
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Pocket Detection
              </div>
              <div className="text-xs font-semibold text-slate-900 mt-2">
                Detect pocket geometry changes
              </div>
            </div>

            <div className="hidden md:flex text-xl text-slate-400">→</div>

            {/* Step 2 */}
            <div className="flex-1 bg-white border-2 border-green-300 rounded-lg p-3 text-center">
              <div className="text-sm font-semibold text-green-700">
                STEP 2
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Molecule Generation
              </div>
              <div className="text-xs font-semibold text-slate-900 mt-2">
                Generate {moleculesGenerated} novel candidates
              </div>
            </div>

            <div className="hidden md:flex text-xl text-slate-400">→</div>

            {/* Step 3 */}
            <div className="flex-1 bg-white border-2 border-amber-300 rounded-lg p-3 text-center">
              <div className="text-sm font-semibold text-amber-700">
                STEP 3
              </div>
              <div className="text-xs text-slate-600 mt-1">Docking</div>
              <div className="text-xs font-semibold text-slate-900 mt-2">
                Score binding affinity
              </div>
            </div>

            <div className="hidden md:flex text-xl text-slate-400">→</div>

            {/* Step 4 */}
            <div className="flex-1 bg-white border-2 border-purple-300 rounded-lg p-3 text-center">
              <div className="text-sm font-semibold text-purple-700">
                STEP 4
              </div>
              <div className="text-xs text-slate-600 mt-1">MD Validation</div>
              <div className="text-xs font-semibold text-slate-900 mt-2">
                Validate top {topLeadsCount} in simulation
              </div>
            </div>
          </div>
        </div>

        {/* Key Insight */}
        <div className="mt-4 p-3 bg-blue-100 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-900">
            <strong>Key Insight:</strong> Pocket detection informs every
            downstream decision. Without understanding how the pocket changed,
            molecules would just be copies of existing drugs.
          </p>
        </div>
      </div>

      {/* Interpretation Box */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <h3 className="font-bold text-blue-900 mb-3">What This Means</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          {pocketDelta.volume_delta > 0 && (
            <li>
              • <strong>Pocket expanded ({pocketDelta.volume_delta.toFixed(1)} Ų)</strong> →
              new molecules must be bulkier to use the extra space
            </li>
          )}
          {pocketDelta.volume_delta <= 0 && (
            <li>
              • <strong>Pocket shrunk ({pocketDelta.volume_delta.toFixed(1)} Ų)</strong> →
              molecules should be more compact
            </li>
          )}
          {pocketDelta.hydrophobicity_delta < 0 && (
            <li>
              • <strong>Less hydrophobic ({pocketDelta.hydrophobicity_delta.toFixed(2)})</strong> →
              need more polar groups to compensate
            </li>
          )}
          {pocketDelta.polarity_delta > 0 && (
            <li>
              • <strong>More polar ({pocketDelta.polarity_delta.toFixed(2)})</strong> →
              target exposed charged residues in new pocket
            </li>
          )}
          <li>
            • <strong>Result:</strong> {moleculesGenerated} completely novel molecules
            generated (not variants of Erlotinib or other known drugs)
          </li>
          <li>
            • <strong>Top {topLeadsCount} selected for MD validation</strong> after filtering
            through docking, selectivity, and ADMET
          </li>
        </ul>
      </div>

      {/* Full Pipeline Context */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-bold text-slate-900 mb-2">Full Pipeline Context</h4>
        <div className="text-sm text-slate-700 space-y-2">
          <p>
            <strong>Without pocket geometry:</strong> "Let's generate molecules
            similar to Erlotinib" → Why? Because that's the only inhibitor we
            know works.
          </p>
          <p className="text-red-600">
            ❌ Problem: Cancer already escaped Erlotinib via T790M mutation, so
            variants won't work
          </p>
        </div>
        <div className="text-sm text-slate-700 space-y-2 mt-3">
          <p>
            <strong>With pocket geometry:</strong> "The pocket changed. Here's
            exactly how. Generate molecules that exploit this change."
          </p>
          <p className="text-green-600">
            ✅ Result: Novel compounds that bind better to the mutant than
            existing drugs ever could
          </p>
        </div>
      </div>
    </div>
  );
}
