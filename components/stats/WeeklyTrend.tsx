"use client";

import { useMemo } from "react";
import type { WeekBar } from "@/lib/stats";
import { formatDate, formatDuration } from "@/lib/time";
import { cn } from "@/lib/cn";

export function WeeklyTrend({
  bars,
  goalMsPerWeek,
}: {
  bars: WeekBar[];
  goalMsPerWeek: number;
}) {
  const max = useMemo(() => Math.max(goalMsPerWeek, ...bars.map((b) => b.totalMs), 1), [bars, goalMsPerWeek]);
  const goalPct = goalMsPerWeek > 0 ? (goalMsPerWeek / max) * 100 : 0;
  const lastIndex = bars.length - 1;

  return (
    <div>
      <div className="relative h-32">
        {goalMsPerWeek > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border-strong"
            style={{ bottom: `${goalPct}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] text-sub">
              weekly goal {formatDuration(goalMsPerWeek)}
            </span>
          </div>
        )}
        <div className="flex h-full items-end gap-1.5">
          {bars.map((b, i) => {
            const h = (b.totalMs / max) * 100;
            const isLast = i === lastIndex;
            return (
              <div
                key={b.weekStart}
                className="group flex h-full flex-1 items-end"
                title={`Week of ${formatDate(b.weekStart)} · ${b.totalMs > 0 ? formatDuration(b.totalMs) : "no practice"}`}
              >
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-colors duration-150",
                    isLast ? "bg-accent" : "bg-accent-dim group-hover:bg-accent",
                  )}
                  style={{ height: b.totalMs > 0 ? `${Math.max(3, h)}%` : "2px" }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5">
        {bars.map((b, i) => (
          <div key={b.weekStart} className="flex-1 text-center text-[10px] text-sub">
            {i === 0 || i === lastIndex || i === Math.floor(lastIndex / 2)
              ? formatDate(b.weekStart)
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
