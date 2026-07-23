"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { buildHeatmap } from "@/lib/stats";
import type { Session } from "@/lib/types";
import { formatDate, formatDuration } from "@/lib/time";
import { cn } from "@/lib/cn";

const LEVEL_CLASS = ["bg-inset", "bg-accent/25", "bg-accent/45", "bg-accent/70", "bg-accent"];
const COL_PX = 15; // 12px cell + 3px gap

// SSR-safe layout effect (avoids the React warning on the server).
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Heatmap({
  sessions,
  weekStartsOn,
  weeks = 26,
}: {
  sessions: Session[];
  weekStartsOn: 0 | 1;
  weeks?: number;
}) {
  const model = useMemo(
    () => buildHeatmap(sessions, { weeks, weekStartsOn }),
    [sessions, weeks, weekStartsOn],
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // Newest weeks sit on the right; open scrolled to them.
  useIso(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [model.weeks.length]);

  const weekdayLabels = useMemo(() => {
    const ref = new Date(2024, 0, 7 + weekStartsOn); // a Sunday-aligned reference
    return Array.from({ length: 7 }, (_, row) => {
      const d = new Date(ref);
      d.setDate(ref.getDate() + row);
      const name = d.toLocaleDateString("en-US", { weekday: "short" });
      return ["Mon", "Wed", "Fri"].includes(name) ? name : "";
    });
  }, [weekStartsOn]);

  const monthSegments = useMemo(() => {
    const labels = model.monthLabels;
    return labels.map((l, i) => {
      const next = labels[i + 1]?.colIndex ?? model.weeks.length;
      const width = (next - l.colIndex) * COL_PX;
      // Drop labels whose column span is too narrow to hold the text, so the
      // oldest edge never renders "JanFeb" jammed together.
      return { label: width >= 26 ? l.label : "", width };
    });
  }, [model]);

  const summary = useMemo(() => {
    let days = 0;
    let ms = 0;
    for (const week of model.weeks)
      for (const cell of week)
        if (!cell.future && cell.totalMs > 0) {
          days += 1;
          ms += cell.totalMs;
        }
    return `Practice activity heatmap: ${days} active ${days === 1 ? "day" : "days"}, ${formatDuration(ms)} total over the last ${model.weeks.length} weeks.`;
  }, [model]);

  return (
    <div
      ref={scrollRef}
      role="img"
      aria-label={summary}
      className="no-scrollbar overflow-x-auto"
    >
      <div className="inline-flex min-w-full flex-col gap-1">
        {/* month header */}
        <div className="flex">
          <div className="w-9 shrink-0" />
          <div className="flex text-[10px] text-sub">
            {monthSegments.map((seg, i) => (
              <span
                key={i}
                style={{ width: seg.width }}
                className="shrink-0 overflow-hidden whitespace-nowrap"
              >
                {seg.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {/* weekday labels */}
          <div className="flex w-7 shrink-0 flex-col gap-[3px] pr-1 text-right">
            {weekdayLabels.map((label, i) => (
              <span key={i} className="h-3 text-[10px] leading-3 text-sub">
                {label}
              </span>
            ))}
          </div>

          {/* grid */}
          <div className="flex gap-[3px]">
            {model.weeks.map((week, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {week.map((cell) => (
                  <div
                    key={cell.key}
                    title={
                      cell.future
                        ? undefined
                        : `${formatDate(cell.date)} · ${cell.totalMs > 0 ? formatDuration(cell.totalMs) : "rest day"}`
                    }
                    className={cn(
                      "h-3 w-3 rounded-[3px] transition-colors",
                      cell.future
                        ? "bg-transparent"
                        : cn(LEVEL_CLASS[cell.level], "hover:ring-1 hover:ring-accent/50"),
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* legend */}
        <div className="mt-1 flex items-center justify-end gap-1.5 pr-1 text-[10px] text-sub">
          <span>less</span>
          {LEVEL_CLASS.map((c, i) => (
            <span key={i} className={cn("h-3 w-3 rounded-[3px]", c)} />
          ))}
          <span>more</span>
        </div>
      </div>
    </div>
  );
}
