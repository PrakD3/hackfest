"use client";

const CHIPS = ["EGFR T790M", "HIV K103N", "BRCA1 5382insC", "TP53 R248W"];

interface Props {
  onSelect: (chip: string) => void;
}

export function DemoQueryChips({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className="px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-mono hover:border-[var(--primary)] hover:bg-[var(--accent)] transition-colors"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
