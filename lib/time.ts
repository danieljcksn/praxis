// Time formatting helpers. All durations are in milliseconds unless noted.

/** Clock face for the live timer: `MM:SS`, or `H:MM:SS` past an hour. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/** Human duration for logs and stats: `1h 24m`, `47m`, `< 1m`. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Duration given in whole minutes: `1h 24m`, `47m`, `0m`. Used by the
 *  integrations, which all report minutes rather than milliseconds. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

/** Compact duration for dense tiles: `1.4h`, `47m`. */
export function formatDurationCompact(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = totalMinutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
}

/** `Jul 22`, `Jul 22, 2025` when not the current year. */
export function formatDate(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const sameYear = new Date(now).getFullYear() === d.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** `3:07 PM`. */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Relative day label used in the history log: Today / Yesterday / weekday. */
export function formatRelativeDay(ts: number, now = Date.now()): string {
  const dayKey = toDayKey(ts);
  const todayKey = toDayKey(now);
  if (dayKey === todayKey) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey === toDayKey(yesterday.getTime())) return "Yesterday";
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / 86_400_000);
  const d = new Date(ts);
  if (diffDays < 7 && diffDays > 0) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(new Date(now).getFullYear() === d.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Add `n` calendar days to `ts`, stepping by local date components so it stays
 *  correct across DST transitions (a fixed 24h offset would skip/repeat a day on
 *  spring-forward / fall-back). */
export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Local midnight (epoch ms) for the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Stable `YYYY-MM-DD` key in local time — the unit streaks and the heatmap use. */
export function toDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inverse of `toDayKey`. Anchored at local noon so a DST shift can never
 *  push the value into the neighbouring day. */
export function fromDayKey(key: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ts = new Date(`${key}T12:00:00`).getTime();
  return Number.isFinite(ts) ? ts : null;
}
