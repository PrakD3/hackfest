"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  EvolutionEdge,
  EvolutionNode,
  EvolutionTree as EvolutionTreeType,
} from "@/app/lib/types";

interface Props {
  tree: EvolutionTreeType | null | undefined;
}

interface SvgPath {
  id: string;
  d: string;
  color: string;
  dashed: boolean;
  label: string;
  delta: number;
}

function scoreColor(score: number): string {
  if (score <= -9) return "var(--affinity-excellent)";
  if (score <= -7) return "var(--affinity-good)";
  if (score <= -5) return "var(--affinity-moderate)";
  return "var(--affinity-poor)";
}

const METHOD_COLOR: Record<string, string> = {
  scaffold_hop: "var(--color-info)",
  bioisostere: "var(--color-warning)",
  fragment_link: "var(--affinity-moderate)",
  ring_expand: "var(--stability-stable)",
  ring_contract: "var(--stability-borderline)",
  substituent: "var(--color-danger)",
  seed: "var(--muted-foreground)",
};

function methodColor(method: string): string {
  return METHOD_COLOR[method] ?? "#6b7280";
}

export function EvolutionTree({ tree }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [svgPaths, setSvgPaths] = useState<SvgPath[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  // Group nodes by generation
  const nodesByGen = (tree?.nodes ?? []).reduce<Record<number, EvolutionNode[]>>((acc, node) => {
    const g = node.generation;
    if (!acc[g]) acc[g] = [];
    acc[g].push(node);
    return acc;
  }, {});
  const generations = Object.keys(nodesByGen)
    .map(Number)
    .sort((a, b) => a - b);

  const recalcPaths = useCallback(() => {
    if (!containerRef.current || !tree?.edges?.length) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    type Pos = { x: number; y: number; w: number; h: number };
    const positions: Record<string, Pos> = {};

    for (const [id, el] of Object.entries(nodeRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      positions[id] = {
        x: r.left - containerRect.left,
        y: r.top - containerRect.top,
        w: r.width,
        h: r.height,
      };
    }

    const allPos = Object.values(positions);
    if (!allPos.length) return;

    const maxW = Math.max(...allPos.map((p) => p.x + p.w)) + 8;
    const maxH = Math.max(...allPos.map((p) => p.y + p.h)) + 8;
    setSvgSize({ w: maxW, h: maxH });

    const paths: SvgPath[] = [];
    for (const edge of tree.edges as EvolutionEdge[]) {
      const from = positions[edge.from_id];
      const to = positions[edge.to_id];
      if (!from || !to) continue;

      const x1 = from.x + from.w;
      const y1 = from.y + from.h / 2;
      const x2 = to.x;
      const y2 = to.y + to.h / 2;
      const cx = (x1 + x2) / 2;

      paths.push({
        id: `${edge.from_id}--${edge.to_id}`,
        d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
        color: edge.delta_score < 0 ? "var(--stability-stable)" : "var(--stability-unstable)",
        dashed: edge.delta_score >= 0,
        label: edge.operation,
        delta: edge.delta_score,
      });
    }

    setSvgPaths(paths);
  }, [tree]);

  useEffect(() => {
    // Small delay to let layout settle after first render
    const id = setTimeout(recalcPaths, 60);
    const ro = new ResizeObserver(() => setTimeout(recalcPaths, 30));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      clearTimeout(id);
      ro.disconnect();
    };
  }, [recalcPaths]);

  if (!tree || (!tree.nodes?.length && !tree.edges?.length)) {
    return (
      <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">
        No evolution data available for this session.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4">
      {/* Scrollable canvas */}
      <div ref={containerRef} className="relative inline-flex gap-10 items-start min-w-max pb-2">
        {/* SVG edge layer */}
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          width={svgSize.w}
          height={svgSize.h}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="evo-arrow-green"
              markerWidth="6"
              markerHeight="4"
              refX="5"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="var(--stability-stable)" opacity="0.75" />
            </marker>
            <marker
              id="evo-arrow-red"
              markerWidth="6"
              markerHeight="4"
              refX="5"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="var(--stability-unstable)" opacity="0.75" />
            </marker>
          </defs>

          {svgPaths.map((p) => (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={1.5}
              strokeOpacity={0.55}
              strokeDasharray={p.dashed ? "4 3" : undefined}
              markerEnd={`url(#evo-arrow-${p.delta < 0 ? "green" : "red"})`}
            />
          ))}
        </svg>

        {/* Generation columns */}
        {generations.map((gen) => (
          <div key={gen} className="flex flex-col items-center gap-3 z-10">
            {/* Column header */}
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] whitespace-nowrap">
              {gen === 0 ? "Seed" : `Gen ${gen}`}
            </span>

            {/* Node cards */}
            {nodesByGen[gen].map((node) => (
              <div
                key={node.id}
                ref={(el) => {
                  nodeRefs.current[node.id] = el;
                }}
                className="w-44 rounded-lg border p-3 text-xs space-y-2 transition-shadow hover:shadow-md cursor-default select-none"
                style={{
                  background: "var(--card)",
                  borderColor: node.admet_pass
                    ? "color-mix(in srgb, var(--stability-stable) 35%, var(--border))"
                    : "color-mix(in srgb, var(--stability-unstable) 28%, var(--border))",
                }}
              >
                {/* Score + ADMET row */}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="font-bold text-sm tabular-nums leading-none"
                    style={{ color: scoreColor(node.score) }}
                  >
                    {node.score.toFixed(2)}
                    <span className="ml-0.5 text-[10px] font-normal text-[var(--muted-foreground)]">
                      kcal
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: node.admet_pass
                        ? "color-mix(in srgb, var(--stability-stable) 10%, transparent)"
                        : "color-mix(in srgb, var(--stability-unstable) 10%, transparent)",
                      color: node.admet_pass
                        ? "var(--stability-stable)"
                        : "var(--stability-unstable)",
                    }}
                  >
                    {node.admet_pass ? "ADMET ✓" : "ADMET ✗"}
                  </span>
                </div>

                {/* SMILES snippet */}
                <p
                  className="font-mono text-[10px] text-[var(--muted-foreground)] truncate"
                  title={node.smiles}
                >
                  {node.smiles.length > 28 ? `${node.smiles.slice(0, 28)}…` : node.smiles}
                </p>

                {/* Method pill */}
                <span
                  className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: `${methodColor(node.method)}1a`,
                    color: methodColor(node.method),
                  }}
                >
                  {node.method.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[10px] text-[var(--muted-foreground)]">
        <span className="text-xs font-semibold text-[var(--foreground)]">Legend</span>

        <span className="flex items-center gap-1.5">
          <svg width="20" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="20" y2="4" stroke="var(--stability-stable)" strokeWidth="1.5" />
          </svg>
          Improved
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="20"
              y2="4"
              stroke="var(--stability-unstable)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          </svg>
          Regressed
        </span>

        <span className="mx-1 text-[var(--border)]">|</span>

        {Object.entries(METHOD_COLOR).map(([method, color]) => (
          <span key={method} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            {method.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
