import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  BackupFile,
  Book,
  BookFormat,
  BookStatus,
  CategoryId,
  CloudSnapshot,
  Habit,
  HabitColor,
  HabitEntry,
  HabitIcon,
  Piece,
  PieceStatus,
  ReadingEvent,
  Session,
  Settings,
  TimerState,
} from "./types";
import { createId, createShortId } from "./id";
import { toDayKey } from "./time";
import { timerElapsed } from "./timerMath";
import { sampleBooks, sampleData } from "./sample";

const STORE_KEY = "praxis-store";
const STORE_VERSION = 3;

const DEFAULT_SETTINGS: Settings = {
  dailyGoalMinutes: 30,
  weekStartsOn: 0,
  bookView: "shelf",
};

/** Ceilings on the free-text a book can carry. Catalogue blurbs run to
 *  thousands of characters and the whole app shares a 2 MB sync payload, so a
 *  description is clamped to roughly what the detail view will ever show. */
const MAX_DESCRIPTION = 800;
const MAX_NOTES = 4000;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;
const MAX_TITLE = 300;
const MAX_AUTHOR = 200;
const MAX_LENGTH_UNITS = 200_000;
const MAX_YEAR = 2200;

const DEFAULT_TIMER: TimerState = {
  status: "idle",
  startedAt: null,
  accumulatedMs: 0,
  lastResumeAt: null,
  category: "repertoire",
  pieceIds: [],
  goalMinutes: null,
};

function sameLocalDay(a: number, b: number): boolean {
  const left = new Date(a);
  const right = new Date(b);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

// ── Import sanitizers ───────────────────────────────────────────────────────
// A backup file is untrusted input. Coerce every record to a known-good shape
// (dropping anything unrecoverable) so a malformed or hand-edited file can never
// brick the app with a missing array, NaN duration, or unknown enum value.
const CATEGORY_IDS: CategoryId[] = ["repertoire", "technique", "scales", "sight-reading", "theory", "free"];
const STATUS_IDS: PieceStatus[] = ["backlog", "learning", "polishing", "performance", "maintenance"];
const HABIT_COLORS: HabitColor[] = ["mint", "violet", "coral", "amber", "sky"];
const HABIT_ICONS: HabitIcon[] = ["check", "book", "code", "mind", "music", "walk", "water"];
const BOOK_STATUS_IDS: BookStatus[] = ["backlog", "reading", "paused", "finished", "abandoned"];
const BOOK_FORMAT_IDS: BookFormat[] = ["paper", "ebook", "audio"];

const finiteNum = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");
const ratingOf = (v: unknown): number | null =>
  typeof v === "number" && v >= 1 && v <= 5 ? Math.round(v) : null;

function sanitizeSession(x: unknown): Session | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const startedAt = finiteNum(o.startedAt, NaN);
  if (!Number.isFinite(startedAt)) return null;
  return {
    id: typeof o.id === "string" ? o.id : createId(),
    startedAt,
    durationMs: Math.max(0, finiteNum(o.durationMs, 0)),
    category: CATEGORY_IDS.includes(o.category as CategoryId) ? (o.category as CategoryId) : "free",
    pieceIds: Array.isArray(o.pieceIds) ? o.pieceIds.filter((p): p is string => typeof p === "string") : [],
    notes: asStr(o.notes),
    rating: ratingOf(o.rating),
    createdAt: finiteNum(o.createdAt, startedAt),
  };
}

function sanitizePiece(x: unknown): Piece | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const title = asStr(o.title).trim();
  if (!title) return null;
  const difficulty =
    typeof o.difficulty === "number" && o.difficulty >= 1 && o.difficulty <= 5
      ? Math.round(o.difficulty)
      : null;
  return {
    id: typeof o.id === "string" ? o.id : createId(),
    title,
    composer: asStr(o.composer),
    status: STATUS_IDS.includes(o.status as PieceStatus) ? (o.status as PieceStatus) : "learning",
    difficulty,
    notes: asStr(o.notes),
    addedAt: finiteNum(o.addedAt, Date.now()),
    archived: o.archived === true,
  };
}

function sanitizeSettings(x: unknown): Settings {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return {
    // 1440 to agree with the settings screen and `updateSettings`; a lower
    // ceiling here would silently cut a goal the UI happily accepted.
    dailyGoalMinutes: Math.min(1440, Math.max(1, Math.round(finiteNum(o.dailyGoalMinutes, DEFAULT_SETTINGS.dailyGoalMinutes)))),
    weekStartsOn: o.weekStartsOn === 1 ? 1 : 0,
    bookView: o.bookView === "list" ? "list" : "shelf",
  };
}

/** Positive whole number, or null. Used for lengths and years, both of which
 *  arrive from a volunteer-edited catalogue and are regularly absurd. */
const positiveOrNull = (v: unknown, max: number): number | null => {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n > 0 && n <= max ? n : null;
};

const clampText = (v: unknown, max: number): string => asStr(v).slice(0, max).trim();

/** Only two shapes of cover are ever stored: an Open Library cover id, or an
 *  https URL the user pasted. Anything else — a data: URI smuggling image
 *  bytes into the sync payload, a javascript: scheme — is dropped outright. */
function sanitizeCoverUrl(v: unknown): string {
  const raw = asStr(v).trim();
  if (!raw) return "";
  if (!/^https:\/\//i.test(raw) || raw.length > 500) return "";
  return raw;
}

function sanitizeBook(x: unknown): Book | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const title = asStr(o.title).trim();
  if (!title) return null;
  const length = positiveOrNull(o.length, MAX_LENGTH_UNITS);
  const position = Math.max(0, Math.round(finiteNum(o.position, 0)));
  return {
    id: typeof o.id === "string" ? o.id : createId(),
    title: title.slice(0, MAX_TITLE),
    subtitle: clampText(o.subtitle, MAX_TITLE),
    author: clampText(o.author, MAX_AUTHOR),
    status: BOOK_STATUS_IDS.includes(o.status as BookStatus) ? (o.status as BookStatus) : "backlog",
    format: BOOK_FORMAT_IDS.includes(o.format as BookFormat) ? (o.format as BookFormat) : "paper",
    length,
    // A position past the stated length is a typo, not a fact about the book.
    position: length != null ? Math.min(position, length) : position,
    coverId: positiveOrNull(o.coverId, Number.MAX_SAFE_INTEGER),
    coverUrl: sanitizeCoverUrl(o.coverUrl),
    isbn: asStr(o.isbn).replace(/[^0-9Xx]/g, "").slice(0, 13),
    publishedYear: positiveOrNull(o.publishedYear, MAX_YEAR),
    workId: clampText(o.workId, 60),
    description: clampText(o.description, MAX_DESCRIPTION),
    rating: ratingOf(o.rating),
    notes: asStr(o.notes).slice(0, MAX_NOTES),
    tags: Array.isArray(o.tags)
      ? [
          ...new Set(
            o.tags
              .filter((tag): tag is string => typeof tag === "string")
              .map((tag) => tag.trim().slice(0, MAX_TAG_LENGTH))
              .filter(Boolean),
          ),
        ].slice(0, MAX_TAGS)
      : [],
    addedAt: finiteNum(o.addedAt, Date.now()),
    startedAt: typeof o.startedAt === "number" && Number.isFinite(o.startedAt) ? o.startedAt : null,
    finishedAt:
      typeof o.finishedAt === "number" && Number.isFinite(o.finishedAt) ? o.finishedAt : null,
  };
}

function sanitizeReadingEvent(x: unknown, bookIds: Set<string>): ReadingEvent | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const bookId = asStr(o.bookId);
  const at = finiteNum(o.at, NaN);
  if (!bookIds.has(bookId) || !Number.isFinite(at)) return null;
  const from = Math.max(0, Math.round(finiteNum(o.from, 0)));
  const to = Math.max(0, Math.round(finiteNum(o.to, 0)));
  // A zero- or negative-width event is a correction someone made, not reading.
  if (to <= from) return null;
  return { id: typeof o.id === "string" ? o.id : createShortId(), bookId, at, from, to };
}

function sanitizeHabit(x: unknown): Habit | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const name = asStr(o.name).trim();
  if (!name) return null;
  return {
    id: typeof o.id === "string" ? o.id : createId(),
    name,
    description: asStr(o.description).trim(),
    color: HABIT_COLORS.includes(o.color as HabitColor) ? (o.color as HabitColor) : "mint",
    icon: HABIT_ICONS.includes(o.icon as HabitIcon) ? (o.icon as HabitIcon) : "check",
    createdAt: finiteNum(o.createdAt, Date.now()),
    archived: o.archived === true,
  };
}

function sanitizeHabitEntry(x: unknown, habitIds: Set<string>): HabitEntry | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const habitId = asStr(o.habitId);
  const completedAt = finiteNum(o.completedAt, NaN);
  if (!habitIds.has(habitId) || !Number.isFinite(completedAt)) return null;
  return {
    id: typeof o.id === "string" ? o.id : createId(),
    habitId,
    completedAt,
    createdAt: finiteNum(o.createdAt, completedAt),
  };
}

function sanitizeCloudSnapshot(value: unknown): Omit<CloudSnapshot, "version"> {
  const o = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const sessions = Array.isArray(o.sessions)
    ? o.sessions
        .map(sanitizeSession)
        .filter((session): session is Session => session !== null)
        .sort((a, b) => b.startedAt - a.startedAt)
    : [];
  const pieces = Array.isArray(o.pieces)
    ? o.pieces.map(sanitizePiece).filter((piece): piece is Piece => piece !== null)
    : [];
  const habits = Array.isArray(o.habits)
    ? o.habits.map(sanitizeHabit).filter((habit): habit is Habit => habit !== null)
    : [];
  const habitIds = new Set(habits.map((habit) => habit.id));
  const habitEntries = Array.isArray(o.habitEntries)
    ? o.habitEntries
        .map((entry) => sanitizeHabitEntry(entry, habitIds))
        .filter((entry): entry is HabitEntry => entry !== null)
    : [];
  // Guarded exactly like the arrays above: a v2 blob has no `books` key at
  // all, and an unguarded `.map()` would white-screen every device that
  // hasn't been upgraded yet.
  const books = Array.isArray(o.books)
    ? o.books.map(sanitizeBook).filter((book): book is Book => book !== null)
    : [];
  const bookIds = new Set(books.map((book) => book.id));
  const readingEvents = Array.isArray(o.readingEvents)
    ? o.readingEvents
        .map((event) => sanitizeReadingEvent(event, bookIds))
        .filter((event): event is ReadingEvent => event !== null)
    : [];
  return {
    sessions,
    pieces,
    habits,
    habitEntries,
    books,
    readingEvents,
    settings: sanitizeSettings(o.settings),
  };
}

// Never touch `localStorage` on the server. persist calls this factory lazily,
// but we guard anyway so SSR + the first client render agree.
const safeStorage: StateStorage = {
  getItem: (name) => (typeof window === "undefined" ? null : window.localStorage.getItem(name)),
  setItem: (name, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

export interface NewPieceInput {
  title: string;
  composer: string;
  status: PieceStatus;
  difficulty: number | null;
  notes: string;
}

export interface CommitSessionInput {
  category: CategoryId;
  pieceIds: string[];
  notes: string;
  rating: number | null;
}

export interface ManualSessionInput {
  startedAt: number;
  durationMs: number;
  category: CategoryId;
  pieceIds: string[];
  notes: string;
  rating: number | null;
}

export interface NewHabitInput {
  name: string;
  description: string;
  color: HabitColor;
  icon: HabitIcon;
}

export interface NewBookInput {
  title: string;
  subtitle?: string;
  author?: string;
  status?: BookStatus;
  format?: BookFormat;
  length?: number | null;
  coverId?: number | null;
  coverUrl?: string;
  isbn?: string;
  publishedYear?: number | null;
  workId?: string;
  description?: string;
}

/** Move a book to `to` and record what that cost, in one place.
 *
 *  Two rules carry the whole design. First, a day is the unit: nudging +10
 *  five times in an evening extends one record rather than writing five, which
 *  keeps the log readable, keeps the learned step honest, and bounds the only
 *  unbounded array in the app at books × days. Second, going backwards is a
 *  correction, not reading — it adjusts the day's record, or, on a later day,
 *  just moves the cursor. Nothing here ever finishes a book: reaching the last
 *  page is a fact, finishing is a decision. */
function applyProgress(
  state: { books: Book[]; readingEvents: ReadingEvent[] },
  bookId: string,
  to: number,
  now: number,
): Partial<StoreState> {
  const book = state.books.find((candidate) => candidate.id === bookId);
  if (!book) return {};

  const target = Math.max(0, Math.round(to));
  const next = book.length != null ? Math.min(target, book.length) : target;

  const started = next > 0 && (book.status === "backlog" || book.status === "paused");
  const books = state.books.map((candidate) =>
    candidate.id === bookId
      ? {
          ...candidate,
          position: next,
          status: started ? ("reading" as BookStatus) : candidate.status,
          startedAt: started ? (candidate.startedAt ?? now) : candidate.startedAt,
        }
      : candidate,
  );

  if (next === book.position) return { books };

  // The most recent sitting on this day — a day can hold several now that
  // entries can be added by hand, and stepping should continue the last one
  // rather than reopening the morning's.
  const today = toDayKey(now);
  const existing = state.readingEvents
    .filter((event) => event.bookId === bookId && toDayKey(event.at) === today)
    .reduce<ReadingEvent | null>((best, event) => (!best || event.at > best.at ? event : best), null);

  let readingEvents = state.readingEvents;
  if (existing) {
    readingEvents =
      next <= existing.from
        ? state.readingEvents.filter((event) => event.id !== existing.id)
        : state.readingEvents.map((event) =>
            event.id === existing.id ? { ...event, to: next } : event,
          );
  } else if (next > book.position) {
    readingEvents = [
      ...state.readingEvents,
      { id: createShortId(), bookId, at: now, from: book.position, to: next },
    ];
  }

  return { books, readingEvents };
}

/** Move a book's bookmark to wherever its most recent sitting now ends.
 *
 *  The log and the cursor are two views of one fact. Correcting a row without
 *  moving the cursor leaves the header showing the old page and — worse —
 *  lets the next ± press extend the day's record from the uncorrected
 *  position, silently undoing the correction the reader just made. */
function syncPositionToLog(
  books: Book[],
  readingEvents: ReadingEvent[],
  bookId: string,
): Book[] {
  const latest = readingEvents
    .filter((event) => event.bookId === bookId)
    .reduce<ReadingEvent | null>(
      (best, event) => (!best || event.at > best.at ? event : best),
      null,
    );
  const position = latest ? latest.to : 0;
  return books.map((book) =>
    book.id === bookId
      ? { ...book, position: book.length != null ? Math.min(position, book.length) : position }
      : book,
  );
}

export type CloudStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  /** The payload outgrew what the server will accept. Distinct from `error`
   *  because it never resolves on its own — it needs data removed. */
  | "too-large";

interface StoreState {
  hasHydrated: boolean;
  sessions: Session[];
  pieces: Piece[];
  habits: Habit[];
  habitEntries: HabitEntry[];
  books: Book[];
  readingEvents: ReadingEvent[];
  settings: Settings;
  timer: TimerState;
  cloudStatus: CloudStatus;

  // hydration
  setHasHydrated: (v: boolean) => void;
  normalizeTimerAfterReload: () => void;

  // timer setup
  setTimerCategory: (category: CategoryId) => void;
  toggleTimerPiece: (id: string) => void;
  setTimerGoal: (minutes: number | null) => void;

  // timer transport
  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  bankTimer: () => void;
  resetTimer: () => void;
  commitSession: (input: CommitSessionInput) => Session;

  // pieces
  addPiece: (input: NewPieceInput) => Piece;
  updatePiece: (id: string, patch: Partial<Omit<Piece, "id">>) => void;
  deletePiece: (id: string) => void;

  // habits
  addHabit: (input: NewHabitInput) => Habit;
  updateHabit: (id: string, patch: Partial<Omit<Habit, "id">>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitForDay: (habitId: string, day?: number) => void;

  // books
  addBook: (input: NewBookInput) => Book;
  updateBook: (id: string, patch: Partial<Omit<Book, "id">>) => void;
  deleteBook: (id: string) => void;
  setBookStatus: (id: string, status: BookStatus) => void;
  setBookProgress: (id: string, position: number) => void;
  logReading: (id: string, amount: number) => void;
  addReadingEvent: (input: { bookId: string; at: number; from: number; to: number }) => void;
  updateReadingEvent: (id: string, patch: { at?: number; from?: number; to?: number }) => void;
  deleteReadingEvent: (id: string) => void;

  // sessions
  addManualSession: (input: ManualSessionInput) => void;
  updateSession: (id: string, patch: Partial<Omit<Session, "id">>) => void;
  deleteSession: (id: string) => void;

  // settings + data
  updateSettings: (patch: Partial<Settings>) => void;
  exportData: () => BackupFile;
  importData: (data: unknown) => { ok: boolean; error?: string };
  loadSample: () => void;
  clearAll: () => void;
  replaceCloudSnapshot: (data: unknown) => void;
  setCloudStatus: (status: CloudStatus) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      sessions: [],
      pieces: [],
      habits: [],
      habitEntries: [],
      books: [],
      readingEvents: [],
      settings: DEFAULT_SETTINGS,
      timer: DEFAULT_TIMER,
      cloudStatus: "idle",

      setHasHydrated: (v) => set({ hasHydrated: v }),

      normalizeTimerAfterReload: () =>
        set((s) => {
          // We can't prove the tab stayed focused while closed, so a "running"
          // timer becomes "paused" on reload rather than counting dead time.
          if (s.timer.status !== "running") return {};
          return { timer: { ...s.timer, status: "paused", lastResumeAt: null } };
        }),

      setTimerCategory: (category) => set((s) => ({ timer: { ...s.timer, category } })),

      toggleTimerPiece: (id) =>
        set((s) => {
          const has = s.timer.pieceIds.includes(id);
          return {
            timer: {
              ...s.timer,
              pieceIds: has
                ? s.timer.pieceIds.filter((p) => p !== id)
                : [...s.timer.pieceIds, id],
            },
          };
        }),

      setTimerGoal: (minutes) => set((s) => ({ timer: { ...s.timer, goalMinutes: minutes } })),

      startTimer: () =>
        set((s) => {
          if (s.timer.status === "running") return {};
          const now = Date.now();
          if (s.timer.status === "paused") {
            return { timer: { ...s.timer, status: "running", lastResumeAt: now } };
          }
          return {
            timer: {
              ...s.timer,
              status: "running",
              startedAt: now,
              accumulatedMs: 0,
              lastResumeAt: now,
            },
          };
        }),

      pauseTimer: () =>
        set((s) => {
          if (s.timer.status !== "running") return {};
          const now = Date.now();
          const banked =
            s.timer.accumulatedMs + (s.timer.lastResumeAt ? now - s.timer.lastResumeAt : 0);
          return {
            timer: { ...s.timer, status: "paused", accumulatedMs: banked, lastResumeAt: null },
          };
        }),

      toggleTimer: () => {
        const status = get().timer.status;
        if (status === "running") get().pauseTimer();
        else get().startTimer();
      },

      // Fold the live run-segment into `accumulatedMs` without stopping. Called
      // on tab-hide / pagehide so we never lose more than a moment of practice.
      bankTimer: () =>
        set((s) => {
          if (s.timer.status !== "running" || s.timer.lastResumeAt == null) return {};
          const now = Date.now();
          return {
            timer: {
              ...s.timer,
              accumulatedMs: s.timer.accumulatedMs + (now - s.timer.lastResumeAt),
              lastResumeAt: now,
            },
          };
        }),

      resetTimer: () =>
        set((s) => ({
          timer: {
            ...s.timer,
            status: "idle",
            startedAt: null,
            accumulatedMs: 0,
            lastResumeAt: null,
          },
        })),

      commitSession: (input) => {
        const s = get();
        const now = Date.now();
        const elapsed = timerElapsed(s.timer, now);
        const session: Session = {
          id: createId(),
          startedAt: s.timer.startedAt ?? now - elapsed,
          durationMs: Math.max(0, Math.round(elapsed)),
          category: input.category,
          pieceIds: input.pieceIds,
          notes: input.notes.trim(),
          rating: input.rating,
          createdAt: now,
        };
        set((st) => ({
          sessions: [session, ...st.sessions],
          // Keep the chosen category for a likely follow-up; clear the rest.
          timer: {
            ...DEFAULT_TIMER,
            category: input.category,
          },
        }));
        return session;
      },

      addPiece: (input) => {
        const piece: Piece = {
          id: createId(),
          title: input.title.trim(),
          composer: input.composer.trim(),
          status: input.status,
          difficulty: input.difficulty,
          notes: input.notes.trim(),
          addedAt: Date.now(),
          archived: false,
        };
        set((s) => ({ pieces: [...s.pieces, piece] }));
        return piece;
      },

      updatePiece: (id, patch) =>
        set((s) => ({
          pieces: s.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      deletePiece: (id) =>
        set((s) => ({
          pieces: s.pieces.filter((p) => p.id !== id),
          // Strip the dangling reference everywhere it could appear.
          sessions: s.sessions.map((ses) =>
            ses.pieceIds.includes(id)
              ? { ...ses, pieceIds: ses.pieceIds.filter((pid) => pid !== id) }
              : ses,
          ),
          timer: s.timer.pieceIds.includes(id)
            ? { ...s.timer, pieceIds: s.timer.pieceIds.filter((pid) => pid !== id) }
            : s.timer,
        })),

      addHabit: (input) => {
        const habit: Habit = {
          id: createId(),
          name: input.name.trim(),
          description: input.description.trim(),
          color: input.color,
          icon: input.icon,
          createdAt: Date.now(),
          archived: false,
        };
        set((s) => ({ habits: [...s.habits, habit] }));
        return habit;
      },

      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
        })),

      deleteHabit: (id) =>
        set((s) => ({
          habits: s.habits.filter((habit) => habit.id !== id),
          habitEntries: s.habitEntries.filter((entry) => entry.habitId !== id),
        })),

      toggleHabitForDay: (habitId, day = Date.now()) =>
        set((s) => {
          const existing = s.habitEntries.find(
            (entry) => entry.habitId === habitId && sameLocalDay(entry.completedAt, day),
          );
          if (existing) {
            return {
              habitEntries: s.habitEntries.filter((entry) => entry.id !== existing.id),
            };
          }
          const entry: HabitEntry = {
            id: createId(),
            habitId,
            completedAt: day,
            createdAt: Date.now(),
          };
          return { habitEntries: [...s.habitEntries, entry] };
        }),

      addBook: (input) => {
        const now = Date.now();
        const status = input.status ?? "backlog";
        const length = input.length ?? null;
        const book: Book = {
          id: createId(),
          title: input.title.trim().slice(0, 300),
          subtitle: (input.subtitle ?? "").trim().slice(0, 300),
          author: (input.author ?? "").trim().slice(0, 200),
          status,
          format: input.format ?? "paper",
          length,
          // Adding something you have already read is a real act — the shelf
          // is a record, not just a queue — so a finished book arrives at its
          // own last page rather than at zero.
          position: status === "finished" && length != null ? length : 0,
          coverId: input.coverId ?? null,
          coverUrl: (input.coverUrl ?? "").trim(),
          isbn: (input.isbn ?? "").replace(/[^0-9Xx]/g, "").slice(0, 13),
          publishedYear: input.publishedYear ?? null,
          workId: (input.workId ?? "").trim(),
          description: (input.description ?? "").trim().slice(0, MAX_DESCRIPTION),
          rating: null,
          notes: "",
          tags: [],
          addedAt: now,
          startedAt: status === "reading" || status === "finished" ? now : null,
          finishedAt: status === "finished" ? now : null,
        };
        set((s) => ({ books: [...s.books, book] }));
        return book;
      },

      updateBook: (id, patch) =>
        set((s) => ({
          books: s.books.map((book) => {
            if (book.id !== id) return book;
            const next = { ...book, ...patch };
            // A page count corrected downwards has to bring the bookmark with
            // it. Left alone, the book reads 100% with both + buttons dead,
            // and the first − press clamps so far that it looks like a
            // rejected keystroke and eats the day's log entry.
            if (next.length != null && next.position > next.length) next.position = next.length;
            return next;
          }),
        })),

      deleteBook: (id) =>
        set((s) => ({
          books: s.books.filter((book) => book.id !== id),
          // The log is keyed on books; an orphaned event would be invisible
          // forever while still counting toward every total.
          readingEvents: s.readingEvents.filter((event) => event.bookId !== id),
        })),

      setBookStatus: (id, status) =>
        set((s) => {
          const book = s.books.find((candidate) => candidate.id === id);
          if (!book || book.status === status) return {};
          const now = Date.now();

          // Finishing banks whatever was left, so the day you finished shows
          // up on the grid rather than vanishing into a status change — but
          // only for a book that was genuinely open. Shelving a 500-page
          // book you read years ago straight into `finished` must not write
          // a 500-page day onto today's grid, spike every average, and start
          // a reading streak you didn't earn.
          const wasOpen =
            (book.status === "reading" || book.status === "paused") && book.position > 0;
          const bank =
            status === "finished" && wasOpen && book.length != null && book.position < book.length;
          const base = bank ? applyProgress(s, id, book.length as number, now) : {};
          const books = (base.books ?? s.books).map((candidate) => {
            if (candidate.id !== id) return candidate;
            return {
              ...candidate,
              status,
              // Unbanked, the cursor still belongs at the end of a book you
              // just called finished.
              position:
                status === "finished" && candidate.length != null
                  ? candidate.length
                  : candidate.position,
              startedAt:
                status === "reading" || status === "finished"
                  ? (candidate.startedAt ?? now)
                  : candidate.startedAt,
              // Cleared on every exit from `finished`, or the year count and
              // every "days to finish" figure quietly keep the old date.
              finishedAt: status === "finished" ? (candidate.finishedAt ?? now) : null,
            };
          });
          return { ...base, books };
        }),

      setBookProgress: (id, position) =>
        set((s) => applyProgress(s, id, position, Date.now())),

      logReading: (id, amount) =>
        set((s) => {
          const book = s.books.find((candidate) => candidate.id === id);
          if (!book) return {};
          return applyProgress(s, id, book.position + amount, Date.now());
        }),

      /** A sitting recorded by hand: a second session the same evening, or a
       *  week of reading logged after the fact. Unlike the stepper this never
       *  coalesces — you asked for this row, so you get this row. */
      addReadingEvent: (input) =>
        set((s) => {
          const book = s.books.find((candidate) => candidate.id === input.bookId);
          if (!book) return {};
          const from = Math.max(0, Math.round(input.from));
          const ceiling = book.length ?? Number.MAX_SAFE_INTEGER;
          const to = Math.min(ceiling, Math.max(0, Math.round(input.to)));
          if (to <= from) return {};

          const event: ReadingEvent = {
            id: createShortId(),
            bookId: input.bookId,
            at: input.at,
            from,
            to,
          };
          const readingEvents = [...s.readingEvents, event];

          // Only the newest sitting moves the bookmark; backfilling an older
          // week must not drag you back to where you were in March.
          const isLatest = !s.readingEvents.some(
            (e) => e.bookId === input.bookId && e.at > input.at,
          );
          const started = book.status === "backlog" || book.status === "paused";
          const books = s.books.map((candidate) =>
            candidate.id !== input.bookId
              ? candidate
              : {
                  ...candidate,
                  position: isLatest ? to : candidate.position,
                  status: started ? ("reading" as BookStatus) : candidate.status,
                  startedAt: candidate.startedAt ?? input.at,
                },
          );
          return { books, readingEvents };
        }),

      updateReadingEvent: (id, patch) =>
        set((s) => {
          const event = s.readingEvents.find((candidate) => candidate.id === id);
          if (!event) return {};
          const next = { ...event, ...patch };
          // Editing the newest sitting is editing where you are; editing an
          // older one is editing history and leaves the bookmark alone.
          const wasLatest = !s.readingEvents.some(
            (e) => e.bookId === event.bookId && e.id !== id && e.at > event.at,
          );
          const readingEvents =
            next.to <= next.from
              ? s.readingEvents.filter((e) => e.id !== id)
              : s.readingEvents.map((e) => (e.id === id ? next : e));
          return wasLatest
            ? { readingEvents, books: syncPositionToLog(s.books, readingEvents, event.bookId) }
            : { readingEvents };
        }),

      deleteReadingEvent: (id) =>
        set((s) => {
          const event = s.readingEvents.find((candidate) => candidate.id === id);
          if (!event) return {};
          const wasLatest = !s.readingEvents.some(
            (e) => e.bookId === event.bookId && e.id !== id && e.at > event.at,
          );
          const readingEvents = s.readingEvents.filter((e) => e.id !== id);
          return wasLatest
            ? { readingEvents, books: syncPositionToLog(s.books, readingEvents, event.bookId) }
            : { readingEvents };
        }),

      addManualSession: (input) =>
        set((s) => {
          const session: Session = {
            id: createId(),
            startedAt: input.startedAt,
            durationMs: Math.max(0, Math.round(input.durationMs)),
            category: input.category,
            pieceIds: input.pieceIds,
            notes: input.notes.trim(),
            rating: input.rating,
            createdAt: Date.now(),
          };
          return {
            sessions: [session, ...s.sessions].sort((a, b) => b.startedAt - a.startedAt),
          };
        }),

      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions
            .map((ses) => (ses.id === id ? { ...ses, ...patch } : ses))
            .sort((a, b) => b.startedAt - a.startedAt),
        })),

      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((ses) => ses.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      exportData: () => {
        const s = get();
        return {
          app: "praxis",
          version: STORE_VERSION,
          exportedAt: Date.now(),
          sessions: s.sessions,
          pieces: s.pieces,
          settings: s.settings,
          habits: s.habits,
          habitEntries: s.habitEntries,
          books: s.books,
          readingEvents: s.readingEvents,
        };
      },

      importData: (data) => {
        if (!data || typeof data !== "object") {
          return { ok: false, error: "File is not valid JSON." };
        }
        const file = data as Partial<BackupFile>;
        if (file.app !== "praxis" || !Array.isArray(file.sessions) || !Array.isArray(file.pieces)) {
          return { ok: false, error: "This does not look like a praxis backup." };
        }
        const sessions = file.sessions
          .map(sanitizeSession)
          .filter((s): s is Session => s !== null)
          .sort((a, b) => b.startedAt - a.startedAt);
        const pieces = file.pieces.map(sanitizePiece).filter((p): p is Piece => p !== null);
        const habits = Array.isArray(file.habits)
          ? file.habits.map(sanitizeHabit).filter((habit): habit is Habit => habit !== null)
          : [];
        const habitIds = new Set(habits.map((habit) => habit.id));
        const habitEntries = Array.isArray(file.habitEntries)
          ? file.habitEntries
              .map((entry) => sanitizeHabitEntry(entry, habitIds))
              .filter((entry): entry is HabitEntry => entry !== null)
          : [];
        // Set explicitly, even when absent. Leaving these out of the object
        // would graft the current library onto an imported backup and produce
        // a state that never existed on either side.
        const books = Array.isArray(file.books)
          ? file.books.map(sanitizeBook).filter((book): book is Book => book !== null)
          : [];
        const bookIds = new Set(books.map((book) => book.id));
        const readingEvents = Array.isArray(file.readingEvents)
          ? file.readingEvents
              .map((event) => sanitizeReadingEvent(event, bookIds))
              .filter((event): event is ReadingEvent => event !== null)
          : [];
        set({
          sessions,
          pieces,
          habits,
          habitEntries,
          books,
          readingEvents,
          settings: sanitizeSettings(file.settings),
          timer: DEFAULT_TIMER,
        });
        return { ok: true };
      },

      loadSample: () => {
        const { sessions, pieces } = sampleData();
        const now = Date.now();
        const habits: Habit[] = [
          {
            id: "sample-read",
            name: "Read",
            description: "A few pages, every day",
            color: "violet",
            icon: "book",
            createdAt: now - 120 * 86_400_000,
            archived: false,
          },
          {
            id: "sample-walk",
            name: "Take a walk",
            description: "Step outside and clear the mind",
            color: "mint",
            icon: "walk",
            createdAt: now - 120 * 86_400_000,
            archived: false,
          },
        ];
        const habitEntries: HabitEntry[] = Array.from({ length: 90 }, (_, index) => index)
          .flatMap((offset) => {
            const completedAt = now - offset * 86_400_000;
            const entries: HabitEntry[] = [];
            if (offset % 3 !== 1) {
              entries.push({
                id: `sample-read-${offset}`,
                habitId: "sample-read",
                completedAt,
                createdAt: completedAt,
              });
            }
            if (offset % 4 < 2) {
              entries.push({
                id: `sample-walk-${offset}`,
                habitId: "sample-walk",
                completedAt,
                createdAt: completedAt,
              });
            }
            return entries;
          });
        const { books, readingEvents } = sampleBooks();
        set({ sessions, pieces, habits, habitEntries, books, readingEvents, timer: DEFAULT_TIMER });
      },

      clearAll: () =>
        set({
          sessions: [],
          pieces: [],
          habits: [],
          habitEntries: [],
          books: [],
          readingEvents: [],
          timer: DEFAULT_TIMER,
        }),

      replaceCloudSnapshot: (data) => {
        const safe = sanitizeCloudSnapshot(data);
        set({ ...safe, timer: get().timer });
      },

      setCloudStatus: (cloudStatus) => set({ cloudStatus }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        sessions: s.sessions,
        pieces: s.pieces,
        habits: s.habits,
        habitEntries: s.habitEntries,
        books: s.books,
        readingEvents: s.readingEvents,
        settings: s.settings,
        timer: s.timer,
      }),
      // persist rehydrates in replace mode, so a key this returns as
      // `undefined` overwrites the initializer's `[]` rather than falling
      // back to it — every array added here has to be defaulted by hand.
      migrate: (persisted) => {
        const state = persisted as Partial<StoreState>;
        return {
          ...state,
          habits: Array.isArray(state.habits) ? state.habits : [],
          habitEntries: Array.isArray(state.habitEntries) ? state.habitEntries : [],
          books: Array.isArray(state.books) ? state.books : [],
          readingEvents: Array.isArray(state.readingEvents) ? state.readingEvents : [],
          settings: sanitizeSettings(state.settings),
          cloudStatus: "idle",
        } as StoreState;
      },
      onRehydrateStorage: () => (state) => {
        state?.normalizeTimerAfterReload();
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function getCloudSnapshot(state: StoreState = useStore.getState()): CloudSnapshot {
  return {
    version: STORE_VERSION,
    sessions: state.sessions,
    pieces: state.pieces,
    settings: state.settings,
    habits: state.habits,
    habitEntries: state.habitEntries,
    books: state.books,
    readingEvents: state.readingEvents,
  };
}
