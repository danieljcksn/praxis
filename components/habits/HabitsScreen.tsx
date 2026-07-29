"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Plus } from "lucide-react";
import type { Habit } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { completedToday } from "@/lib/habits";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { HabitCard } from "./HabitCard";
import { HabitDialog } from "./HabitDialog";

export function HabitsScreen() {
  const hydrated = useHydrated();
  const habits = useStore((state) => state.habits);
  const allEntries = useStore((state) => state.habitEntries);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const active = useMemo(
    () => habits.filter((habit) => !habit.archived).sort((a, b) => a.createdAt - b.createdAt),
    [habits],
  );
  const archived = useMemo(
    () => habits.filter((habit) => habit.archived).sort((a, b) => a.createdAt - b.createdAt),
    [habits],
  );
  const visible = showArchived ? [...active, ...archived] : active;

  const doneToday = useMemo(
    () =>
      active.filter((habit) =>
        completedToday(allEntries.filter((entry) => entry.habitId === habit.id)),
      ).length,
    [active, allEntries],
  );

  if (!hydrated) return <HabitsSkeleton />;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Your rhythms"
        tone="mint"
        title="Habits"
        subtitle={
          active.length === 0
            ? "Small promises, made visible."
            : `${doneToday} of ${active.length} done today`
        }
        action={
          <>
            {archived.length > 0 && (
              <Switch
                checked={showArchived}
                onChange={setShowArchived}
                label={`Archived (${archived.length})`}
              />
            )}
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              New habit
            </Button>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Create your first rhythm"
          description="Reading, walking, breathing, shipping — anything worth returning to can live here, one square per day."
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Create a habit
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((habit, index) => (
            <div
              key={habit.id}
              className="enter"
              style={{ "--enter-delay": `${Math.min(index, 6) * 45}ms` } as React.CSSProperties}
            >
              <HabitCard
                habit={habit}
                entries={allEntries.filter((entry) => entry.habitId === habit.id)}
                onEdit={() => {
                  setEditing(habit);
                  setDialogOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      )}

      <HabitDialog open={dialogOpen} habit={editing} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function HabitsSkeleton() {
  return (
    <SkeletonScreen label="Loading your habits">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-36" delay={40} />
          <Skeleton className="h-4 w-40" delay={60} />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" delay={80} />
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-lg" delay={120 + i * 60} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
