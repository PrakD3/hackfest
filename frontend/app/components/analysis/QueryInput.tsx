"use client";
import { useState, type FormEvent } from "react";
import { Search, Loader2, Zap } from "lucide-react";

interface Props {
  onSubmit: (query: string, mode: "full" | "lite") => void;
  loading?: boolean;
  defaultQuery?: string;
}

export function QueryInput({ onSubmit, loading, defaultQuery = "" }: Props) {
  const [query, setQuery] = useState(defaultQuery);
  const [mode, setMode] = useState<"full" | "lite">("full");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSubmit(query.trim(), mode);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. EGFR T790M, HIV K103N…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "full" | "lite")}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
        >
          <option value="full">Full</option>
          <option value="lite">Lite</option>
        </select>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:bg-[var(--primary)]/90 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Zap size={14} />
          )}
          Analyze
        </button>
      </div>
    </form>
  );
}
