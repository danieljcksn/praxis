import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { StravaActivity } from "@/lib/types";

const STRAVA_API_URL = "https://www.strava.com/api/v3";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const PAGE_SIZE = 200;
const SYNC_MAX_AGE_MS = 30 * 60_000;

interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface StravaApiActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
}

function credentials() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Strava credentials are not configured.");
  return { clientId, clientSecret };
}

async function storeTokens(tokens: TokenState): Promise<void> {
  const { error } = await getSupabaseAdmin().from("integration_tokens").upsert({
    key: "strava",
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function exchangeStravaCode(code: string, redirectUri: string): Promise<void> {
  const { clientId, clientSecret } = credentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const response = await fetch(TOKEN_URL, { method: "POST", body, cache: "no-store" });
  const result = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    message?: string;
  };
  if (!response.ok || !result.access_token || !result.refresh_token || !result.expires_at) {
    throw new Error(result.message ?? "Strava authorization failed.");
  }
  await storeTokens({
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: result.expires_at,
  });
  await getSupabaseAdmin().from("integration_syncs").delete().eq("key", "strava");
}

async function refreshAccessToken(refreshToken: string): Promise<TokenState> {
  const { clientId, clientSecret } = credentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch(TOKEN_URL, { method: "POST", body, cache: "no-store" });
  const result = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    message?: string;
  };
  if (!response.ok || !result.access_token || !result.refresh_token || !result.expires_at) {
    throw new Error(result.message ?? "Could not refresh Strava access.");
  }
  const tokens = {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: result.expires_at,
  };
  await storeTokens(tokens);
  return tokens;
}

async function accessToken(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("integration_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("key", "strava")
    .maybeSingle();
  if (error) throw error;

  const initialAccessToken = process.env.STRAVA_ACCESS_TOKEN;
  const initialRefreshToken = process.env.STRAVA_REFRESH_TOKEN;
  const state: TokenState | null = data
    ? {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Number(data.expires_at),
      }
    : initialAccessToken && initialRefreshToken
      ? {
          accessToken: initialAccessToken,
          refreshToken: initialRefreshToken,
          expiresAt: 0,
        }
      : null;
  if (!state) throw new Error("Strava has not been connected.");
  if (state.expiresAt > Math.floor(Date.now() / 1000) + 3_600) return state.accessToken;
  return (await refreshAccessToken(state.refreshToken)).accessToken;
}

async function fetchActivities(): Promise<StravaApiActivity[]> {
  const token = await accessToken();
  const activities: StravaApiActivity[] = [];

  for (let page = 1; page <= 100; page += 1) {
    const response = await fetch(
      `${STRAVA_API_URL}/athlete/activities?page=${page}&per_page=${PAGE_SIZE}`,
      {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (response.status === 401 || response.status === 403) {
        throw new Error("Strava needs activity permission. Reconnect it below.");
      }
      throw new Error(result.message ?? `Strava returned ${response.status}.`);
    }
    const pageActivities = (await response.json()) as StravaApiActivity[];
    if (!Array.isArray(pageActivities)) throw new Error("Strava returned an invalid response.");
    activities.push(...pageActivities);
    if (pageActivities.length < PAGE_SIZE) break;
  }
  return activities;
}

function toRow(activity: StravaApiActivity) {
  const startedAt = Date.parse(activity.start_date);
  if (!Number.isFinite(startedAt)) return null;
  return {
    id: String(activity.id),
    name: typeof activity.name === "string" && activity.name.trim() ? activity.name : "Activity",
    type: typeof activity.type === "string" ? activity.type : "Activity",
    sport_type: typeof activity.sport_type === "string" ? activity.sport_type : activity.type,
    start_time: new Date(startedAt).toISOString(),
    elapsed_minutes: Math.max(0, Math.round((Number(activity.elapsed_time) || 0) / 60)),
    moving_minutes: Math.max(0, Math.round((Number(activity.moving_time) || 0) / 60)),
    distance_meters: Math.max(0, Number(activity.distance) || 0),
    elevation_meters: Number(activity.total_elevation_gain) || 0,
  };
}

export async function syncStravaActivities(): Promise<{ count: number; syncedAt: string }> {
  const activities = await fetchActivities();
  const rows = activities.map(toRow).filter((row): row is NonNullable<typeof row> => row !== null);
  const supabase = getSupabaseAdmin();
  const syncedAt = new Date().toISOString();

  for (let index = 0; index < rows.length; index += 200) {
    const { error } = await supabase
      .from("strava_activities")
      .upsert(rows.slice(index, index + 200).map((row) => ({ ...row, synced_at: syncedAt })));
    if (error) throw error;
  }

  const { data: existing, error: existingError } = await supabase
    .from("strava_activities")
    .select("id");
  if (existingError) throw existingError;
  const currentIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !currentIds.has(id));
  for (let index = 0; index < staleIds.length; index += 200) {
    const { error } = await supabase
      .from("strava_activities")
      .delete()
      .in("id", staleIds.slice(index, index + 200));
    if (error) throw error;
  }

  const { error: syncError } = await supabase.from("integration_syncs").upsert({
    key: "strava",
    synced_at: syncedAt,
    record_count: rows.length,
    metadata: { source: "full-sync" },
  });
  if (syncError) throw syncError;
  return { count: rows.length, syncedAt };
}

export async function getStravaActivities(options?: { force?: boolean }): Promise<{
  activities: StravaActivity[];
  syncedAt: string | null;
  warning?: string;
}> {
  const supabase = getSupabaseAdmin();
  const { data: syncState } = await supabase
    .from("integration_syncs")
    .select("synced_at, metadata")
    .eq("key", "strava")
    .maybeSingle();
  const lastSync = syncState?.synced_at ? Date.parse(syncState.synced_at) : 0;
  let warning =
    typeof syncState?.metadata?.error === "string"
      ? (syncState.metadata.error as string)
      : undefined;
  let syncedAt = syncState?.synced_at ?? null;

  if (options?.force || Date.now() - lastSync > SYNC_MAX_AGE_MS) {
    try {
      const result = await syncStravaActivities();
      syncedAt = result.syncedAt;
    } catch (error) {
      console.error("Strava sync failed", error);
      warning = error instanceof Error ? error.message : "Strava sync failed.";
      await supabase.from("integration_syncs").upsert({
        key: "strava",
        synced_at: new Date().toISOString(),
        record_count: 0,
        metadata: { source: "failed-attempt", error: warning },
      });
    }
  }

  const { data, error } = await supabase
    .from("strava_activities")
    .select(
      "id, name, type, sport_type, start_time, elapsed_minutes, moving_minutes, distance_meters, elevation_meters",
    )
    .order("start_time", { ascending: false });
  if (error) throw error;
  return {
    activities: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      sportType: row.sport_type,
      startTime: row.start_time,
      elapsedMinutes: row.elapsed_minutes,
      movingMinutes: row.moving_minutes,
      distanceMeters: row.distance_meters,
      elevationMeters: row.elevation_meters,
    })),
    syncedAt,
    warning,
  };
}
