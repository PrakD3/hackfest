"use client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  trace: Record<string, string> | null;
}

export function ReasoningTrace({ trace }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  if (!trace || !Object.keys(trace).length) {
    return (
      <div className="text-sm text-[var(--muted-foreground)] p-4">
        No reasoning trace available.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(trace).map(([agent, text]) => (
        <div key={agent} className="border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === agent ? null : agent)}
            className="w-full flex items-center gap-2 p-3 text-sm font-medium hover:bg-[var(--muted)] transition-colors text-left"
          >
            {open === agent ? (
              <ChevronDown size={14} className="shrink-0" />
            ) : (
              <ChevronRight size={14} className="shrink-0" />
            )}
            {agent}
          </button>
          {open === agent && (
            <div className="p-3 pt-0 text-sm text-[var(--muted-foreground)] border-t border-[var(--border)] leading-relaxed">
              {text}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
