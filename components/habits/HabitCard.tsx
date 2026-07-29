"use client";

import { useMemo } from "react";
import { Check, Flame, Pencil, Plus } from "lucide-react";
import type { Habit, HabitEntry } from "@/lib/types";
import { cn } from "@/lib/cn";
import { completedToday, entriesByDay, habitStreak } from "@/lib/habits";
import { useStore } from "@/lib/store";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { Card } from "@/components/ui/Card";
import { HabitIcon } from "./HabitIcon";
import { HABIT_COLORS } from "./HabitDialog";

export function HabitCard({
  habit,
  entries,
  onEdit,
}: {
  habit: Habit;
  entries: HabitEntry[];
  onEdit: () => void;
}) {
  const color = HABIT_COLORS[habit.color].hex;
  const values = useMemo(() => entriesByDay(entries), [entries]);
  const done = completedToday(entries);
  const streak = habitStreak(entries);

  return (
    <Card className={cn(habit.archived && "opacity-60")}>
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 11%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 16%, transparent)`,
            color,
          }}
          aria-hidden
        >
          <HabitIcon name={habit.icon} className="h-[18px] w-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lead font-medium text-text" title={habit.name}>
              {habit.name}
            </h2>
            {habit.archived && (
              <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-micro text-sub">
                Archived
              </span>
            )}
            {streak > 0 && (
              <span
                className="inline-flex shrink-0 items-center gap-1 text-micro tabnum text-sub"
                title={`${streak} day streak`}
              >
                <Flame className="h-3 w-3" style={{ color }} aria-hidden />
                {streak}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-mini text-sub" title={habit.description || undefined}>
            {habit.description ||
              `${entries.length} completed ${entries.length === 1 ? "day" : "days"}`}
          </p>
        </div>

        {/* Secondary: present but recessive, and always reachable by keyboard
            rather than hidden behind hover. */}
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${habit.name}`}
          title={`Edit ${habit.name}`}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sub opacity-70",
            "transition-[background-color,color,opacity,transform] duration-[130ms] ease-out",
            "hover:bg-soft-strong hover:text-text hover:opacity-100 focus-visible:opacity-100 active:scale-95",
          )}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>

        {/* Primary: the whole point of the card. */}
        <button
          type="button"
          onClick={() => useStore.getState().toggleHabitForDay(habit.id)}
          aria-pressed={done}
          aria-label={done ? `Mark ${habit.name} not done today` : `Mark ${habit.name} done today`}
          title={done ? "Done today — click to undo" : "Mark done for today"}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
            "transition-[background-color,border-color,color,transform] duration-[130ms] ease-out",
            "active:scale-[0.94]",
            done ? "text-on-color" : "bg-soft text-sub hover:bg-soft-strong hover:text-text",
          )}
          style={
            done
              ? { backgroundColor: color, borderColor: color }
              : { borderColor: `color-mix(in srgb, ${color} 22%, transparent)` }
          }
        >
          {done ? (
            <Check className="h-[18px] w-[18px]" strokeWidth={2.8} aria-hidden />
          ) : (
            <Plus className="h-[18px] w-[18px]" aria-hidden />
          )}
        </button>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <ContributionGrid
          values={values}
          color={color}
          label={habit.name}
          weeks={52}
          weekStartsOn={1}
          valueLabel={() => "Completed"}
          legend={false}
        />
      </div>
    </Card>
  );
}
