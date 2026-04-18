"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, PipelineState } from "@/app/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function useSSEStream(sessionId: string | null, enabled = true) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestState, setLatestState] = useState<Partial<PipelineState> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!sessionId || !enabled) {
      esRef.current?.close();
      return;
    }
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`${API_URL}/api/stream/${sessionId}`);
    esRef.current = es;
    setError(null);

    es.onmessage = (e) => {
      try {
        const data: AgentEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev, data]);
        if (data.data && typeof data.data === "object") {
          setLatestState((prev) => ({ ...(prev ?? {}), ...data.data }));
        }
        if (data.event === "pipeline_complete" || data.event === "pipeline_cancelled") {
          setIsComplete(true);
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      if (enabled) {
        setError("Stream connection error");
      }
      es.close();
    };
  }, [sessionId, enabled]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);

  return { events, isComplete, error, latestState };
}
