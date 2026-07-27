"use client";

import { useMemo, useState } from "react";
import { Plus, Shapes } from "lucide-react";
import type { Habit } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { HabitCard } from "./HabitCard";
import { HabitDialog } from "./HabitDialog";

export function HabitsScreen() {
  const hydrated = useHydrated();
  const habits = useStore((state) => state.habits);
  const allEntries = useStore((state) => state.habitEntries);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const active = useMemo(
    () => habits.filter((habit) => !habit.archived).sort((a, b) => a.createdAt - b.createdAt),
    [habits],
  );

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="animate-[praxis-fade-in_0.3s_var(--ease-out)]">
      <PageHeader
        eyebrow="Your rhythms"
        title="Habits"
        subtitle={
          active.length
            ? `${active.length} ${active.length === 1 ? "habit" : "habits"} · consistency without the noise`
            : "Small promises, made visible"
        }
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New habit
          </Button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="Create your first rhythm"
          description="Reading, walking, breathing, coding—anything worth returning to can live here."
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create a habit
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {active.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              entries={allEntries.filter((entry) => entry.habitId === habit.id)}
              onEdit={() => {
                setEditing(habit);
                setDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <HabitDialog
        open={dialogOpen}
        habit={editing}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
