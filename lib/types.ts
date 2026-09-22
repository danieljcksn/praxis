// ── Domain model ──────────────────────────────────────────────────────────────
// A practice journal for classical guitar. Everything below is what
// we persist; anything derived (streaks, totals, per-piece time) is computed on
// the fly in lib/stats.ts so there is a single source of truth.

/** Kinds of practice a session can be. Kept small and meaningful — a classical
 *  guitarist's day usually falls into one of these. `free` covers "just play". */
export type CategoryId =
  | "repertoire"
  | "technique"
  | "scales"
  | "sight-reading"
  | "theory"
  | "free";

/** Where a piece sits in its life-cycle. Ordered from newest to most settled. */
export type PieceStatus =
  | "backlog" // want to learn, not started
  | "learning" // actively decoding notes/fingering
  | "polishing" // notes known, refining musicality/tempo
  | "performance" // ready to play for others
  | "maintenance"; // learned, kept alive

export interface Piece {
  id: string;
  title: string;
  composer: string;
  status: PieceStatus;
  /** 1–5, optional self-assessed difficulty. */
  difficulty: number | null;
  notes: string;
  addedAt: number;
  archived: boolean;
}

export interface Session {
  id: string;
  /** Epoch ms of when practice began. */
  startedAt: number;
  /** Actual practiced time in ms — excludes paused stretches. */
  durationMs: number;
  category: CategoryId;
  /** Repertoire pieces touched this session (may be empty for e.g. free play). */
  pieceIds: string[];
  notes: string;
  /** 1–5, how productive the session felt. null = not rated. */
  rating: number | null;
  createdAt: number;
}

export type TimerStatus = "idle" | "running" | "paused";

/** The single live timer. Timestamp-based so it stays accurate regardless of
 *  render cadence, throttled tabs, or the event loop stalling. */
export interface TimerState {
  status: TimerStatus;
  /** When the current session first started (null when idle). */
  startedAt: number | null;
  /** Practiced time banked from completed run-segments. */
  accumulatedMs: number;
  /** Epoch ms the current run-segment began (null unless running). */
  lastResumeAt: number | null;
  category: CategoryId;
  pieceIds: string[];
  /** Target for this session in minutes, or null for open-ended. */
  goalMinutes: number | null;
}

export interface Settings {
  /** Daily practice target in minutes, drives the goal ring + streaks view. */
  dailyGoalMinutes: number;
  /** 0 = Sunday, 1 = Monday. Affects week grouping + heatmap columns. */
  weekStartsOn: 0 | 1;
  /** How the library opens. Kept here rather than in component state so the
   *  choice follows you to another device like every other preference. */
  bookView: "shelf" | "list";
}

export type HabitColor = "mint" | "violet" | "coral" | "amber" | "sky";

export type HabitIcon =
  | "check"
  | "book"
  | "code"
  | "mind"
  | "music"
  | "walk"
  | "water";

export interface Habit {
  id: string;
  name: string;
  description: string;
  color: HabitColor;
  icon: HabitIcon;
  createdAt: number;
  archived: boolean;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  /** Epoch ms for the day this habit was completed. */
  completedAt: number;
  createdAt: number;
}

/** Where a book sits. Ordered the way a book actually travels: onto the pile,
 *  into your hands, set down, done — with `abandoned` as the honest exit that
 *  keeps a book from silently rotting in `reading` forever and poisoning every
 *  pace figure derived from it. */
export type BookStatus =
  | "backlog" // want to read, not started
  | "reading" // in progress
  | "paused" // set down, meant to return
  | "finished" // read to the end
  | "abandoned"; // stopped for good

/** How you're reading it. Purely descriptive except for one thing: audiobooks
 *  measure their length in minutes rather than pages, which is why `length`
 *  and `position` are named for neither. */
export type BookFormat = "paper" | "ebook" | "audio";

export interface Book {
  id: string;
  title: string;
  /** Everything after the first colon in a catalogue title. Split out so a
   *  90-character title doesn't set four lines at display size. */
  subtitle: string;
  /** One line, as it would be printed: "Ursula K. Le Guin", "Kernighan &
   *  Ritchie". An array would only ever be joined back together to render. */
  author: string;
  status: BookStatus;
  format: BookFormat;
  /** Total length — pages for print and ebooks, minutes for audiobooks.
   *  null is first-class and common: the progress control then tracks a bare
   *  position with no denominator, and the book sits out of every percentage,
   *  pace and projection rather than inventing one. */
  length: number | null;
  /** How far in, in the same unit as `length`. */
  position: number;
  /** Open Library cover id. Stored instead of a URL so the CDN path stays a
   *  one-line change rather than a data migration — and because cover-id
   *  lookups are the only ones that are unmetered and cached for a century. */
  coverId: number | null;
  /** A cover supplied by hand, for the books no catalogue has. Wins over
   *  `coverId` when both are set. */
  coverUrl: string;
  isbn: string;
  publishedYear: number | null;
  /** Open Library work key ("/works/OL893414W"). Lets the same book be
   *  recognised on re-import and its metadata refreshed deliberately. */
  workId: string;
  /** Jacket copy, cleaned and clamped on ingest. Catalogue prose, not yours. */
  description: string;
  /** 1–5, your own. The catalogue's average is deliberately never stored. */
  rating: number | null;
  /** Yours: what stayed with you, why you stopped, who pressed it on you. */
  notes: string;
  tags: string[];
  addedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

/** One sitting: you were at `from`, now you're at `to`.
 *
 *  This is the only unbounded array in the domain and it is measured against a
 *  2 MB whole-app sync payload, so it stays four small fields with a short id.
 *  It earns that cost by being the single source of the per-book grid, the
 *  reading log, the overview's pages-per-day stream, and the learned step size
 *  on the progress control — one record, four surfaces, the same discipline
 *  lib/stats.ts already keeps for sessions. */
export interface ReadingEvent {
  id: string;
  bookId: string;
  /** Epoch ms of the day the reading happened. */
  at: number;
  from: number;
  to: number;
}

/** The durable payload mirrored to Supabase. The live timer remains local so
 *  a network hiccup can never interrupt an in-progress practice session. */
export interface CloudSnapshot {
  /** Bumped to 3 when books arrived. A v2 blob is still readable — every new
   *  array is defaulted on the way in — so an older device can be upgraded in
   *  its own time. */
  version: 2 | 3;
  sessions: Session[];
  pieces: Piece[];
  settings: Settings;
  habits: Habit[];
  habitEntries: HabitEntry[];
  books: Book[];
  readingEvents: ReadingEvent[];
}

export interface HevyWorkout {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface StravaActivity {
  id: string;
  name: string;
  type: string;
  sportType: string;
  startTime: string;
  elapsedMinutes: number;
  movingMinutes: number;
  distanceMeters: number;
  elevationMeters: number;
}

/** Shape of an exported backup file. Versioned so imports can be migrated. */
export interface BackupFile {
  app: "praxis";
  version: number;
  exportedAt: number;
  sessions: Session[];
  pieces: Piece[];
  settings: Settings;
  habits?: Habit[];
  habitEntries?: HabitEntry[];
  books?: Book[];
  readingEvents?: ReadingEvent[];
}
