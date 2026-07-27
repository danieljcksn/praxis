import type { HevyWorkout } from "@/lib/types";
import { addDays, startOfDay, toDayKey } from "@/lib/time";

export interface HevyDay {
  key: string;
  date: number;
  totalMinutes: number;
  workouts: HevyWorkout[];
  firstStart: number;
  lastEnd: number;
}

export function groupHevyByDay(workouts: HevyWorkout[]): HevyDay[] {
  const groups = new Map<string, HevyDay>();
  for (const workout of workouts) {
    const start = Date.parse(workout.startTime);
    const end = Date.parse(workout.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const key = toDayKey(start);
    const current = groups.get(key) ?? {
      key,
      date: startOfDay(start),
      totalMinutes: 0,
      workouts: [],
      firstStart: start,
      lastEnd: end,
    };
    current.totalMinutes += workout.durationMinutes;
    current.workouts.push(workout);
    current.firstStart = Math.min(current.firstStart, start);
    current.lastEnd = Math.max(current.lastEnd, end);
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.date - a.date);
}

export function hevyValuesByDay(workouts: HevyWorkout[]): Map<string, number> {
  return new Map(groupHevyByDay(workouts).map((day) => [day.key, day.totalMinutes]));
}

export function hevyStreak(workouts: HevyWorkout[], now = Date.now()): number {
  const days = new Set(workouts.map((workout) => toDayKey(Date.parse(workout.startTime))));
  let cursor = startOfDay(now);
  if (!days.has(toDayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
