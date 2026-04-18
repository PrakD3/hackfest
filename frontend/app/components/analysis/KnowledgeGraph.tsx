"use client";
import { useEffect, useRef } from "react";
import type { KnowledgeGraph as KGType } from "@/app/lib/types";

interface Props {
  graph: KGType | null;
}

export function KnowledgeGraph({ graph }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!graph || !svgRef.current) return;

    let cancelled = false;

    import("d3").then((d3) => {
      if (cancelled || !svgRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const el = svgRef.current;
      const width = el.clientWidth || 600;
      const height = el.clientHeight || 400;

      type NodeDatum = {
        id: string;
        label: string;
        type: string;
        color: string;
        x?: number;
        y?: number;
        vx?: number;
        vy?: number;
        fx?: number | null;
        fy?: number | null;
      };

      type LinkDatum = {
        source: string | NodeDatum;
        target: string | NodeDatum;
        relation: string;
      };

      const nodes: NodeDatum[] = graph.nodes.map((n) => ({ ...n }));
      const links: LinkDatum[] = graph.edges.map((e) => ({
        source: e.source,
        target: e.target,
        relation: e.relation,
      }));

      const sim = d3
        .forceSimulation<NodeDatum>(nodes)
        .force(
          "link",
          d3
            .forceLink<NodeDatum, LinkDatum>(links)
            .id((d) => d.id)
            .distance(80)
        )
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg
        .append("g")
        .selectAll<SVGLineElement, LinkDatum>("line")
        .data(links)
        .join("line")
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 1.5);

      const linkLabel = svg
        .append("g")
        .selectAll<SVGTextElement, LinkDatum>("text")
        .data(links)
        .join("text")
        .attr("font-size", "7px")
        .attr("fill", "var(--muted-foreground)")
        .attr("text-anchor", "middle")
        .text((d) => d.relation);

      const node = svg
        .append("g")
        .selectAll<SVGCircleElement, NodeDatum>("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 14)
        .attr("fill", (d) => d.color || "var(--primary)")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .call(
          d3
            .drag<SVGCircleElement, NodeDatum>()
            .on("start", (event, d) => {
              if (!event.active) sim.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on("end", (event, d) => {
              if (!event.active) sim.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        );

      const label = svg
        .append("g")
        .selectAll<SVGTextElement, NodeDatum>("text")
        .data(nodes)
        .join("text")
        .attr("font-size", "9px")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "var(--foreground)")
        .text((d) => d.label?.slice(0, 8) ?? "");

      sim.on("tick", () => {
        link
          .attr("x1", (d) => (d.source as NodeDatum).x ?? 0)
          .attr("y1", (d) => (d.source as NodeDatum).y ?? 0)
          .attr("x2", (d) => (d.target as NodeDatum).x ?? 0)
          .attr("y2", (d) => (d.target as NodeDatum).y ?? 0);

        linkLabel
          .attr(
            "x",
            (d) => (((d.source as NodeDatum).x ?? 0) + ((d.target as NodeDatum).x ?? 0)) / 2
          )
          .attr(
            "y",
            (d) => (((d.source as NodeDatum).y ?? 0) + ((d.target as NodeDatum).y ?? 0)) / 2
          );

        node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
        label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
      });

      return () => {
        sim.stop();
      };
    });

    return () => {
      cancelled = true;
    };
  }, [graph]);

  if (!graph) {
    return (
      <div className="text-sm text-[var(--muted-foreground)] p-4 text-center">
        No knowledge graph available.
      </div>
    );
  }

  return <svg ref={svgRef} className="w-full h-80 rounded border border-[var(--border)]" />;
}
