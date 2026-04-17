"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { applyTheme, exportTheme, importThemeFromJSON, AMBER_MINIMAL } from "@/app/lib/theme";
import type { ThemeTokens } from "@/app/lib/types";
import { saveTheme } from "@/app/lib/api";

const CSS_VARS = [
  "background",
  "foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "accent",
  "accent-foreground",
  "muted",
  "muted-foreground",
  "border",
  "card",
  "card-foreground",
  "destructive",
  "destructive-foreground",
];

export function ThemeCustomizer() {
  const [theme, setTheme] = useState<ThemeTokens>(AMBER_MINIMAL);
  const [jsonInput, setJsonInput] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dda-theme");
      if (saved) setTheme(JSON.parse(saved));
    } catch {}
  }, []);

  const updateColor = (key: string, val: string) => {
    const next: ThemeTokens = { ...theme, colors: { ...theme.colors, [key]: val } };
    setTheme(next);
    applyTheme(next);
  };

  const handleApplyJSON = () => {
    const t = importThemeFromJSON(jsonInput);
    if (t) {
      setTheme(t);
      applyTheme(t);
      toast.success("Theme applied!");
    } else {
      toast.error("Invalid theme JSON");
    }
  };

  const handleSave = async () => {
    try {
      await saveTheme(theme.name, theme as unknown as Record<string, unknown>);
      toast.success("Theme saved to DB!");
    } catch {
      toast.error("Save failed — DB may be unavailable");
    }
  };

  const handleReset = () => {
    setTheme(AMBER_MINIMAL);
    applyTheme(AMBER_MINIMAL);
  };

  return (
    <div className="space-y-6 p-6 rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Theme Customizer</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => exportTheme(theme)}
            className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1 text-xs rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Save Theme
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CSS_VARS.map((v) => (
          <div key={v} className="flex items-center gap-2">
            <input
              type="color"
              value={theme.colors[v] ?? "#ffffff"}
              onChange={(e) => updateColor(v, e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 shrink-0"
              title={v}
            />
            <span className="text-xs text-[var(--muted-foreground)] truncate">{v}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Paste Theme JSON</label>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className="w-full h-24 p-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--background)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          placeholder='{"name": "My Theme", "colors": {"primary": "#..."}}'
        />
        <button
          type="button"
          onClick={handleApplyJSON}
          className="px-3 py-1 text-xs rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
        >
          Apply JSON
        </button>
      </div>
    </div>
  );
}
