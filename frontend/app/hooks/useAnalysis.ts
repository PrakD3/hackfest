"use client";

import { useCallback, useState } from "react";
import { startAnalysis } from "@/app/lib/api";

export function useAnalysis() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launch = useCallback(async (query: string, mode: "full" | "lite" = "full") => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await startAnalysis(query, mode);
      setSessionId(result.session_id);
      return result.session_id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sessionId, isLoading, error, launch };
}
