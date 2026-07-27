"use client";

import { useMemo } from "react";
import { Check, Flame, MoreHorizontal } from "lucide-react";
import type { Habit, HabitEntry } from "@/lib/types";
import { cn } from "@/lib/cn";
import { completedToday, entriesByDay, habitStreak } from "@/lib/habits";
import { useStore } from "@/lib/store";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { HabitIcon } from "./HabitIcon";
import { HABIT_COLORS } from "./HabitDialog";

export function HabitCard({
  habit,
  entries,
  onEdit,
  compact = false,
}: {
  habit: Habit;
  entries: HabitEntry[];
  onEdit: () => void;
  compact?: boolean;
}) {
  const color = HABIT_COLORS[habit.color].hex;
  const values = useMemo(() => entriesByDay(entries), [entries]);
  const done = completedToday(entries);
  const streak = habitStreak(entries);

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-border bg-panel/75 p-4 shadow-card sm:p-5"
      style={{ "--habit-color": color } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 11%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 16%, transparent)`,
            color,
          }}
        >
          <HabitIcon name={habit.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15px] font-medium tracking-[-0.01em] text-text">
              {habit.name}
            </h2>
            {streak > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabnum text-sub">
                <Flame className="h-3 w-3" style={{ color }} />
                {streak}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-sub">
            {habit.description || `${entries.length} completed days`}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sub transition-[background-color,color,transform] duration-150 hover:bg-white/[0.05] hover:text-text active:scale-95"
          aria-label={`Edit ${habit.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => useStore.getState().toggleHabitForDay(habit.id)}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.94]",
            done
              ? "text-[#07120e]"
              : "bg-white/[0.025] text-sub hover:bg-white/[0.05] hover:text-text",
          )}
          style={
            done
              ? { backgroundColor: color, borderColor: color }
              : { borderColor: `color-mix(in srgb, ${color} 22%, transparent)` }
          }
          aria-pressed={done}
          aria-label={done ? `Mark ${habit.name} incomplete today` : `Complete ${habit.name} today`}
        >
          {done ? <Check className="h-5 w-5" strokeWidth={2.8} /> : <span className="text-xl">+</span>}
        </button>
      </div>

      {!compact && (
        <div className="mt-5 border-t border-border pt-4">
          <ContributionGrid
            values={values}
            color={color}
            label={habit.name}
            weeks={52}
            weekStartsOn={1}
            valueLabel={() => "Completed"}
          />
        </div>
      )}
    </article>
  );
}
