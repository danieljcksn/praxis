import type { CategoryId, Piece, Session } from "./types";
import { addDays, startOfDay, toDayKey } from "./time";

const DAY = 86_400_000;

// ── Day grouping ───────────────────────────────────────────────────────────────
export interface DayGroup {
  key: string;
  date: number; // start-of-day epoch
  totalMs: number;
  sessions: Session[];
}

/** Sessions grouped by local day, newest day first, sessions newest-first within. */
export function groupByDay(sessions: Session[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const s of sessions) {
    const key = toDayKey(s.startedAt);
    let g = map.get(key);
    if (!g) {
      g = { key, date: startOfDay(s.startedAt), totalMs: 0, sessions: [] };
      map.set(key, g);
    }
    g.totalMs += s.durationMs;
    g.sessions.push(s);
  }
  const groups = [...map.values()];
  groups.sort((a, b) => b.date - a.date);
  for (const g of groups) g.sessions.sort((a, b) => b.startedAt - a.startedAt);
  return groups;
}

// ── Streaks ────────────────────────────────────────────────────────────────────
export interface Streaks {
  current: number;
  longest: number;
}

/** Current streak stays alive if you practiced today or yesterday. */
export function computeStreaks(sessions: Session[], now = Date.now()): Streaks {
  if (sessions.length === 0) return { current: 0, longest: 0 };
  const days = new Set(sessions.map((s) => toDayKey(s.startedAt)));

  // current — step by calendar days so a spring-forward day is never skipped.
  const todayStart = startOfDay(now);
  let cursor: number | null = null;
  if (days.has(toDayKey(todayStart))) cursor = todayStart;
  else if (days.has(toDayKey(addDays(todayStart, -1)))) cursor = addDays(todayStart, -1);

  let current = 0;
  if (cursor !== null) {
    while (days.has(toDayKey(cursor))) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  // longest
  const sortedDays = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const key of sortedDays) {
    const ts = new Date(`${key}T00:00:00`).getTime();
    if (prev !== null && Math.round((ts - prev) / DAY) === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = ts;
  }

  return { current, longest: Math.max(longest, current) };
}

// ── Rollups ────────────────────────────────────────────────────────────────────
export function sumMs(sessions: Session[]): number {
  return sessions.reduce((acc, s) => acc + s.durationMs, 0);
}

export function startOfWeek(ts: number, weekStartsOn: 0 | 1): number {
  const d = startOfDay(ts);
  const dow = new Date(d).getDay();
  const offset = (dow - weekStartsOn + 7) % 7;
  return addDays(d, -offset);
}

export interface Rollups {
  total: number;
  today: number;
  week: number;
  month: number;
  last7: number;
  avgSession: number;
  bestDayMs: number;
  activeDays: number;
  sessionCount: number;
}

export function computeRollups(
  sessions: Session[],
  weekStartsOn: 0 | 1,
  now = Date.now(),
): Rollups {
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, weekStartsOn);
  const monthStart = (() => {
    const d = new Date(now);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const sevenAgo = addDays(todayStart, -6);

  let today = 0;
  let week = 0;
  let month = 0;
  let last7 = 0;
  const byDay = new Map<string, number>();

  for (const s of sessions) {
    const t = s.startedAt;
    if (t >= todayStart) today += s.durationMs;
    if (t >= weekStart) week += s.durationMs;
    if (t >= monthStart) month += s.durationMs;
    if (t >= sevenAgo) last7 += s.durationMs;
    const key = toDayKey(t);
    byDay.set(key, (byDay.get(key) ?? 0) + s.durationMs);
  }

  const bestDayMs = byDay.size ? Math.max(...byDay.values()) : 0;
  const total = sumMs(sessions);

  return {
    total,
    today,
    week,
    month,
    last7,
    avgSession: sessions.length ? total / sessions.length : 0,
    bestDayMs,
    activeDays: byDay.size,
    sessionCount: sessions.length,
  };
}

// ── Contribution values ────────────────────────────────────────────────────────
/** Practice minutes per local day, in the shape ContributionGrid consumes.
 *  Shared by the overview and the history heatmap so both read from exactly
 *  the same series. */
export function practiceMinutesByDay(sessions: Session[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const s of sessions) {
    const key = toDayKey(s.startedAt);
    values.set(key, (values.get(key) ?? 0) + Math.round(s.durationMs / 60_000));
  }
  return values;
}

// ── Category breakdown ──────────────────────────────────────────────────────────
export interface CategorySlice {
  category: CategoryId;
  totalMs: number;
  fraction: number;
}

export function categoryBreakdown(sessions: Session[]): CategorySlice[] {
  const map = new Map<CategoryId, number>();
  for (const s of sessions) map.set(s.category, (map.get(s.category) ?? 0) + s.durationMs);
  const total = sumMs(sessions);
  const slices: CategorySlice[] = [...map.entries()].map(([category, totalMs]) => ({
    category,
    totalMs,
    fraction: total ? totalMs / total : 0,
  }));
  slices.sort((a, b) => b.totalMs - a.totalMs);
  return slices;
}

// ── Per-piece ──────────────────────────────────────────────────────────────────
export interface PieceStat {
  pieceId: string;
  totalMs: number;
  sessionCount: number;
  lastPracticed: number | null;
}

/** Session time is split evenly across the pieces it touched, so per-piece
 *  totals sum back to overall repertoire time instead of double-counting. */
export function pieceStats(sessions: Session[], pieces: Piece[]): Map<string, PieceStat> {
  const stats = new Map<string, PieceStat>();
  for (const p of pieces) {
    stats.set(p.id, { pieceId: p.id, totalMs: 0, sessionCount: 0, lastPracticed: null });
  }
  for (const s of sessions) {
    if (s.pieceIds.length === 0) continue;
    const share = s.durationMs / s.pieceIds.length;
    for (const pid of s.pieceIds) {
      const stat = stats.get(pid);
      if (!stat) continue;
      stat.totalMs += share;
      stat.sessionCount += 1;
      stat.lastPracticed = Math.max(stat.lastPracticed ?? 0, s.startedAt);
    }
  }
  return stats;
}

// ── Weekly series (for the trend bars) ──────────────────────────────────────────
export interface WeekBar {
  weekStart: number;
  totalMs: number;
}

export function weeklySeries(
  sessions: Session[],
  weeksBack: number,
  weekStartsOn: 0 | 1,
  now = Date.now(),
): WeekBar[] {
  const thisWeekStart = startOfWeek(now, weekStartsOn);
  const bars: WeekBar[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    bars.push({ weekStart: addDays(thisWeekStart, -i * 7), totalMs: 0 });
  }
  // Bucket by day-key string, not exact epoch equality, so a DST hour-shift
  // between a bar's start and a session's week-start can't drop the session.
  const index = new Map(bars.map((b, i) => [toDayKey(b.weekStart), i]));
  for (const s of sessions) {
    const i = index.get(toDayKey(startOfWeek(s.startedAt, weekStartsOn)));
    if (i !== undefined) bars[i].totalMs += s.durationMs;
  }
  return bars;
}
