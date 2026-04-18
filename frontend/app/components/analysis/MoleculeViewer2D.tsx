"use client";

interface Props {
  molImageB64: string;
  smiles: string;
  className?: string;
}

export function MoleculeViewer2D({ molImageB64, smiles, className }: Props) {
  if (molImageB64) {
    return (
      <div className={className}>
        <img
          src={`data:image/png;base64,${molImageB64}`}
          alt={smiles}
          className="w-full h-auto rounded"
        />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-[var(--muted)] rounded p-4 text-xs font-mono text-[var(--muted-foreground)] break-all ${className ?? ""}`}
    >
      {smiles}
    </div>
  );
}
