import type { TimerState } from "./types";

/** Practiced time so far, in ms. Pure — the single definition of "elapsed"
 *  shared by the store, the display hook, and the finish dialog. */
export function timerElapsed(t: TimerState, now: number): number {
  const live = t.status === "running" && t.lastResumeAt != null ? now - t.lastResumeAt : 0;
  return t.accumulatedMs + Math.max(0, live);
}
