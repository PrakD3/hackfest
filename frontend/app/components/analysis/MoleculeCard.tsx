"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, RotateCcw, Search, ShieldCheck, ShieldX, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
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
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isModal3D, setIsModal3D] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging2D, setIsDragging2D] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });

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

  const modal2DTransform = useMemo(
    () => `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotationDeg}deg)`,
    [pan.x, pan.y, zoom, rotationDeg]
  );

  const reset2DView = () => {
    setZoom(1);
    setRotationDeg(0);
    setPan({ x: 0, y: 0 });
    setIsDragging2D(false);
  };

  const handle2DWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setZoom((prev) => {
      const next = prev + (event.deltaY < 0 ? 0.1 : -0.1);
      return Math.max(0.5, Math.min(4, next));
    });
  };

  const handle2DMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
    setIsDragging2D(true);
    setDragOrigin({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const handle2DMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (!isDragging2D) return;
    setPan({ x: event.clientX - dragOrigin.x, y: event.clientY - dragOrigin.y });
  };

  const stopDragging2D = () => {
    setIsDragging2D(false);
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

      {/* 2D/3D Viewer */}
      <AnimatePresence mode="wait">
        {!show3D ? (
          <motion.div
            key="2d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative group"
          >
            <button
              type="button"
              onClick={() => {
                setIsModal3D(false);
                setIsViewerModalOpen(true);
              }}
              className="w-full text-left cursor-zoom-in"
              title="Open interactive molecule viewer"
            >
              <MoleculeViewer2D
                molImageB64={lead.mol_image_b64}
                smiles={lead.smiles}
                className="h-32 rounded-lg"
              />
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium bg-black/65 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Search size={12} />
                Expand
              </span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="3d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative group"
          >
            <button
              type="button"
              onClick={() => {
                setIsModal3D(true);
                setIsViewerModalOpen(true);
              }}
              className="w-full text-left cursor-zoom-in"
              title="Open interactive molecule viewer"
            >
              <MoleculeViewer3D
                pdbId={showProtein ? pdbId : undefined}
                proteinUrl={showProtein ? proteinUrl : undefined}
                ligandPoseUrl={ligandPoseUrl}
                ligandPoseFormat={ligandPoseFormat}
                className="h-32 rounded-lg"
              />
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium bg-black/65 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Search size={12} />
                Expand
              </span>
            </button>
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

      <Dialog
        open={isViewerModalOpen}
        onOpenChange={(open) => {
          setIsViewerModalOpen(open);
          if (!open) reset2DView();
        }}
      >
        <DialogContent className="w-[95vw] max-w-6xl max-h-[92vh] p-5">
          <DialogClose onClose={() => setIsViewerModalOpen(false)} />
          <DialogHeader className="mb-3">
            <DialogTitle>
              {lead.compound_name} · {isModal3D ? "3D Viewer" : "2D Viewer"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Switch checked={isModal3D} onCheckedChange={setIsModal3D} />
              <span className="text-xs text-[var(--muted-foreground)]">
                {isModal3D ? "3D Viewer" : "2D Viewer"}
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {isModal3D
                ? "Mouse controls: drag to rotate, right-drag to pan, and scroll to zoom."
                : "Drag to pan, scroll to zoom, and use rotate controls for orientation."}
            </p>
          </DialogHeader>

          {!isModal3D ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-2 py-1 rounded border border-[var(--border)] text-xs hover:bg-[var(--muted)]"
                  onClick={() => setRotationDeg((prev) => prev - 15)}
                >
                  Rotate -15°
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded border border-[var(--border)] text-xs hover:bg-[var(--muted)]"
                  onClick={() => setRotationDeg((prev) => prev + 15)}
                >
                  Rotate +15°
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded border border-[var(--border)] text-xs hover:bg-[var(--muted)] inline-flex items-center gap-1"
                  onClick={reset2DView}
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>

              <div
                className="h-[68vh] rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 overflow-hidden relative"
                onWheel={handle2DWheel}
                onMouseDown={handle2DMouseDown}
                onMouseMove={handle2DMouseMove}
                onMouseUp={stopDragging2D}
                onMouseLeave={stopDragging2D}
              >
                {lead.mol_image_b64 ? (
                  <img
                    src={`data:image/png;base64,${lead.mol_image_b64}`}
                    alt={lead.smiles}
                    draggable={false}
                    className="absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      transform: modal2DTransform,
                      transformOrigin: "center center",
                      width: "70%",
                      translate: "-50% -50%",
                      cursor: isDragging2D ? "grabbing" : "grab",
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-6">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] break-all text-center">
                      {lead.smiles}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <MoleculeViewer3D
              pdbId={showProtein ? pdbId : undefined}
              proteinUrl={showProtein ? proteinUrl : undefined}
              ligandPoseUrl={ligandPoseUrl}
              ligandPoseFormat={ligandPoseFormat}
              className="h-[72vh] rounded-xl"
            />
          )}
        </DialogContent>
      </Dialog>

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