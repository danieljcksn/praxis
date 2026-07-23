import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  BackupFile,
  CategoryId,
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
const STORE_VERSION = 1;

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

// ── Import sanitizers ───────────────────────────────────────────────────────
// A backup file is untrusted input. Coerce every record to a known-good shape
// (dropping anything unrecoverable) so a malformed or hand-edited file can never
// brick the app with a missing array, NaN duration, or unknown enum value.
const CATEGORY_IDS: CategoryId[] = ["repertoire", "technique", "scales", "sight-reading", "theory", "free"];
const STATUS_IDS: PieceStatus[] = ["backlog", "learning", "polishing", "performance", "maintenance"];

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

interface StoreState {
  hasHydrated: boolean;
  sessions: Session[];
  pieces: Piece[];
  settings: Settings;
  timer: TimerState;

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
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      sessions: [],
      pieces: [],
      settings: DEFAULT_SETTINGS,
      timer: DEFAULT_TIMER,

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
        set({
          sessions,
          pieces,
          settings: sanitizeSettings(file.settings),
          timer: DEFAULT_TIMER,
        });
        return { ok: true };
      },

      loadSample: () => {
        const { sessions, pieces } = sampleData();
        set({ sessions, pieces, timer: DEFAULT_TIMER });
      },

      clearAll: () => set({ sessions: [], pieces: [], timer: DEFAULT_TIMER }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        sessions: s.sessions,
        pieces: s.pieces,
        settings: s.settings,
        timer: s.timer,
      }),
      onRehydrateStorage: () => (state) => {
        state?.normalizeTimerAfterReload();
        state?.setHasHydrated(true);
      },
    },
  ),
);
