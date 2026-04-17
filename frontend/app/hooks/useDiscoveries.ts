"use client";

import { useCallback, useEffect, useState } from "react";
import { listDiscoveries, deleteDiscovery } from "@/app/lib/api";
import type { DiscoveryRecord } from "@/app/lib/types";

export function useDiscoveries() {
  const [discoveries, setDiscoveries] = useState<DiscoveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;

    listDiscoveries()
      .then((data) => {
        if (!active) return;
        setDiscoveries(data as unknown as DiscoveryRecord[]);
        setError(null);
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load discoveries");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tick]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setTick((t) => t + 1);
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteDiscovery(id);
    setDiscoveries((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { discoveries, isLoading, error, refresh, remove };
}
