"use client";
import { useEffect, useRef } from "react";
import type { Stage as NGLStage } from "ngl";

interface Props {
  smiles: string;
  pdbPath?: string;
}

export function MoleculeViewer3D({ smiles, pdbPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<NGLStage | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    import("ngl").then((NGL) => {
      if (!containerRef.current) return;
      stageRef.current = new NGL.Stage(containerRef.current, {
        backgroundColor: "white",
      });
      if (pdbPath && stageRef.current) {
        stageRef.current.loadFile(pdbPath, { defaultRepresentation: true });
      }
    });

    return () => {
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, [pdbPath, smiles]);

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded border border-[var(--border)] bg-white relative"
    >
      {!pdbPath && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted-foreground)]">
          3D view requires PDB structure
        </div>
      )}
    </div>
  );
}
