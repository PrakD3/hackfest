"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { saveTheme } from "@/app/lib/api";
import { AMBER_MINIMAL, applyTheme, exportTheme, importThemeFromJSON } from "@/app/lib/theme";
import type { ThemeTokens } from "@/app/lib/types";

const CSS_VARS = [
  "accent",
  "accent-foreground",
  "background",
  "border",
  "card",
  "card-foreground",
  "destructive",
  "destructive-foreground",
  "foreground",
  "input",
  "muted",
  "muted-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "ring-3",
  "secondary",
  "secondary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-background",
  "sidebar-border",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-ring",
  "header-accent",
  "header-accent-foreground",
  "header-background",
  "header-border",
  "header-foreground",
  "header-primary",
  "header-primary-foreground",
  "header-ring",
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
    const next: ThemeTokens = {
      ...theme,
      colors: { ...theme.colors, [key]: val },
    };
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
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Theme Customizer</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="rounded border border-border px-3 py-1 text-xs transition-colors hover:bg-muted"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => exportTheme(theme)}
            className="rounded border border-border px-3 py-1 text-xs transition-colors hover:bg-muted"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90"
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
            <span className="truncate text-xs text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label htmlFor="theme-json" className="text-sm font-medium">
          Paste Theme JSON
        </label>
        <textarea
          id="theme-json"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className="h-24 w-full resize-none rounded border border-border bg-background p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder='{"name": "My Theme", "colors": {"primary": "#..."}}'
        />
        <button
          type="button"
          onClick={handleApplyJSON}
          className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90"
        >
          Apply JSON
        </button>
      </div>
    </div>
  );
}
