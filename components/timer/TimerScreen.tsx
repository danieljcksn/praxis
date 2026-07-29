"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Flag, Flame, Pause, Play, RotateCcw, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { useElapsed } from "@/lib/hooks/useElapsed";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { timerElapsed } from "@/lib/timerMath";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { computeRollups, computeStreaks } from "@/lib/stats";
import { formatClock, formatDuration } from "@/lib/time";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Digits } from "@/components/ui/Digits";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { FocusSelector } from "./FocusSelector";
import { FinishDialog, type FinishPayload } from "./FinishDialog";

const GOAL_PRESETS: Array<number | null> = [null, 15, 30, 45, 60, 90];

/** Fills the viewport below the header and section strip, but never collapses
 *  below a height the clock can breathe in. */
const STAGE = "min-h-[max(26rem,calc(100dvh-16rem))]";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border-strong bg-inset px-1.5 py-0.5 text-micro font-medium text-sub-strong">
      {children}
    </kbd>
  );
}

export function TimerScreen() {
  const hydrated = useHydrated();
  const timer = useStore((s) => s.timer);
  const sessions = useStore((s) => s.sessions);
  const pieces = useStore((s) => s.pieces);
  const settings = useStore((s) => s.settings);
  const elapsed = useElapsed();

  const [finishOpen, setFinishOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimeout = useRef<number | null>(null);
  const wasRunningRef = useRef(false);

  const { status, category, goalMinutes } = timer;
  const canFinish = elapsed >= 1000;

  const todayLogged = useMemo(
    () => computeRollups(sessions, settings.weekStartsOn).today,
    [sessions, settings.weekStartsOn],
  );
  const streak = useMemo(() => computeStreaks(sessions).current, [sessions]);

  const openFinish = useCallback(() => {
    const t = useStore.getState().timer;
    if (timerElapsed(t, Date.now()) < 1000) return;
    wasRunningRef.current = t.status === "running";
    useStore.getState().pauseTimer();
    setFinishOpen(true);
  }, []);

  // Dismissing the dialog (Keep going / X / backdrop / Esc) resumes if we were
  // running — never leave the user silently paused.
  const handleFinishClose = useCallback(() => {
    setFinishOpen(false);
    if (wasRunningRef.current) useStore.getState().startTimer();
  }, []);

  const handleSave = useCallback((payload: FinishPayload) => {
    // Guard against a double-click committing a second, zero-length session:
    // the first commit resets the timer, so elapsed is already back to 0.
    if (timerElapsed(useStore.getState().timer, Date.now()) < 1000) return;
    useStore.getState().commitSession(payload);
    setFinishOpen(false);
    toast.success("Session saved");
  }, []);

  const handleDiscard = useCallback(() => {
    useStore.getState().resetTimer();
    setFinishOpen(false);
    toast.show("Session discarded");
  }, []);

  // Past two minutes a reset is destructive enough to deserve a second click.
  const handleReset = useCallback(() => {
    if (!confirmReset && elapsed >= 120_000) {
      setConfirmReset(true);
      if (resetTimeout.current) window.clearTimeout(resetTimeout.current);
      resetTimeout.current = window.setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    useStore.getState().resetTimer();
    setConfirmReset(false);
  }, [confirmReset, elapsed]);

  const cycleGoal = useCallback(() => {
    const current = useStore.getState().timer.goalMinutes;
    const i = GOAL_PRESETS.findIndex((g) => g === current);
    useStore.getState().setTimerGoal(GOAL_PRESETS[(i + 1) % GOAL_PRESETS.length]);
  }, []);

  // Keyboard: space toggles, enter finishes, 1–6 pick the focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finishOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable === true;
      const onControl = typing || tag === "BUTTON" || tag === "A" || tag === "SELECT";
      if (typing || e.repeat) return; // ignore typing + OS key auto-repeat

      if (e.code === "Space") {
        // Only when the body is focused — otherwise let the focused control's
        // native Space activation happen (don't preventDefault it into a no-op).
        if (!onControl) {
          e.preventDefault();
          useStore.getState().toggleTimer();
        }
      } else if (e.key === "Enter") {
        if (!onControl) {
          e.preventDefault();
          openFinish();
        }
      } else if (/^[1-6]$/.test(e.key)) {
        const cat = CATEGORIES[Number(e.key) - 1];
        if (cat) useStore.getState().setTimerCategory(cat.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishOpen, openFinish]);

  useEffect(
    () => () => {
      if (resetTimeout.current) window.clearTimeout(resetTimeout.current);
    },
    [],
  );

  if (!hydrated) return <TimerSkeleton />;

  const running = status === "running";
  const idle = status === "idle";
  const cat = getCategory(category);
  const selectedTitles = timer.pieceIds
    .map((id) => pieces.find((p) => p.id === id)?.title)
    .filter(Boolean) as string[];

  const goalMs = goalMinutes ? goalMinutes * 60_000 : 0;
  const goalReached = goalMs > 0 && elapsed >= goalMs;
  const goalPct = goalMs > 0 ? Math.min(100, (elapsed / goalMs) * 100) : 0;
  const nextGoal = GOAL_PRESETS[(GOAL_PRESETS.indexOf(goalMinutes ?? null) + 1) % GOAL_PRESETS.length];

  const primary = running
    ? { label: "Pause", icon: Pause, onClick: () => useStore.getState().pauseTimer() }
    : idle
      ? { label: "Start", icon: Play, onClick: () => useStore.getState().startTimer() }
      : { label: "Resume", icon: Play, onClick: () => useStore.getState().startTimer() };

  return (
    <section className={cn("flex flex-col", STAGE)}>
      {/* Context strip — what today looks like so far, and the session target. */}
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="flex min-w-0 items-center gap-3 text-sub">
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <Flame
              className={cn("h-3.5 w-3.5", streak > 0 ? "text-accent" : "text-sub")}
              aria-hidden
            />
            {streak > 0 ? (
              <>
                <span className="tabnum">{streak}</span>-day streak
              </>
            ) : (
              "No streak yet"
            )}
          </span>
          <span className="hidden text-border-strong sm:inline" aria-hidden>
            ·
          </span>
          <span className="hidden tabnum sm:inline">{formatDuration(todayLogged)} logged today</span>
        </div>
        <button
          type="button"
          onClick={cycleGoal}
          title={
            goalMinutes
              ? `Session target: ${goalMinutes} minutes. Click for ${nextGoal ? `${nextGoal} minutes` : "no target"}.`
              : "Set a target for this session"
          }
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-mini",
            "transition-colors duration-[130ms] ease-out",
            goalMinutes
              ? "border-accent/20 bg-accent/8 text-accent hover:bg-accent/12"
              : "border-border text-sub hover:border-border-strong hover:text-text",
          )}
        >
          <Target className="h-3.5 w-3.5" aria-hidden />
          {goalMinutes ? (
            <>
              <span className="tabnum">{goalMinutes}</span>m target
            </>
          ) : (
            "Set target"
          )}
        </button>
      </div>

      {/* Stage ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-10 py-10">
        <div className="flex w-full flex-col items-center">
          <div className="mb-4 flex h-5 max-w-[min(88vw,42rem)] items-center gap-2 text-mini">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-[190ms]",
                running ? "animate-[praxis-breathe_1.8s_ease-in-out_infinite] bg-accent" : "bg-sub/60",
              )}
              aria-hidden
            />
            <span className="min-w-0 truncate text-sub">
              {cat.label}
              {selectedTitles.length > 0 && (
                <span className="text-sub/70"> · {selectedTitles.join(", ")}</span>
              )}
            </span>
          </div>

          <div
            className={cn(
              "select-none text-center font-display leading-none transition-colors duration-[280ms]",
              "text-[clamp(4rem,16vw,8.5rem)] tracking-[-0.02em]",
              running ? "text-accent" : idle ? "text-sub/60" : "text-text",
            )}
            aria-live="off"
          >
            <Digits value={formatClock(elapsed)} />
          </div>
          <span className="sr-only" aria-live="polite">
            {running ? "Timer running" : idle ? "Timer ready" : "Timer paused"}
          </span>

          {goalMinutes && (
            <div className="mt-8 w-full max-w-xs">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-inset"
                role="progressbar"
                aria-valuenow={Math.round(goalPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Session target progress"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out",
                    goalReached ? "bg-accent" : "bg-accent/70",
                  )}
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-micro tabnum text-sub">
                <span>{Math.round(goalPct)}%</span>
                {goalReached ? (
                  <span className="inline-flex items-center gap-1 text-accent">
                    <Check className="h-3 w-3" aria-hidden /> target reached
                  </span>
                ) : (
                  <span>{formatClock(goalMs)} target</span>
                )}
              </div>
            </div>
          )}
        </div>

        <FocusSelector />

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!idle && (
              <Button
                variant={confirmReset ? "danger" : "ghost"}
                size="md"
                onClick={handleReset}
                title={confirmReset ? "Click again to discard this session" : "Reset the timer"}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {confirmReset ? "Discard?" : "Reset"}
              </Button>
            )}
            <Button variant="primary" size="lg" onClick={primary.onClick} className="min-w-[10rem]">
              <primary.icon className="h-5 w-5" aria-hidden />
              {primary.label}
            </Button>
            {!idle && (
              <Button
                variant="default"
                size="md"
                onClick={openFinish}
                disabled={!canFinish}
                title={canFinish ? "Log this session" : "Practice for a second first"}
              >
                <Flag className="h-4 w-4" aria-hidden />
                Finish
              </Button>
            )}
          </div>
          {idle && (
            <p className="text-mini text-sub">
              press <Kbd>space</Kbd> to start
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-mini text-sub">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>space</Kbd> start / pause
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>enter</Kbd> finish
        </span>
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <Kbd>1</Kbd>–<Kbd>6</Kbd> focus
        </span>
      </div>

      <FinishDialog
        open={finishOpen}
        elapsedMs={elapsed}
        defaultCategory={category}
        defaultPieceIds={timer.pieceIds}
        onClose={handleFinishClose}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </section>
  );
}

function TimerSkeleton() {
  return (
    <SkeletonScreen label="Loading the timer" className={cn("flex flex-col", STAGE)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 py-10">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-4 w-32" delay={40} />
          <Skeleton className="h-[7rem] w-[20rem] max-w-[80vw] rounded-lg" delay={80} />
        </div>
        <div className="flex max-w-full flex-wrap justify-center gap-2">
          {["w-24", "w-24", "w-20", "w-28", "w-28", "w-24"].map((w, i) => (
            <Skeleton key={i} className={cn("h-9 rounded-full", w)} delay={120 + i * 30} />
          ))}
        </div>
        <Skeleton className="h-12 w-40 rounded-md" delay={300} />
      </div>
    </SkeletonScreen>
  );
}
