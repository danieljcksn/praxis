"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { timerElapsed } from "@/lib/timerMath";

/** Live practiced-time in ms, recomputed from timestamps on a light interval so
 *  the display stays exact even if the tab is throttled or a frame is dropped. */
export function useElapsed(intervalMs = 200): number {
  const timer = useStore((s) => s.timer);
  const [elapsed, setElapsed] = useState(() => timerElapsed(timer, Date.now()));

  useEffect(() => {
    setElapsed(timerElapsed(timer, Date.now()));
    if (timer.status !== "running") return;
    const id = window.setInterval(() => {
      setElapsed(timerElapsed(timer, Date.now()));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [timer, intervalMs]);

  return elapsed;
}
