"use client";

import { Dna, ExternalLink, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDiscoveries } from "@/app/hooks/useDiscoveries";
import { formatBindingEnergy, formatDate, truncateSmiles } from "@/app/lib/utils";

export default function DiscoveriesPage() {
  const { discoveries, isLoading, error, remove } = useDiscoveries();
  const [search, setSearch] = useState("");

  const filtered = discoveries.filter(
    (d) =>
      d.query.toLowerCase().includes(search.toLowerCase()) ||
      d.gene?.toLowerCase().includes(search.toLowerCase()) ||
      d.mutation?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
              Discovery Library
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              All saved drug discovery sessions
            </p>
          </div>
          <Link
            href="/research"
            className="px-4 py-2 rounded-lg font-medium text-sm"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            New Analysis
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            type="text"
            placeholder="Search by gene, mutation, or query..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border text-sm outline-none"
            style={{
              background: "var(--input)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>
            Loading discoveries...
          </div>
        ) : error ? (
          <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>
            <p className="mb-2">Database not available</p>
            <p className="text-xs">Configure DATABASE_URL in backend .env to persist discoveries</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Dna className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--primary)" }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
              No discoveries yet
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
              Run your first analysis to populate this library
            </p>
            <Link
              href="/research"
              className="px-4 py-2 rounded-lg font-medium text-sm"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Launch Analysis
            </Link>
          </div>
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--muted)",
                  }}
                >
                  {[
                    "Gene",
                    "Mutation",
                    "Top Lead (SMILES)",
                    "Docking Score",
                    "Selectivity",
                    "Date",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr
                    key={d.id}
                    className="transition-colors hover:opacity-90"
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : undefined,
                    }}
                  >
                    <td
                      className="px-4 py-3 font-mono font-bold"
                      style={{ color: "var(--primary)" }}
                    >
                      {d.gene || "—"}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: "var(--foreground)" }}
                    >
                      {d.mutation || "—"}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {d.top_lead_smiles ? truncateSmiles(d.top_lead_smiles) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {d.top_lead_score != null ? (
                        <span className="font-mono text-green-600">
                          {formatBindingEnergy(d.top_lead_score)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.selectivity_ratio != null ? (
                        <span className="font-mono">{d.selectivity_ratio.toFixed(1)}×</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {formatDate(d.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/analysis/${d.session_id}`}
                          className="p-1 hover:opacity-70 transition-opacity"
                        >
                          <ExternalLink
                            className="w-4 h-4"
                            style={{ color: "var(--muted-foreground)" }}
                          />
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(d.id)}
                          className="p-1 hover:opacity-70 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
