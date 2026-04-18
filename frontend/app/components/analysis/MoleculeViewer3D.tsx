import { useEffect, useRef, useState } from "react";

interface Props {
  pdbId?: string;
  proteinUrl?: string;
  ligandPoseUrl?: string;
  ligandPoseFormat?: string | null;
  className?: string;
}

export function MoleculeViewer3D({
  pdbId,
  proteinUrl,
  ligandPoseUrl,
  ligandPoseFormat,
  className,
}: Props) {
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

      if (!stageRef.current || (!pdbId && !proteinUrl && !ligandPoseUrl)) return;

      const stage = stageRef.current;
      const loadAll = async () => {
        let proteinComponent: any = null;
        let ligandComponent: any = null;

        try {
          if (proteinUrl) {
            proteinComponent = await stage.loadFile(proteinUrl, { ext: "pdb" });
          } else if (pdbId) {
            const pdbCode = pdbId.trim().toUpperCase();
            const isValid = /^[0-9A-Z]{4}$/.test(pdbCode);
            if (isValid) {
              const pdbUrl = `https://files.rcsb.org/download/${pdbCode}.pdb`;
              proteinComponent = await stage.loadFile(pdbUrl, { ext: "pdb" });
            }
          }

          if (proteinComponent) {
            proteinComponent.addRepresentation("cartoon", {
              color: "residueindex",
              opacity: 0.35,
            });
            proteinComponent.addRepresentation("licorice", {
              sele: "hetero and not water",
              color: "element",
              opacity: 0.6,
            });
          }
        } catch {
          // keep going to try ligand
        }

        try {
          if (ligandPoseUrl) {
            const inferredExt = ligandPoseUrl.split(".").pop()?.toLowerCase();
            const ext = (ligandPoseFormat || inferredExt || "pdb").toLowerCase();
            ligandComponent = await stage.loadFile(ligandPoseUrl, { ext });
          }

          if (ligandComponent) {
            ligandComponent.addRepresentation("ball+stick", {
              color: "element",
              scale: 2.0,
            });
          }
        } catch {
          // ignore ligand load error
        }

        if (ligandComponent) {
          ligandComponent.autoView();
        } else if (proteinComponent) {
          proteinComponent.autoView();
        } else {
          setLoadError("Failed to load docking view.");
        }
      };

      void loadAll();
    });

    return () => {
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, [pdbId, proteinUrl, ligandPoseUrl, ligandPoseFormat]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded border border-[var(--border)] bg-white relative ${className ?? "h-64"}`}
    >
      {!pdbId && !proteinUrl && !ligandPoseUrl && (
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
