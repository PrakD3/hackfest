export interface ThemeTokens {
  name: string;
  colors: Record<string, string>;
}

export const AMBER_MINIMAL: ThemeTokens = {
  name: "amber minimal theme",
  colors: {
    background: "#ffffff",
    foreground: "#444444",
    primary: "#fbbf24",
    "primary-foreground": "#000000",
    secondary: "#f7f7fb",
    "secondary-foreground": "#726f84",
    accent: "#fdf9ec",
    "accent-foreground": "#945c2e",
    muted: "#fafafa",
    "muted-foreground": "#8c8c94",
    border: "#ececf0",
    input: "#ececf0",
    ring: "#fbbf24",
    card: "#ffffff",
    "card-foreground": "#444444",
    destructive: "#b63a23",
    "destructive-foreground": "#ffffff",
  },
};

export const DARK_THEME: ThemeTokens = {
  name: "dark theme",
  colors: {
    background: "#0f172a",
    foreground: "#f8fafc",
    primary: "#fbbf24",
    "primary-foreground": "#0f172a",
    secondary: "#1e293b",
    "secondary-foreground": "#94a3b8",
    accent: "#292524",
    "accent-foreground": "#fcd34d",
    muted: "#1e293b",
    "muted-foreground": "#64748b",
    border: "#334155",
    input: "#334155",
    ring: "#fbbf24",
    card: "#1e293b",
    "card-foreground": "#f8fafc",
    destructive: "#b63a23",
    "destructive-foreground": "#ffffff",
  },
};

export function applyTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens.colors)) {
    root.style.setProperty(`--${key}`, value);
  }
  localStorage.setItem("dda-theme", JSON.stringify(tokens));
}

export function exportTheme(tokens: ThemeTokens): void {
  const blob = new Blob([JSON.stringify(tokens, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tokens.name.replace(/\s+/g, "_")}_theme.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importThemeFromJSON(json: string): ThemeTokens | null {
  try {
    const p = JSON.parse(json);
    return p?.colors ? { name: p.name ?? "Custom", colors: p.colors } : null;
  } catch {
    return null;
  }
}

export function getSavedTheme(): ThemeTokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("dda-theme");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ThemeTokens;
  } catch {
    return null;
  }
}
