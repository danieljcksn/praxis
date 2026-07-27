"use client";

import { useCallback, useEffect, useState } from "react";
import type { StravaActivity } from "@/lib/types";

interface StravaState {
  activities: StravaActivity[];
  syncedAt: string | null;
  warning?: string;
}

export function useStrava() {
  const [data, setData] = useState<StravaState>({ activities: [], syncedAt: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/strava", {
        method: force ? "POST" : "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as StravaState & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load Strava.");
      setData(result);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load Strava.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...data, loading, refreshing, error, refresh: () => load(true) };
}
