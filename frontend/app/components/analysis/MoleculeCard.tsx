"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, ShieldX, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import type { RankedLead } from "@/app/lib/types";
import { MoleculeViewer2D } from "./MoleculeViewer2D";
import { MoleculeViewer3D } from "./MoleculeViewer3D";
import { SelectivityBadge } from "./SelectivityBadge";

interface Props {
  lead: RankedLead & {
    gnn_dg?: number;
    gnn_uncertainty?: number;
    rmsd_mean?: number;
    stability_label?: "STABLE" | "BORDERLINE" | "UNSTABLE";
    mmgbsa_dg?: number;
    sa_score?: number;
    sa_label?: string;
    synthesis_steps?: number;
    synthesis_cost?: string;
  };
  rank: number;
  pdbId?: string;
  proteinUrl?: string;
  ligandPoseUrl?: string;
  ligandPoseFormat?: string | null;
  showProtein?: boolean;
}

export function MoleculeCard({
  lead,
  rank,
  pdbId,
  proteinUrl,
  ligandPoseUrl,
  ligandPoseFormat,
  showProtein = false,
}: Props) {
  const [show3D, setShow3D] = useState(false);

  const gnnScore = lead.gnn_dg ?? lead.docking_score;
  const scoreColor =
    gnnScore !== null && gnnScore <= -9
      ? "var(--stability-stable)"
      : gnnScore !== null && gnnScore <= -7
        ? "var(--stability-borderline)"
        : "var(--stability-unstable)";

  const _getStabilityColor = (label?: string): string => {
    if (label === "STABLE") return "var(--stability-stable)";
    if (label === "BORDERLINE") return "var(--stability-borderline)";
    return "var(--stability-unstable)";
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-[var(--muted-foreground)]">Rank #{rank}</span>
          <h4 className="font-semibold text-sm mt-0.5">{lead.compound_name}</h4>
        </div>
        <Badge variant="secondary" className="shrink-0">
          #{rank}
        </Badge>
      </div>

      {/* Binding Affinity Scores */}
      <div className="space-y-2 p-3 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
        {lead.gnn_dg !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted-foreground)]">GNN ΔG</span>
            <span className="font-mono font-bold" style={{ color: scoreColor }}>
              {lead.gnn_dg.toFixed(1)}{" "}
              {lead.gnn_uncertainty ? `± ${lead.gnn_uncertainty.toFixed(1)}` : ""} kcal/mol
            </span>
          </div>
        )}
        {lead.mmgbsa_dg !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted-foreground)]">MM-GBSA ΔG</span>
            <span className="font-mono font-bold text-blue-600">
              {lead.mmgbsa_dg.toFixed(1)} ± 0.5 kcal/mol
            </span>
          </div>
        )}
      </div>

      {/* 2D/3D Viewer */}
      <AnimatePresence mode="wait">
        {!show3D ? (
          <motion.div
            key="2d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MoleculeViewer2D
              molImageB64={lead.mol_image_b64}
              smiles={lead.smiles}
              className="h-32 rounded-lg"
            />
          </motion.div>
        ) : (
          <motion.div
            key="3d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MoleculeViewer3D
              pdbId={showProtein ? pdbId : undefined}
              proteinUrl={showProtein ? proteinUrl : undefined}
              ligandPoseUrl={ligandPoseUrl}
              ligandPoseFormat={ligandPoseFormat}
              className="h-32 rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Switch checked={show3D} onCheckedChange={setShow3D} />
        <span className="text-xs text-[var(--muted-foreground)]">
          {show3D ? "3D Protein" : "2D Molecule"}
        </span>
      </div>
      {show3D && (
        <p
          className={`text-[10px] ${
            showProtein
              ? pdbId || proteinUrl
                ? "text-[var(--muted-foreground)]"
                : "text-[var(--destructive)]"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          {showProtein
            ? pdbId || proteinUrl
              ? ligandPoseUrl
                ? `Protein: ${pdbId ? pdbId.toUpperCase() : "Session structure"} • Docked pose loaded`
                : `Protein: ${pdbId ? pdbId.toUpperCase() : "Session structure"} • Docked pose unavailable`
              : "No PDB structure available for 3D view."
            : ligandPoseUrl
              ? "Docked ligand pose loaded."
              : "Docked ligand pose unavailable."}
        </p>
      )}

      {/* Stability & Properties */}
      <div className="space-y-2">
        {lead.stability_label && (
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <span className="text-[var(--muted-foreground)]">MD Stability</span>
            <Badge
              variant={
                lead.stability_label === "STABLE"
                  ? "success"
                  : lead.stability_label === "BORDERLINE"
                    ? "warning"
                    : "destructive"
              }
            >
              {lead.stability_label}
              {lead.rmsd_mean && ` (${lead.rmsd_mean.toFixed(2)} Å)`}
            </Badge>
          </div>
        )}

        {lead.sa_score !== undefined && (
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--muted)]/40 border border-[var(--border)]/50">
            <span className="text-[var(--muted-foreground)]">Synthesis</span>
            <span className="font-mono font-bold">
              SA {lead.sa_score.toFixed(1)} •{" "}
              {lead.synthesis_steps ? `${lead.synthesis_steps} steps` : "N/A"}
              {lead.synthesis_cost && ` • ${lead.synthesis_cost}`}
            </span>
          </div>
        )}
      </div>

      {/* Safety & Selectivity Badges */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <SelectivityBadge
          ratio={lead.selectivity_ratio}
          label={lead.selectivity_label}
          offTargetName="off-target"
        />
        {lead.admet_pass ? (
          <Badge variant="success">
            <ShieldCheck size={10} className="mr-1" />
            ADMET ✓
          </Badge>
        ) : (
          <Badge variant="destructive">
            <ShieldX size={10} className="mr-1" />
            ADMET ✗
          </Badge>
        )}
        {lead.resistance_flag && (
          <Badge variant="warning">
            <Zap size={10} className="mr-1" />
            Resistance Risk
          </Badge>
        )}
        {lead.toxicophore_highlight_b64 && (
          <Badge variant="secondary">
            <AlertTriangle size={10} className="mr-1" />
            PAINS
          </Badge>
        )}
      </div>

      {/* Clinical Info */}
      {lead.clinical_trials_count > 0 && (
        <p className="text-xs text-[var(--muted-foreground)] p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
          🏥 {lead.clinical_trials_count} active clinical trials
        </p>
      )}

      {/* SMILES */}
      <p className="text-xs font-mono text-[var(--muted-foreground)] truncate border-t border-[var(--border)]/50 pt-3">
        {lead.smiles}
      </p>
    </div>
  );
}
