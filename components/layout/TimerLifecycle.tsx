"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { timerElapsed } from "@/lib/timerMath";
import { formatClock } from "@/lib/time";

/** App-wide side effects for the running timer, mounted once in the layout so a
 *  session survives navigating between pages:
 *   - banks practiced time whenever the tab is hidden or closed, so we never
 *     lose more than a moment if the browser is quit mid-session;
 *   - mirrors the live clock into the tab title while running. */
export function TimerLifecycle() {
  // Bank on tab-hide / unload.
  useEffect(() => {
    const bank = () => useStore.getState().bankTimer();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") bank();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", bank);
    window.addEventListener("beforeunload", bank);
    // Low-frequency checkpoint so an unexpected crash (no lifecycle event fires)
    // can lose at most ~15s of the current run. bankTimer no-ops when idle.
    const checkpoint = window.setInterval(bank, 15000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", bank);
      window.removeEventListener("beforeunload", bank);
      window.clearInterval(checkpoint);
    };
  }, []);

  // Reflect the clock in the tab title only while running; restore on stop.
  useEffect(() => {
    let intervalId: number | null = null;
    let restoreTitle = "";

    const start = () => {
      if (intervalId != null) return;
      restoreTitle = document.title;
      const update = () => {
        const t = useStore.getState().timer;
        document.title = `${formatClock(timerElapsed(t, Date.now()))} · practicing`;
      };
      update();
      intervalId = window.setInterval(update, 1000);
    };
    const stop = () => {
      if (intervalId == null) return;
      window.clearInterval(intervalId);
      intervalId = null;
      document.title = restoreTitle || "praxis";
    };
    const apply = (status: string) => (status === "running" ? start() : stop());

    apply(useStore.getState().timer.status);
    const unsub = useStore.subscribe((state) => apply(state.timer.status));
    return () => {
      unsub();
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
