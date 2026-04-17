"use client";

import { useCallback, useState } from "react";

interface SessionEntry {
  sessionId: string;
  query: string;
  timestamp: number;
}

const KEY = "dda-session-history";

function readHistory(): SessionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionEntry[]) : [];
  } catch {
    return [];
  }
}

export function useSessionHistory() {
  const [history, setHistory] = useState<SessionEntry[]>(readHistory);

  const addEntry = useCallback((sessionId: string, query: string) => {
    setHistory((prev) => {
      const next = [{ sessionId, query, timestamp: Date.now() }, ...prev].slice(
        0,
        10,
      );
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(KEY);
    setHistory([]);
  }, []);

  return { history, addEntry, clearHistory };
}
