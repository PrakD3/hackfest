"use client";
import { motion } from "framer-motion";

const STATS = [
  { value: "18", label: "AI Agents", suffix: "" },
  { value: "4", label: "Scientific Databases", suffix: "" },
  { value: "∞", label: "Novel Molecules", suffix: "" },
  { value: "<60s", label: "Per Analysis", suffix: "" },
];

export function StatsBar() {
  return (
    <div className="stats-bar border-y border-[var(--border)] bg-[var(--muted)] py-6">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="stat-card text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <div className="text-2xl font-bold text-[var(--primary)]">
              {stat.value}
              {stat.suffix}
            </div>
            <div className="text-sm text-[var(--muted-foreground)] mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
