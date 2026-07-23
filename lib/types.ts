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
}

/** Shape of an exported backup file. Versioned so imports can be migrated. */
export interface BackupFile {
  app: "praxis";
  version: number;
  exportedAt: number;
  sessions: Session[];
  pieces: Piece[];
  settings: Settings;
}
