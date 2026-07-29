"use client";

import { useMemo } from "react";
import {
  Activity,
  Clock3,
  Dumbbell,
  Flame,
  RefreshCw,
  TimerReset,
} from "lucide-react";
import { useHevy } from "@/lib/hooks/useHevy";
import { groupHevyByDay, hevyStreak, hevyValuesByDay } from "@/lib/hevy-activity";
import { addDays, formatDate, formatTime, startOfDay, toDayKey } from "@/lib/time";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StravaPanel } from "./StravaPanel";

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel/70 p-4 shadow-card">
      <div className="flex items-center gap-2 text-sub">
        <Icon className="h-4 w-4 text-hevy" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="mt-4 font-display text-2xl font-semibold tracking-[-0.04em] text-text">{value}</p>
      <p className="mt-1 text-[11px] text-sub">{detail}</p>
    </div>
  );
}

function WeeklyTraining({ days }: { days: ReturnType<typeof groupHevyByDay> }) {
  const weeks = useMemo(() => {
    const now = startOfDay(Date.now());
    const dow = (new Date(now).getDay() + 6) % 7;
    const thisMonday = addDays(now, -dow);
    const totals = new Map(days.map((day) => [day.key, day.totalMinutes]));
    return Array.from({ length: 12 }, (_, index) => {
      const start = addDays(thisMonday, -(11 - index) * 7);
      let minutes = 0;
      for (let day = 0; day < 7; day += 1) {
        minutes += totals.get(toDayKey(addDays(start, day))) ?? 0;
      }
      return { start, minutes };
    });
  }, [days]);
  const max = Math.max(1, ...weeks.map((week) => week.minutes));

  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3">
      {weeks.map((week, index) => (
        <div
          key={week.start}
          className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
          title={`${formatDate(week.start)} · ${duration(week.minutes)}`}
        >
          <div className="relative flex h-full w-full items-end">
            <div
              className="w-full rounded-t-[5px] bg-hevy/75 transition-[background-color,opacity] duration-150 group-hover:bg-hevy"
              style={{
                height: week.minutes ? `${Math.max(5, (week.minutes / max) * 100)}%` : "2px",
                opacity: week.minutes ? 1 : 0.18,
              }}
            />
          </div>
          <span className="text-[9px] text-sub">
            {index % 2 === 0
              ? new Date(week.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrainingScreen() {
  const { workouts, syncedAt, warning, loading, refreshing, error, refresh } = useHevy();
  const days = useMemo(() => groupHevyByDay(workouts), [workouts]);
  const values = useMemo(() => hevyValuesByDay(workouts), [workouts]);
  const totalMinutes = workouts.reduce((total, workout) => total + workout.durationMinutes, 0);
  const average = workouts.length ? Math.round(totalMinutes / workouts.length) : 0;
  const streak = hevyStreak(workouts);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-[praxis-fade-in_0.3s_var(--ease-out)]">
      <PageHeader
        eyebrow="Hevy connected"
        title="Training"
        subtitle={
          syncedAt
            ? `Last synced ${new Date(syncedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}`
            : "Workout days and hours from Hevy"
        }
        action={
          <Button variant="subtle" onClick={() => void refresh()} loading={refreshing}>
            <RefreshCw className="h-4 w-4" />
            Sync Hevy
          </Button>
        }
      />

      {(error || warning) && (
        <div className="mb-5 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[12px] text-error">
          {error ?? `${warning} Showing the last successful sync.`}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={Activity}
          label="Active days"
          value={String(days.length)}
          detail={`${workouts.length} workouts recorded`}
        />
        <Metric
          icon={Clock3}
          label="Time trained"
          value={duration(totalMinutes)}
          detail="Across your Hevy history"
        />
        <Metric
          icon={TimerReset}
          label="Average"
          value={duration(average)}
          detail="Per workout"
        />
        <Metric
          icon={Flame}
          label="Live streak"
          value={`${streak} ${streak === 1 ? "day" : "days"}`}
          detail="Today or your latest run"
        />
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-panel/70 p-5 shadow-card">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium text-hevy">
              Consistency
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-text">
              Your year in motion
            </h2>
          </div>
          <span className="rounded-full border border-hevy/15 bg-hevy/8 px-2.5 py-1 text-[10px] text-hevy">
            minutes per day
          </span>
        </div>
        <ContributionGrid
          values={values}
          color="#70a7ff"
          label="Hevy training"
          weeks={52}
          valueLabel={duration}
        />
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-border bg-panel/70 p-5 shadow-card">
          <div className="mb-5">
            <p className="text-[11px] font-medium text-sub">
              Last 12 weeks
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-text">
              Training volume
            </h2>
          </div>
          <WeeklyTraining days={days} />
        </section>

        <section className="rounded-2xl border border-border bg-panel/70 p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-sub">
                Exact hours
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-text">
                Recent active days
              </h2>
            </div>
            <Dumbbell className="h-5 w-5 text-hevy" />
          </div>
          {days.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-sub">
              No workouts have arrived from Hevy yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {days.slice(0, 8).map((day) => (
                <div key={day.key} className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-hevy/8 text-hevy">
                    <span className="text-[9px]">
                      {new Date(day.date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="-mt-0.5 text-sm font-semibold">{new Date(day.date).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-text">
                      {day.workouts.map((workout) => workout.title).join(" · ")}
                    </p>
                    <p className="mt-0.5 text-[11px] tabnum text-sub">
                      {formatTime(day.firstStart)}–{formatTime(day.lastEnd)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] tabnum text-hevy">
                    {duration(day.totalMinutes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <StravaPanel />
    </div>
  );
}
