"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ThemeTokens,
  AMBER_MINIMAL,
  applyTheme,
  getSavedTheme,
} from "@/app/lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeTokens>(
    () => getSavedTheme() ?? AMBER_MINIMAL,
  );
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const changeTheme = useCallback((tokens: ThemeTokens) => {
    setTheme(tokens);
  }, []);

  const toggleDark = useCallback(() => {
    const root = document.documentElement;
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [isDark]);

  return { theme, isDark, changeTheme, toggleDark };
}
