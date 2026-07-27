import type { StravaActivity } from "@/lib/types";
import { startOfDay, toDayKey } from "@/lib/time";

export interface StravaDay {
  key: string;
  date: number;
  totalMinutes: number;
  movingMinutes: number;
  distanceMeters: number;
  activities: StravaActivity[];
  firstStart: number;
  lastEnd: number;
}

export function groupStravaByDay(activities: StravaActivity[]): StravaDay[] {
  const groups = new Map<string, StravaDay>();
  for (const activity of activities) {
    const start = Date.parse(activity.startTime);
    if (!Number.isFinite(start)) continue;
    const end = start + activity.elapsedMinutes * 60_000;
    const key = toDayKey(start);
    const current = groups.get(key) ?? {
      key,
      date: startOfDay(start),
      totalMinutes: 0,
      movingMinutes: 0,
      distanceMeters: 0,
      activities: [],
      firstStart: start,
      lastEnd: end,
    };
    current.totalMinutes += activity.elapsedMinutes;
    current.movingMinutes += activity.movingMinutes;
    current.distanceMeters += activity.distanceMeters;
    current.activities.push(activity);
    current.firstStart = Math.min(current.firstStart, start);
    current.lastEnd = Math.max(current.lastEnd, end);
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.date - a.date);
}

export function stravaValuesByDay(activities: StravaActivity[]): Map<string, number> {
  return new Map(groupStravaByDay(activities).map((day) => [day.key, day.movingMinutes]));
}
