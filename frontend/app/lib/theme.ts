export interface ThemeTokens {
  name: string;
  colors: Record<string, string>;
}

export const AMBER_MINIMAL: ThemeTokens = {
  name: "amber minimal theme",
  colors: {
    accent: "#fdf9ec",
    "accent-foreground": "#945c2e",
    background: "#ffffff",
    border: "#ececf0",
    card: "#ffffff",
    "card-foreground": "#444444",
    destructive: "#b63a23",
    "destructive-foreground": "#ffffff",
    foreground: "#444444",
    input: "#ececf0",
    muted: "#fafafa",
    "muted-foreground": "#8c8c94",
    popover: "#ffffff",
    "popover-foreground": "#444444",
    primary: "#fbbf24",
    "primary-foreground": "#000000",
    secondary: "#f7f7fb",
    "secondary-foreground": "#726f84",
    "ring-3": "#fbbf24",
    "sidebar-accent": "#fdf9ec",
    "sidebar-accent-foreground": "#945c2e",
    "sidebar-background": "#fafafa",
    "sidebar-border": "#ececf0",
    "sidebar-foreground": "#444444",
    "sidebar-primary": "#fbbf24",
    "sidebar-primary-foreground": "#ffffff",
    "sidebar-ring": "#fbbf24",
    "header-accent": "#fdf9ec",
    "header-accent-foreground": "#945c2e",
    "header-background": "#ffffff",
    "header-border": "#ececf0",
    "header-foreground": "#8c8c94",
    "header-primary": "#fbbf24",
    "header-primary-foreground": "#000000",
    "header-ring": "#fbbf24",
  },
};

export function applyTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;

  const aliases: Record<string, string> = {
    "ring-3": "ring",
    "sidebar-background": "sidebar",
    "header-background": "header-bg",
    "header-border": "header-border",
    "header-foreground": "header-foreground",
    "header-primary": "header-primary",
    "header-primary-foreground": "header-primary-foreground",
    "header-accent": "header-accent",
    "header-accent-foreground": "header-accent-foreground",
    "header-ring": "header-ring",
  };

  for (const [key, value] of Object.entries(tokens.colors)) {
    root.style.setProperty(`--${key}`, value);
    const alias = aliases[key];
    if (alias) {
      root.style.setProperty(`--${alias}`, value);
    }
  }
  localStorage.setItem("dda-theme", JSON.stringify(tokens));
}

export function exportTheme(tokens: ThemeTokens): void {
  const blob = new Blob([JSON.stringify(tokens, null, 2)], {
    type: "application/json",
  });
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
