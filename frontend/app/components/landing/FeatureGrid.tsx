"use client";
import { motion } from "framer-motion";
import { Activity, BarChart2, FlaskConical, GitBranch, Hospital, Microscope } from "lucide-react";

const FEATURES = [
  { icon: FlaskConical, title: "De Novo Generation", desc: "Generates novel molecules beyond existing databases using SMARTS-based combinatorial chemistry." },
  { icon: Activity, title: "Selectivity Dual-Docking", desc: "Scores safety vs. healthy proteins in parallel — critical for avoiding off-target toxicity." },
  { icon: Microscope, title: "ADMET Screening", desc: "50+ drug-likeness and toxicity endpoints via DeepChem and SwissADME integration." },
  { icon: GitBranch, title: "Evolution Tree", desc: "Visualizes how seed molecules transform into leads across optimization generations." },
  { icon: Hospital, title: "Clinical Trial Matching", desc: "Links your discovery to active patient trials via ClinicalTrials.gov API." },
  { icon: BarChart2, title: "LangSmith Tracing", desc: "Enterprise observability on every agent call — full pipeline transparency." },
];

export function FeatureGrid() {
  return (
    <div className="features-grid max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {FEATURES.map((f, i) => (
        <motion.div
          key={f.title}
          className="feature-card p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40 transition-colors"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.5 }}
          viewport={{ once: true }}
        >
          <f.icon className="text-[var(--primary)] mb-3" size={28} />
          <h3 className="font-semibold mb-1">{f.title}</h3>
          <p className="text-sm text-[var(--muted-foreground)]">{f.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}
