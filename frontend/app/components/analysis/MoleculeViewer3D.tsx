import { useEffect, useRef, useState } from "react";

interface Props {
  pdbId?: string;
  className?: string;
}

export function MoleculeViewer3D({ pdbId, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    import("ngl").then((NGL) => {
      if (!containerRef.current) return;
      setLoadError(null);
      stageRef.current = new NGL.Stage(containerRef.current, {
        backgroundColor: "white",
      });
      if (pdbId && stageRef.current) {
        const pdbCode = pdbId.toUpperCase();
        const pdbUrl = `https://files.rcsb.org/download/${pdbCode}.pdb`;
        stageRef.current
          .loadFile(pdbUrl, { ext: "pdb" })
          .then((component: any) => {
            if (!component) return;
            component.addRepresentation("cartoon", {
              color: "residueindex",
              opacity: 0.9,
            });
            component.addRepresentation("licorice", {
              sele: "hetero and not water",
              color: "element",
            });
            component.autoView();
          })
          .catch(() => {
            setLoadError("Failed to load protein structure.");
          });
      }
    });

    return () => {
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, [pdbId]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded border border-[var(--border)] bg-white relative ${className ?? "h-64"}`}
    >
      {!pdbId && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted-foreground)]">
          3D view requires PDB structure
        </div>
      )}
      {!!pdbId && !!loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--destructive)]">
          {loadError}
        </div>
      )}
    </div>
  );
}
