import type { CloudSnapshot } from "@/lib/types";

const MAX_RECORDS = 25_000;

export function isCloudSnapshot(value: unknown): value is CloudSnapshot {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  if (
    !Array.isArray(data.sessions) ||
    !Array.isArray(data.pieces) ||
    !Array.isArray(data.habits) ||
    !Array.isArray(data.habitEntries) ||
    !data.settings ||
    typeof data.settings !== "object"
  ) {
    return false;
  }
  const totalRecords =
    data.sessions.length +
    data.pieces.length +
    data.habits.length +
    data.habitEntries.length;
  return totalRecords <= MAX_RECORDS;
}
