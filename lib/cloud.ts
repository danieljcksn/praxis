import type { CloudSnapshot } from "@/lib/types";

/** Raised alongside books and reading events in the same change — counting
 *  new records against the old ceiling would brick sync for a heavy library
 *  with an opaque "Invalid data shape". The real limiter is bytes, not rows;
 *  this only stops a runaway. */
const MAX_RECORDS = 60_000;

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
  // Deliberately NOT part of the hard shape gate above: a snapshot written by
  // a device that predates books has no such key, and demanding one would make
  // every legacy blob un-saveable.
  const totalRecords =
    data.sessions.length +
    data.pieces.length +
    data.habits.length +
    data.habitEntries.length +
    (Array.isArray(data.books) ? data.books.length : 0) +
    (Array.isArray(data.readingEvents) ? data.readingEvents.length : 0);
  return totalRecords <= MAX_RECORDS;
}
