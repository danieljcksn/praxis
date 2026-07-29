import { addDays, startOfDay, toDayKey } from "@/lib/time";

export interface GitHubContribution {
  date: string;
  count: number;
  level: number;
}

export interface GitHubActivity {
  username: string;
  total: number;
  contributions: GitHubContribution[];
  syncedAt: string;
  profileUrl: string;
}

export interface GitHubActivityStats {
  activeDays: number;
  thisWeek: number;
  currentStreak: number;
  busiestDay: GitHubContribution | null;
}

function dateKeyToTimestamp(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

export function githubValuesByDay(activity?: GitHubActivity): Map<string, number> {
  return new Map(activity?.contributions.map((day) => [day.date, day.count]) ?? []);
}

export function githubActivityStats(
  activity: GitHubActivity,
  now = Date.now(),
): GitHubActivityStats {
  const values = githubValuesByDay(activity);
  const activeDays = activity.contributions.filter((day) => day.count > 0).length;
  const today = startOfDay(now);
  const sunday = addDays(today, -new Date(today).getDay());
  let thisWeek = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(sunday, offset);
    if (date <= today) thisWeek += values.get(toDayKey(date)) ?? 0;
  }

  let cursor = today;
  if ((values.get(toDayKey(cursor)) ?? 0) === 0) cursor = addDays(cursor, -1);
  let currentStreak = 0;
  while ((values.get(toDayKey(cursor)) ?? 0) > 0) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const busiestDay =
    activity.contributions.reduce<GitHubContribution | null>(
      (best, day) => (day.count > (best?.count ?? 0) ? day : best),
      null,
    ) ?? null;

  return { activeDays, thisWeek, currentStreak, busiestDay };
}

export function formatGitHubDate(key: string): string {
  return new Date(dateKeyToTimestamp(key)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
