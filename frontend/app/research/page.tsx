<<<<<<< Updated upstream
"use client";

import {
  ArrowRight,
  BarChart3,
  Dna,
  FlaskConical,
  Hospital,
  Search,
  Shield,
  TreePine,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAnalysis } from "@/app/hooks/useAnalysis";
import { searchMutations } from "@/app/lib/api";

const DEMO_CHIPS = ["EGFR T790M", "HIV K103N", "BRCA1 5382insC", "TP53 R248W"];

const FEATURES = [
  {
    icon: Dna,
    title: "De Novo Generation",
    desc: "Generates novel molecules beyond existing databases via scaffold and bioisostere transformations.",
  },
  {
    icon: Shield,
    title: "Selectivity Dual-Docking",
    desc: "Scores target binding versus healthy off-target proteins to prioritize safer leads.",
  },
  {
    icon: FlaskConical,
    title: "ADMET Screening",
    desc: "Evaluates drug-likeness, PAINS alerts, bioavailability, and toxicity signals before ranking.",
  },
  {
    icon: TreePine,
    title: "Evolution Tree",
    desc: "Tracks optimization operations and score deltas across generations of candidate molecules.",
  },
  {
    icon: Hospital,
    title: "Clinical Trial Matching",
    desc: "Maps targets and compounds to relevant active trials for translational context.",
  },
  {
    icon: BarChart3,
    title: "Explainability + Trace",
    desc: "Captures reasoning sections, metrics, and provider metadata for auditable decisions.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Target Framing",
    desc: "Parse mutation and gather evidence from literature, protein, structure, and known compounds.",
  },
  {
    num: "02",
    title: "Lead Discovery",
    desc: "Generate molecules, dock against target and off-targets, then filter through ADMET and optimization.",
  },
  {
    num: "03",
    title: "Decision Report",
    desc: "Produce ranked leads with reasoning trace, resistance forecast, and exportable artifacts.",
  },
];

export default function ResearchPage() {
  const router = useRouter();
  const { launch, isLoading } = useAnalysis();
  const [query, setQuery] = useState("");
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
  const [onlineSuggestions, setOnlineSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocalSuggesting, setIsLocalSuggesting] = useState(false);
  const [isOnlineSuggesting, setIsOnlineSuggesting] = useState(false);
  const searchRequestId = useRef(0);

  const handleLaunch = async () => {
    if (!query.trim()) return;
    const sessionId = await launch(query);
    if (sessionId) {
      router.push(`/analysis/${sessionId}`);
    }
  };

  const handleChip = async (chip: string) => {
    setQuery(chip);
    const sessionId = await launch(chip);
    if (sessionId) {
      router.push(`/analysis/${sessionId}`);
    }
  };

  useEffect(() => {
    if (!showSuggestions) return;

    const handle = window.setTimeout(async () => {
      const trimmed = query.trim();
      const requestId = ++searchRequestId.current;

      setIsLocalSuggesting(true);
      setIsOnlineSuggesting(Boolean(trimmed));
      setLocalSuggestions([]);
      setOnlineSuggestions([]);

      void searchMutations(trimmed, "local")
        .then((nextLocal) => {
          if (requestId !== searchRequestId.current) return;
          setLocalSuggestions(nextLocal);
        })
        .finally(() => {
          if (requestId !== searchRequestId.current) return;
          setIsLocalSuggesting(false);
        });

      if (!trimmed) {
        setOnlineSuggestions([]);
        setIsOnlineSuggesting(false);
        return;
      }

      void searchMutations(trimmed, "online")
        .then((nextOnline) => {
          if (requestId !== searchRequestId.current) return;
          setOnlineSuggestions(nextOnline);
        })
        .finally(() => {
          if (requestId !== searchRequestId.current) return;
          setIsOnlineSuggesting(false);
        });
    }, 200);

    return () => window.clearTimeout(handle);
  }, [query, showSuggestions]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <main className="flex-1">
        <section
          className="border-b"
          style={{ borderColor: "var(--border)", background: "var(--muted)" }}
        >
          <div className="max-w-6xl mx-auto px-6 md:px-16 py-16 md:py-20">
            <p className="text-sm font-mono tracking-widest uppercase text-primary mb-3">
              Research
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-5">
              Pipeline Design And Scientific Rationale
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-8">
              This page contains the detailed research framework: model capabilities, safety
              strategy, and how each stage contributes to ranked lead recommendations.
            </p>
            <div className="max-w-3xl mb-6">
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="e.g. EGFR T790M"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors bg-input"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  {showSuggestions &&
                    (isLocalSuggesting ||
                      isOnlineSuggesting ||
                      localSuggestions.length > 0 ||
                      onlineSuggestions.length > 0) && (
                    <div
                      className="absolute z-20 mt-2 w-full rounded-xl border shadow-lg overflow-hidden"
                      style={{ borderColor: "var(--border)", background: "var(--card)" }}
                      role="listbox"
                    >
                      <div className="grid md:grid-cols-2">
                        <div className="border-r" style={{ borderColor: "var(--border)" }}>
                          <div className="px-4 py-2 text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                            Local Search
                          </div>
                          {isLocalSuggesting && (
                            <div className="px-4 py-2 text-xs text-muted-foreground">
                              Searching local file...
                            </div>
                          )}
                          {!isLocalSuggesting && localSuggestions.length === 0 && query.trim() && (
                            <div className="px-4 py-2 text-xs text-muted-foreground">
                              No local matches
                            </div>
                          )}
                          {localSuggestions.map((item, index) => (
                            <button
                              key={`local-${item}-${index}`}
                              type="button"
                              className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setQuery(item);
                                setShowSuggestions(false);
                              }}
                            >
                              <span className="font-mono text-xs text-muted-foreground mr-2">
                                Local
                              </span>
                              {item}
                            </button>
                          ))}
                        </div>
                        <div>
                          <div className="px-4 py-2 text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                            Online Search
                          </div>
                          {isOnlineSuggesting && (
                            <div className="px-4 py-2 text-xs text-muted-foreground">Searching...</div>
                          )}
                          {!isOnlineSuggesting && onlineSuggestions.length === 0 && query.trim() && (
                            <div className="px-4 py-2 text-xs text-muted-foreground">
                              No online matches
                            </div>
                          )}
                          {onlineSuggestions.map((item, index) => (
                            <button
                              key={`online-${item}-${index}`}
                              type="button"
                              className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setQuery(item);
                                setShowSuggestions(false);
                              }}
                            >
                              <span className="font-mono text-xs text-muted-foreground mr-2">
                                Online
                              </span>
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={isLoading || !query.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isLoading ? "Starting..." : "Launch"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_CHIPS.map((chip) => (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => handleChip(chip)}
                    disabled={isLoading}
                    className="px-3 py-1 rounded-lg text-xs font-mono border transition-all hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: "var(--accent)",
                      borderColor: "var(--border)",
                      color: "var(--accent-foreground)",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleChip("EGFR T790M")}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {isLoading ? "Starting..." : "Run EGFR Demo"}
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                Back To Landing
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 md:px-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Core Research Modules</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <article
                  key={title}
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "var(--accent)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--primary)" }} />
                  </div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 md:px-16" style={{ background: "var(--muted)" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-10 text-center">Research Flow</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step) => (
                <article
                  key={step.num}
                  className="rounded-xl border p-6 text-center"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--background)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 border-2 flex items-center justify-center font-bold text-primary"
                    style={{ borderColor: "var(--primary)" }}
                  >
                    {step.num}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
=======
"use client";

import {
  ArrowRight,
  BarChart3,
  Dna,
  FlaskConical,
  Hospital,
  Search,
  Shield,
  TreePine,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAnalysis } from "@/app/hooks/useAnalysis";

const DEMO_CHIPS = ["EGFR T790M", "HIV K103N", "BRCA1 5382insC", "TP53 R248W"];

const FEATURES = [
  {
    icon: Dna,
    title: "De Novo Generation",
    desc: "Generates novel molecules beyond existing databases via scaffold and bioisostere transformations.",
  },
  {
    icon: Shield,
    title: "Selectivity Dual-Docking",
    desc: "Scores target binding versus healthy off-target proteins to prioritize safer leads.",
  },
  {
    icon: FlaskConical,
    title: "ADMET Screening",
    desc: "Evaluates drug-likeness, PAINS alerts, bioavailability, and toxicity signals before ranking.",
  },
  {
    icon: TreePine,
    title: "Evolution Tree",
    desc: "Tracks optimization operations and score deltas across generations of candidate molecules.",
  },
  {
    icon: Hospital,
    title: "Clinical Trial Matching",
    desc: "Maps targets and compounds to relevant active trials for translational context.",
  },
  {
    icon: BarChart3,
    title: "Explainability + Trace",
    desc: "Captures reasoning sections, metrics, and provider metadata for auditable decisions.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Target Framing",
    desc: "Parse mutation and gather evidence from literature, protein, structure, and known compounds.",
  },
  {
    num: "02",
    title: "Lead Discovery",
    desc: "Generate molecules, dock against target and off-targets, then filter through ADMET and optimization.",
  },
  {
    num: "03",
    title: "Decision Report",
    desc: "Produce ranked leads with reasoning trace, resistance forecast, and exportable artifacts.",
  },
];

export default function ResearchPage() {
  const router = useRouter();
  const { launch, isLoading } = useAnalysis();
  const [query, setQuery] = useState("");

  const handleLaunch = async () => {
    if (!query.trim()) return;
    const sessionId = await launch(query);
    if (sessionId) {
      router.push(`/analysis/${sessionId}`);
    }
  };

  const handleChip = async (chip: string) => {
    setQuery(chip);
    const sessionId = await launch(chip);
    if (sessionId) {
      router.push(`/analysis/${sessionId}`);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <main className="flex-1">
        <section
          className="border-b"
          style={{ borderColor: "var(--border)", background: "var(--muted)" }}
        >
          <div className="max-w-6xl mx-auto px-6 md:px-16 py-16 md:py-20">
            <p className="text-sm font-mono tracking-widest uppercase text-primary mb-3">
              Research
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-5">
              Pipeline Design And Scientific Rationale
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-8">
              This page contains the detailed research framework: model capabilities, safety
              strategy, and how each stage contributes to ranked lead recommendations.
            </p>
            <div className="max-w-3xl mb-6">
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="e.g. EGFR T790M"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors bg-input"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={isLoading || !query.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isLoading ? "Starting..." : "Launch"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_CHIPS.map((chip) => (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => handleChip(chip)}
                    disabled={isLoading}
                    className="px-3 py-1 rounded-lg text-xs font-mono border transition-all hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: "var(--accent)",
                      borderColor: "var(--border)",
                      color: "var(--accent-foreground)",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleChip("EGFR T790M")}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {isLoading ? "Starting..." : "Run EGFR Demo"}
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border hover:bg-muted transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                Back To Landing
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 md:px-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Core Research Modules</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <article
                  key={title}
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "var(--accent)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--primary)" }} />
                  </div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 md:px-16" style={{ background: "var(--muted)" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-10 text-center">Research Flow</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step) => (
                <article
                  key={step.num}
                  className="rounded-xl border p-6 text-center"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--background)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 border-2 flex items-center justify-center font-bold text-primary"
                    style={{ borderColor: "var(--primary)" }}
                  >
                    {step.num}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
>>>>>>> Stashed changes
