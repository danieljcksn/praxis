"use client";

import { useCallback, useEffect, useState } from "react";
import type { GitHubActivity } from "@/lib/github-activity";

export function useGithub() {
  const [data, setData] = useState<GitHubActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch("/api/github", {
        method: force ? "POST" : "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as GitHubActivity & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load GitHub activity.");
      setData(result);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load GitHub activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, refreshing, error, refresh: () => load(true) };
}
