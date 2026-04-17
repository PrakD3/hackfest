"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RankedLead } from "@/app/lib/types";
import { SelectivityBadge } from "./SelectivityBadge";
import { MoleculeViewer2D } from "./MoleculeViewer2D";
import { Badge } from "@/app/components/ui/badge";
import { AlertTriangle, ShieldCheck, ShieldX } from "lucide-react";

interface Props {
  lead: RankedLead;
  rank: number;
}

export function MoleculeCard({ lead, rank }: Props) {
  const [show3D, setShow3D] = useState(false);

  const scoreColor =
    lead.docking_score !== null && lead.docking_score <= -9
      ? "#059669"
      : lead.docking_score !== null && lead.docking_score <= -7
        ? "#d97706"
        : "#dc2626";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-[var(--muted-foreground)]">Rank #{rank}</span>
          <h4 className="font-semibold text-sm mt-0.5">{lead.compound_name}</h4>
        </div>
        <div className="flex items-center gap-2">
          {lead.docking_score !== null && (
            <span className="text-sm font-bold" style={{ color: scoreColor }}>
              {lead.docking_score.toFixed(2)} kcal/mol
            </span>
          )}
        </div>
      </div>

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
              className="h-36"
            />
          </motion.div>
        ) : (
          <motion.div
            key="3d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-center h-36 bg-[var(--muted)] rounded text-xs text-[var(--muted-foreground)]">
              3D Viewer (click again to hide)
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setShow3D(!show3D)}
        className="text-xs text-[var(--primary)] hover:underline"
      >
        {show3D ? "Show 2D" : "Show 3D"}
      </button>

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
        {lead.resistance_flag && <Badge variant="warning">Resistance Risk</Badge>}
        {lead.toxicophore_highlight_b64 && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle size={10} />
            PAINS
          </span>
        )}
      </div>

      {lead.clinical_trials_count > 0 && (
        <p className="text-xs text-[var(--muted-foreground)]">
          🏥 {lead.clinical_trials_count} matching clinical trials
        </p>
      )}

      <p className="text-xs font-mono text-[var(--muted-foreground)] truncate">
        {lead.smiles}
      </p>
    </div>
  );
}
