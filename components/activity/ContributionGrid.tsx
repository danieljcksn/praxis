"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { addDays, startOfDay, toDayKey } from "@/lib/time";
import { cn } from "@/lib/cn";

interface Cell {
  key: string;
  date: number;
  value: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** Cell + gap. Everything else in the grid measures itself from these. */
const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LABEL_COL = 28;

/** Mix of the series color into the empty-cell color, per level. */
const LEVEL_MIX = [0, 26, 48, 72, 100] as const;

function startOfWeek(ts: number, weekStartsOn: 0 | 1): number {
  const day = startOfDay(ts);
  const offset = (new Date(day).getDay() - weekStartsOn + 7) % 7;
  return addDays(day, -offset);
}

/** Four steps taken from the quartiles of the non-zero days, not from the
 *  single largest day. Scaling to the maximum lets one outlier flatten a whole
 *  year into the faintest tone; quartiles keep the shape of an ordinary week
 *  readable. When the spread is negligible, one confident tone is more honest
 *  than four invented ones. */
function buildScale(values: number[]): (value: number) => 1 | 2 | 3 | 4 {
  const sorted = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return () => 1;
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const t1 = at(0.25);
  const t2 = at(0.5);
  const t3 = at(0.75);
  if (t1 === t3) return () => 3;
  return (value) => (value <= t1 ? 1 : value <= t2 ? 2 : value <= t3 ? 3 : 4);
}

export function ContributionGrid({
  values,
  color,
  label,
  weeks = 52,
  weekStartsOn = 1,
  valueLabel,
  legend = true,
}: {
  values: Map<string, number>;
  color: string;
  label: string;
  weeks?: number;
  weekStartsOn?: 0 | 1;
  valueLabel?: (value: number) => string;
  legend?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const model = useMemo(() => {
    const today = startOfDay(Date.now());
    const finalWeek = startOfWeek(Date.now(), weekStartsOn);
    const firstWeek = addDays(finalWeek, -(weeks - 1) * 7);
    const level = buildScale([...values.values()]);

    const columns: Cell[][] = [];
    const monthLabels: Array<{ column: number; label: string }> = [];
    let previousMonth = -1;
    let activeDays = 0;

    for (let column = 0; column < weeks; column += 1) {
      const week = addDays(firstWeek, column * 7);
      const month = new Date(week).getMonth();
      if (month !== previousMonth) {
        monthLabels.push({
          column,
          label: new Date(week).toLocaleDateString("en-US", { month: "short" }),
        });
        previousMonth = month;
      }
      columns.push(
        Array.from({ length: 7 }, (_, row) => {
          const date = addDays(week, row);
          const key = toDayKey(date);
          const value = values.get(key) ?? 0;
          const future = date > today;
          if (value > 0 && !future) activeDays += 1;
          return { key, date, value, level: value > 0 ? level(value) : 0, future } as Cell;
        }),
      );
    }
    return { columns, monthLabels, activeDays };
  }, [values, weekStartsOn, weeks]);

  // Newest weeks sit on the right; open scrolled to them.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [model.columns.length]);

  const weekdays =
    weekStartsOn === 1
      ? ["", "Tue", "", "Thu", "", "Sat", ""]
      : ["", "Mon", "", "Wed", "", "Fri", ""];

  const describe = (cell: Cell) =>
    `${new Date(cell.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })} · ${cell.value > 0 ? (valueLabel?.(cell.value) ?? String(cell.value)) : "Nothing logged"}`;

  // One delegated listener instead of 364 title attributes: a styled tooltip
  // that appears instantly, rather than after the browser's half-second delay.
  const handleMove = (event: React.MouseEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-tip]");
    const frame = frameRef.current;
    if (!target || !frame) {
      setTip(null);
      return;
    }
    const cellRect = target.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    setTip({
      x: cellRect.left - frameRect.left + cellRect.width / 2,
      y: cellRect.top - frameRect.top,
      text: target.dataset.tip ?? "",
    });
  };

  return (
    // The frame never scrolls, so the tooltip can sit outside the grid without
    // being clipped by the scroll container's overflow.
    <div ref={frameRef} className="relative">
      <div
        ref={scrollRef}
        className="no-scrollbar overflow-x-auto pb-0.5"
        role="img"
        aria-label={`${label}: ${model.activeDays} active ${
          model.activeDays === 1 ? "day" : "days"
        } across the last ${weeks} weeks.`}
        onMouseMove={handleMove}
        onMouseLeave={() => setTip(null)}
      >
        <div className="min-w-max">
          <div
            className="mb-1.5 flex h-3.5 text-micro leading-none text-sub"
            style={{ marginLeft: LABEL_COL + 8 }}
            aria-hidden
          >
            {model.monthLabels.map((month, index) => {
              const next = model.monthLabels[index + 1]?.column ?? weeks;
              const width = (next - month.column) * STEP;
              return (
                <span
                  key={`${month.label}-${month.column}`}
                  className="shrink-0 overflow-hidden whitespace-nowrap"
                  style={{ width }}
                >
                  {/* Labels whose span is too narrow to hold the text are
                      dropped, so the oldest edge never renders "JanFeb". */}
                  {width >= 26 ? month.label : ""}
                </span>
              );
            })}
          </div>

          <div className="flex gap-2">
            <div
              className="grid shrink-0 grid-rows-7 text-right text-micro leading-none text-sub"
              style={{ width: LABEL_COL, gap: GAP }}
              aria-hidden
            >
              {weekdays.map((weekday, index) => (
                <span key={index} className="flex h-3 items-center justify-end">
                  {weekday}
                </span>
              ))}
            </div>

            <div className="flex" style={{ gap: GAP }}>
              {model.columns.map((column, columnIndex) => (
                <div key={columnIndex} className="grid grid-rows-7" style={{ gap: GAP }}>
                  {column.map((cell) => (
                    <span
                      key={cell.key}
                      data-tip={cell.future ? undefined : describe(cell)}
                      className={cn(
                        "rounded-sm border border-grid-border",
                        !cell.future && "transition-[filter] duration-[130ms] hover:brightness-125",
                      )}
                      style={{
                        width: CELL,
                        height: CELL,
                        backgroundColor: cell.future
                          ? "transparent"
                          : cell.level === 0
                            ? "var(--color-grid-empty)"
                            : `color-mix(in srgb, ${color} ${LEVEL_MIX[cell.level]}%, var(--color-grid-empty))`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {legend && (
        <div className="mt-3 flex items-center justify-between gap-4 text-micro text-sub">
          <span className="tabnum">
            {model.activeDays} active {model.activeDays === 1 ? "day" : "days"}
          </span>
          <span className="flex items-center gap-1.5">
            less
            {LEVEL_MIX.map((mix, index) => (
              <span
                key={index}
                className="rounded-sm border border-grid-border"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor:
                    index === 0
                      ? "var(--color-grid-empty)"
                      : `color-mix(in srgb, ${color} ${mix}%, var(--color-grid-empty))`,
                }}
              />
            ))}
            more
          </span>
        </div>
      )}

      {tip && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap",
            "rounded-md border border-border-strong bg-elevated px-2.5 py-1.5 text-micro text-text shadow-card",
            "animate-[praxis-fade_120ms_var(--ease-out)_both]",
          )}
          style={{ left: tip.x, top: tip.y - 8 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
