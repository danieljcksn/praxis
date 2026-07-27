import type { HabitEntry } from "@/lib/types";
import { addDays, startOfDay, toDayKey } from "@/lib/time";

export function entriesByDay(entries: HabitEntry[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const entry of entries) {
    const key = toDayKey(entry.completedAt);
    values.set(key, (values.get(key) ?? 0) + 1);
  }
  return values;
}

export function habitStreak(entries: HabitEntry[], now = Date.now()): number {
  const days = new Set(entries.map((entry) => toDayKey(entry.completedAt)));
  let cursor = startOfDay(now);
  if (!days.has(toDayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function completedToday(entries: HabitEntry[], now = Date.now()): boolean {
  const today = toDayKey(now);
  return entries.some((entry) => toDayKey(entry.completedAt) === today);
}
