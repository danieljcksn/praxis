import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { HevyWorkout } from "@/lib/types";

const HEVY_API_URL = "https://api.hevyapp.com/v1";
const PAGE_SIZE = 10;
const SYNC_MAX_AGE_MS = 30 * 60_000;

interface HevyApiWorkout {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  updated_at: string;
}

interface HevyPage {
  page: number;
  page_count: number;
  workouts: HevyApiWorkout[];
}

interface HevyRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  updated_at: string;
}

function apiKey(): string {
  const value = process.env.HEVY_API_KEY;
  if (!value) throw new Error("Hevy API key is not configured.");
  return value;
}

async function fetchPage(page: number): Promise<HevyPage> {
  const response = await fetch(
    `${HEVY_API_URL}/workouts?page=${page}&pageSize=${PAGE_SIZE}`,
    {
      headers: { "api-key": apiKey(), accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Hevy returned ${response.status}.`);
  }
  const result = (await response.json()) as Partial<HevyPage>;
  if (!Array.isArray(result.workouts)) throw new Error("Hevy returned an invalid response.");
  return {
    page: typeof result.page === "number" ? result.page : page,
    page_count: Math.max(1, Math.min(1_000, Number(result.page_count) || 1)),
    workouts: result.workouts,
  };
}

async function fetchAllWorkouts(): Promise<HevyApiWorkout[]> {
  const first = await fetchPage(1);
  const workouts = [...first.workouts];

  for (let page = 2; page <= first.page_count; page += 4) {
    const pageNumbers = Array.from(
      { length: Math.min(4, first.page_count - page + 1) },
      (_, index) => page + index,
    );
    const results = await Promise.all(pageNumbers.map(fetchPage));
    for (const result of results) workouts.push(...result.workouts);
  }
  return workouts;
}

function toRow(workout: HevyApiWorkout): HevyRow | null {
  if (
    typeof workout.id !== "string" ||
    typeof workout.title !== "string" ||
    typeof workout.start_time !== "string" ||
    typeof workout.end_time !== "string"
  ) {
    return null;
  }
  const start = Date.parse(workout.start_time);
  const end = Date.parse(workout.end_time);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return {
    id: workout.id,
    title: workout.title.trim() || "Workout",
    start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(),
    duration_minutes: Math.max(0, Math.round((end - start) / 60_000)),
    updated_at: Number.isFinite(Date.parse(workout.updated_at))
      ? new Date(workout.updated_at).toISOString()
      : new Date().toISOString(),
  };
}

export async function syncHevyWorkouts(): Promise<{ count: number; syncedAt: string }> {
  const workouts = await fetchAllWorkouts();
  const rows = workouts
    .map(toRow)
    .filter((row): row is HevyRow => row !== null);
  const supabase = getSupabaseAdmin();
  const syncedAt = new Date().toISOString();

  for (let index = 0; index < rows.length; index += 200) {
    const batch = rows.slice(index, index + 200).map((row) => ({ ...row, synced_at: syncedAt }));
    const { error } = await supabase.from("hevy_workouts").upsert(batch);
    if (error) throw error;
  }

  const { data: existing, error: existingError } = await supabase
    .from("hevy_workouts")
    .select("id");
  if (existingError) throw existingError;
  const currentIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !currentIds.has(id));
  for (let index = 0; index < staleIds.length; index += 200) {
    const { error } = await supabase
      .from("hevy_workouts")
      .delete()
      .in("id", staleIds.slice(index, index + 200));
    if (error) throw error;
  }

  const { error: syncError } = await supabase.from("integration_syncs").upsert({
    key: "hevy",
    synced_at: syncedAt,
    record_count: rows.length,
    metadata: { source: "full-sync" },
  });
  if (syncError) throw syncError;
  return { count: rows.length, syncedAt };
}

export async function getHevyWorkouts(options?: { force?: boolean }): Promise<{
  workouts: HevyWorkout[];
  syncedAt: string | null;
  warning?: string;
}> {
  const supabase = getSupabaseAdmin();
  const { data: syncState } = await supabase
    .from("integration_syncs")
    .select("synced_at")
    .eq("key", "hevy")
    .maybeSingle();
  const lastSync = syncState?.synced_at ? Date.parse(syncState.synced_at) : 0;
  let warning: string | undefined;
  let syncedAt = syncState?.synced_at ?? null;

  if (options?.force || Date.now() - lastSync > SYNC_MAX_AGE_MS) {
    try {
      const result = await syncHevyWorkouts();
      syncedAt = result.syncedAt;
    } catch (error) {
      console.error("Hevy sync failed", error);
      warning = error instanceof Error ? error.message : "Hevy sync failed.";
    }
  }

  const { data, error } = await supabase
    .from("hevy_workouts")
    .select("id, title, start_time, end_time, duration_minutes")
    .order("start_time", { ascending: false });
  if (error) throw error;

  return {
    workouts: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
    })),
    syncedAt,
    warning,
  };
}
