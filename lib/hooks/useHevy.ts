"use client";

import { useCallback, useEffect, useState } from "react";
import type { HevyWorkout } from "@/lib/types";

interface HevyState {
  workouts: HevyWorkout[];
  syncedAt: string | null;
  warning?: string;
}

export function useHevy() {
  const [data, setData] = useState<HevyState>({
    workouts: [],
    syncedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/hevy", {
        method: force ? "POST" : "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as HevyState & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load training data.");
      setData(result);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load training data.");
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
