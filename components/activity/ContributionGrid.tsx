"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { addDays, startOfDay, toDayKey } from "@/lib/time";

interface Cell {
  key: string;
  date: number;
  value: number;
  future: boolean;
}

function startOfWeek(ts: number, weekStartsOn: 0 | 1): number {
  const day = startOfDay(ts);
  const offset = (new Date(day).getDay() - weekStartsOn + 7) % 7;
  return addDays(day, -offset);
}

export function ContributionGrid({
  values,
  color,
  label,
  weeks = 52,
  weekStartsOn = 1,
  valueLabel,
}: {
  values: Map<string, number>;
  color: string;
  label: string;
  weeks?: number;
  weekStartsOn?: 0 | 1;
  valueLabel?: (value: number) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => {
    const now = Date.now();
    const today = startOfDay(now);
    const finalWeek = startOfWeek(now, weekStartsOn);
    const firstWeek = addDays(finalWeek, -(weeks - 1) * 7);
    const columns: Cell[][] = [];
    const monthLabels: Array<{ column: number; label: string }> = [];
    let previousMonth = -1;
    let max = 0;

    for (const value of values.values()) max = Math.max(max, value);
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
          return { key, date, value: values.get(key) ?? 0, future: date > today };
        }),
      );
    }
    return { columns, monthLabels, max };
  }, [values, weekStartsOn, weeks]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [model.columns.length]);

  const weekdays =
    weekStartsOn === 1 ? ["", "Tue", "", "Thu", "", "Sat", ""] : ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar overflow-x-auto"
      role="img"
      aria-label={`${label} contribution chart`}
    >
      <div className="min-w-max">
        <div className="mb-1.5 ml-9 flex h-4 text-[9px] text-sub">
          {model.monthLabels.map((month, index) => {
            const next = model.monthLabels[index + 1]?.column ?? weeks;
            return (
              <span
                key={`${month.label}-${month.column}`}
                className="shrink-0"
                style={{ width: (next - month.column) * 15 }}
              >
                {next - month.column > 1 ? month.label : ""}
              </span>
            );
          })}
        </div>
        <div className="flex gap-2">
          <div className="grid w-7 shrink-0 grid-rows-7 gap-[3px] text-right text-[9px] leading-3 text-sub">
            {weekdays.map((weekday, index) => (
              <span key={index} className="h-3">
                {weekday}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {model.columns.map((column, columnIndex) => (
              <div key={columnIndex} className="grid grid-rows-7 gap-[3px]">
                {column.map((cell) => {
                  const intensity =
                    cell.value <= 0 || model.max <= 0
                      ? 0
                      : Math.max(0.28, Math.min(1, 0.2 + (cell.value / model.max) * 0.8));
                  return (
                    <span
                      key={cell.key}
                      className="h-3 w-3 rounded-[3px] border border-grid-border"
                      style={{
                        backgroundColor: cell.future
                          ? "transparent"
                          : cell.value > 0
                            ? `color-mix(in srgb, ${color} ${Math.round(intensity * 100)}%, var(--color-grid-empty))`
                            : "var(--color-grid-empty)",
                      }}
                      title={
                        cell.future
                          ? undefined
                          : `${new Date(cell.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })} · ${
                              cell.value > 0
                                ? valueLabel?.(cell.value) ?? String(cell.value)
                                : "No activity"
                            }`
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
