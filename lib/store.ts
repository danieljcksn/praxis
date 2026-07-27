import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  BackupFile,
  CategoryId,
  CloudSnapshot,
  Habit,
  HabitColor,
  HabitEntry,
  HabitIcon,
  Piece,
  PieceStatus,
  Session,
  Settings,
  TimerState,
} from "./types";
import { createId } from "./id";
import { timerElapsed } from "./timerMath";
import { sampleData } from "./sample";

const STORE_KEY = "praxis-store";
const STORE_VERSION = 2;

const DEFAULT_SETTINGS: Settings = {
  dailyGoalMinutes: 30,
  weekStartsOn: 0,
};

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
    dailyGoalMinutes: Math.min(600, Math.max(1, Math.round(finiteNum(o.dailyGoalMinutes, DEFAULT_SETTINGS.dailyGoalMinutes)))),
    weekStartsOn: o.weekStartsOn === 1 ? 1 : 0,
  };
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
  return {
    sessions,
    pieces,
    habits,
    habitEntries,
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

export type CloudStatus = "idle" | "syncing" | "synced" | "offline" | "error";

interface StoreState {
  hasHydrated: boolean;
  sessions: Session[];
  pieces: Piece[];
  habits: Habit[];
  habitEntries: HabitEntry[];
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
        set({
          sessions,
          pieces,
          habits,
          habitEntries,
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
        set({ sessions, pieces, habits, habitEntries, timer: DEFAULT_TIMER });
      },

      clearAll: () =>
        set({ sessions: [], pieces: [], habits: [], habitEntries: [], timer: DEFAULT_TIMER }),

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
        settings: s.settings,
        timer: s.timer,
      }),
      migrate: (persisted) => {
        const state = persisted as Partial<StoreState>;
        return {
          ...state,
          habits: Array.isArray(state.habits) ? state.habits : [],
          habitEntries: Array.isArray(state.habitEntries) ? state.habitEntries : [],
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
  };
}
