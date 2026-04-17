"use client";
import { useEffect, useState } from "react";
import { Label } from "@/app/components/ui/label";
import { Slider } from "@/app/components/ui/slider";
import { Switch } from "@/app/components/ui/switch";

interface Settings {
  runSelectivity: boolean;
  runClinical: boolean;
  runSynergy: boolean;
  autoSave: boolean;
  maxMolecules: number;
}

const DEFAULT: Settings = {
  runSelectivity: true,
  runClinical: true,
  runSynergy: true,
  autoSave: false,
  maxMolecules: 50,
};

const TOGGLES = [
  ["runSelectivity", "Selectivity Agent (dual-docking)"],
  ["runClinical", "Clinical Trial Agent"],
  ["runSynergy", "Synergy Agent"],
  ["autoSave", "Auto-save discoveries"],
] as const;

export function PipelineSettings() {
  const [s, setS] = useState<Settings>(DEFAULT);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dda-pipeline");
      if (saved) setS(JSON.parse(saved));
    } catch {}
  }, []);

  const update = <K extends keyof Settings>(key: K, val: Settings[K]) => {
    const next = { ...s, [key]: val };
    setS(next);
    localStorage.setItem("dda-pipeline", JSON.stringify(next));
  };

  return (
    <div className="space-y-6 p-6 rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <h3 className="font-semibold">Pipeline Configuration</h3>

      {TOGGLES.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={key}>{label}</Label>
          <Switch id={key} checked={s[key] as boolean} onCheckedChange={(v) => update(key, v)} />
        </div>
      ))}

      <div className="space-y-2">
        <Label>
          Max molecules to generate: <strong>{s.maxMolecules}</strong>
        </Label>
        <Slider
          min={20}
          max={100}
          step={10}
          value={s.maxMolecules}
          onValueChange={([v]) => update("maxMolecules", v)}
        />
      </div>
    </div>
  );
}
