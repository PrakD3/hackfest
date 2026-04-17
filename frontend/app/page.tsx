"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

const PANEL_BGS = ["bg-muted", "bg-background", "bg-card", "bg-muted"] as const;

const RESEARCH_PANELS = [
  {
    label: "Data",
    text: "Live scientific ingestion from PubMed, UniProt, RCSB, PubChem, and ClinicalTrials.gov creates evidence-rich target context.",
  },
  {
    label: "Generation",
    text: "RDKit-driven de novo generation expands chemical space beyond known compounds with scaffold and bioisostere strategies.",
  },
  {
    label: "Safety",
    text: "Dual-docking selectivity and ADMET filtering prioritize leads with stronger target binding and lower off-target risk.",
  },
  {
    label: "Decision",
    text: "An explainable report ranks leads with confidence, resistance outlook, trial relevance, and export-ready research artifacts.",
  },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const horizontalOuterRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".hero-word", {
        opacity: 0,
        y: 40,
        duration: 0.55,
        stagger: 0.08,
        ease: "power3.out",
      });
      gsap.from(".hero-sub", {
        opacity: 0,
        y: 18,
        duration: 0.45,
        delay: 0.45,
      });
      gsap.from(".hero-cta", {
        opacity: 0,
        y: 18,
        duration: 0.4,
        delay: 0.65,
      });

      const sections = containerRef.current?.querySelectorAll<HTMLElement>(
        "section.card-section",
      );
      if (sections?.length) {
        sections.forEach((section, index) => {
          gsap.fromTo(
            section,
            { yPercent: 3, scale: 0.98 },
            {
              yPercent: 0,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "top top",
                scrub: true,
              },
            },
          );

          if (index < sections.length - 1) {
            ScrollTrigger.create({
              trigger: section,
              start: "top top",
              end: "bottom top",
              pin: true,
              pinSpacing: false,
            });
          }
        });
      }

      const outer = horizontalOuterRef.current;
      const track = horizontalTrackRef.current;

      if (outer && track && RESEARCH_PANELS.length > 0) {
        const getViewportWidth = () => outer.clientWidth;
        const getTotalScroll = () =>
          Math.max(0, track.scrollWidth - getViewportWidth());

        const horizontalTween = gsap.to(track, {
          x: () => -getTotalScroll(),
          ease: "none",
          scrollTrigger: {
            trigger: outer,
            start: "top top",
            end: () => `+=${getTotalScroll()}`,
            scrub: true,
            pin: true,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });

        const dots = outer.querySelectorAll<HTMLElement>("[data-progress-dot]");
        if (dots.length > 1) {
          ScrollTrigger.create({
            trigger: outer,
            start: "top top",
            end: () => `+=${getTotalScroll()}`,
            scrub: true,
            onUpdate: (self) => {
              const active = Math.round(self.progress * (dots.length - 1));
              dots.forEach((dot, i) => {
                dot.style.width = i === active ? "2rem" : "1rem";
                dot.style.opacity = i === active ? "1" : "0.25";
                dot.style.backgroundColor =
                  i === active ? "var(--primary)" : "var(--muted-foreground)";
              });
            },
          });
        }

        horizontalTween.scrollTrigger?.refresh();
      }
    },
    { scope: containerRef },
  );

  useEffect(() => {
    ScrollTrigger.refresh();
  }, []);

  useEffect(() => {
    const outer = horizontalOuterRef.current;
    if (!outer || typeof ResizeObserver === "undefined") {
      return;
    }

    // Keep GSAP measurements in sync when shell width changes (e.g., sidebar collapse/expand).
    const observer = new ResizeObserver(() => {
      ScrollTrigger.refresh();
    });

    observer.observe(outer);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div ref={containerRef}>
        <section
          className="card-section relative w-full h-svh overflow-hidden bg-background flex flex-col items-center justify-center"
          style={{ zIndex: 1 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--border) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
              opacity: 0.45,
            }}
          />
          <div
            className="absolute top-[-120px] right-[-60px] w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            <p className="text-sm font-mono text-primary tracking-widest uppercase mb-6">
              Drug Discovery Platform
            </p>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.02] mb-6">
              {["From Mutation", "To Lead Compound", "In One Pipeline"].map(
                (line) => (
                  <span key={line} className="hero-word block">
                    {line}
                  </span>
                ),
              )}
            </h1>
            <p className="hero-sub text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              A stack of specialized AI agents orchestrates target validation,
              molecule design, safety checks, and evidence synthesis.
            </p>

            <div className="hero-cta max-w-2xl mx-auto">
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/research"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  Open Research Workspace
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/discoveries"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  Browse Discoveries
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          className="card-section relative w-full h-svh overflow-hidden bg-card rounded-t-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.18)] flex flex-col justify-center"
          style={{ zIndex: 2 }}
        >
          <div className="max-w-5xl mx-auto px-8 md:px-16 w-full">
            <p className="text-sm font-mono text-primary tracking-widest uppercase mb-3">
              About The Stack
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-7">
              Built for translational research teams
            </h2>
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <p className="text-base md:text-lg leading-relaxed text-muted-foreground">
                Drug Discovery AI is designed for fast hypothesis-to-lead
                cycles. Each session preserves reasoning, evidence, and ranked
                candidates so scientists can audit how recommendations were
                produced.
              </p>
              <div
                className="rounded-2xl border p-6 bg-background/70"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="grid grid-cols-2 gap-5">
                  <Metric value="18" label="Pipeline Agents" />
                  <Metric value="4" label="Live Data APIs" />
                  <Metric value="50" label="Docked Molecule Cap" />
                  <Metric value="< 60s" label="Typical Runtime" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          ref={horizontalOuterRef}
          className="relative overflow-hidden h-svh"
          style={{ zIndex: 3 }}
        >
          <div
            ref={horizontalTrackRef}
            className="flex h-full will-change-transform"
            style={{ width: `${RESEARCH_PANELS.length * 100}%` }}
          >
            {RESEARCH_PANELS.map((panel, i) => (
              <div
                key={panel.label}
                className={`relative shrink-0 h-full flex flex-col justify-center ${PANEL_BGS[i % PANEL_BGS.length]} ${i > 0 ? "border-l border-border/40" : ""}`}
                style={{ flexBasis: `${100 / RESEARCH_PANELS.length}%` }}
              >
                <div className="absolute top-8 left-8 md:left-16 flex items-center gap-3">
                  <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase select-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="w-4 h-px bg-muted-foreground/40" />
                  <span className="font-mono text-xs tracking-[0.15em] text-muted-foreground uppercase select-none">
                    {panel.label}
                  </span>
                </div>

                <div className="max-w-5xl mx-auto px-8 md:px-16 w-full">
                  <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light leading-[1.1] tracking-tight">
                    {panel.text}
                  </p>
                </div>

                <div className="absolute bottom-8 right-8 md:right-16 font-mono text-[10px] tracking-widest text-muted-foreground/30 select-none rotate-90 origin-bottom-right">
                  {String(i + 1).padStart(2, "0")} /{" "}
                  {String(RESEARCH_PANELS.length).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-8 left-8 md:left-16 flex items-center gap-1.5 text-muted-foreground/40 pointer-events-none select-none">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
              Scroll
            </span>
            <ChevronRight className="h-3 w-3" />
          </div>

          {RESEARCH_PANELS.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none select-none">
              {RESEARCH_PANELS.map((panel, i) => (
                <div
                  key={`dot-${panel.label}`}
                  data-progress-dot
                  className="h-px rounded-full transition-all duration-300"
                  style={{
                    width: i === 0 ? "2rem" : "1rem",
                    backgroundColor:
                      i === 0 ? "var(--primary)" : "var(--muted-foreground)",
                    opacity: i === 0 ? 1 : 0.25,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-bold text-primary">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
