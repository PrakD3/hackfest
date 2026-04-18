"use client";

interface Props {
  similarMolecules?: string[] | null;
}

export function SimilarityPanel({ similarMolecules }: Props) {
  const safeMolecules = similarMolecules ?? [];

  if (!safeMolecules.length) {
    return (
      <div className="text-sm text-[var(--muted-foreground)] p-4">No similar molecules found.</div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--muted-foreground)] mb-3">
        {similarMolecules.length} similar molecules found in ChEMBL/PubChem:
      </p>
      {safeMolecules.map((s, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: SMILES strings may duplicate
          key={i}
          className="p-2 rounded border border-[var(--border)] text-xs font-mono bg-[var(--muted)] break-all"
        >
          {s}
        </div>
      ))}
    </div>
  );
}
