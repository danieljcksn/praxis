"use client";

import { useMemo } from "react";
import { Activity, Clock3, Flame, RefreshCw, TimerReset } from "lucide-react";
import { useHevy } from "@/lib/hooks/useHevy";
import { groupHevyByDay, hevyStreak, hevyValuesByDay } from "@/lib/hevy-activity";
import { addDays, formatDate, formatMinutes, formatTime, startOfDay, toDayKey } from "@/lib/time";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { StravaPanel } from "./StravaPanel";

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
  const lastIndex = weeks.length - 1;

  return (
    <div className="flex h-40 items-end gap-1.5 sm:gap-2">
      {weeks.map((week, index) => (
        <div
          key={week.start}
          className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
          title={`Week of ${formatDate(week.start)} · ${week.minutes ? formatMinutes(week.minutes) : "no training"}`}
        >
          <div className="relative flex h-full w-full items-end">
            <div
              className={
                // The current week reads as "in progress", not as a short week.
                index === lastIndex
                  ? "w-full rounded-t-sm bg-hevy transition-[height] duration-[280ms] ease-out"
                  : "w-full rounded-t-sm bg-hevy/60 transition-[background-color,height] duration-[280ms] ease-out group-hover:bg-hevy"
              }
              style={{
                height: week.minutes ? `${Math.max(4, (week.minutes / max) * 100)}%` : "2px",
                opacity: week.minutes ? 1 : 0.25,
              }}
            />
          </div>
          <span className="text-micro leading-none text-sub">
            {index % 2 === 0
              ? new Date(week.start).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
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

  if (loading) return <TrainingSkeleton />;

  return (
    <div>
      <PageHeader
        eyebrow="Hevy + Strava"
        tone="hevy"
        title="Training"
        subtitle={
          syncedAt
            ? `Last synced ${new Date(syncedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}`
            : "Workout days and hours, pulled from Hevy"
        }
        action={
          <Button variant="subtle" onClick={() => void refresh()} loading={refreshing}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Sync Hevy
          </Button>
        }
      />

      {(error || warning) && (
        <Alert tone={error ? "error" : "warning"} className="mb-5">
          {error ?? `${warning} Showing the last successful sync.`}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={Activity}
          tone="hevy"
          label="Active days"
          value={days.length}
          detail={`${workouts.length} workouts recorded`}
        />
        <Metric
          icon={Clock3}
          tone="hevy"
          label="Time trained"
          value={formatMinutes(totalMinutes)}
          detail="Across your Hevy history"
        />
        <Metric
          icon={TimerReset}
          tone="hevy"
          label="Average"
          value={formatMinutes(average)}
          detail="Per workout"
        />
        <Metric
          icon={Flame}
          tone="hevy"
          label="Live streak"
          value={`${streak} ${streak === 1 ? "day" : "days"}`}
          detail="Today or your latest run"
        />
      </div>

      <Card className="mt-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2 text-hevy">Consistency</p>
            <h2 className="font-display text-title-lg text-text">Your year in motion</h2>
          </div>
          <Badge tone="hevy">minutes per day</Badge>
        </div>
        <ContributionGrid
          values={values}
          color="var(--color-hevy)"
          label="Hevy training"
          weeks={52}
          valueLabel={formatMinutes}
        />
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-6">
            <p className="eyebrow mb-2 text-sub">Last 12 weeks</p>
            <h2 className="text-title text-text">Training volume</h2>
          </div>
          <WeeklyTraining days={days} />
        </Card>

        <Card>
          <div className="mb-4">
            <p className="eyebrow mb-2 text-sub">Exact hours</p>
            <h2 className="text-title text-text">Recent active days</h2>
          </div>
          {days.length === 0 ? (
            <p className="py-10 text-center text-sm text-sub">
              No workouts have arrived from Hevy yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {days.slice(0, 8).map((day) => (
                <div key={day.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-hevy/10 text-hevy">
                    <span className="text-[0.5625rem] uppercase leading-none tracking-wider">
                      {new Date(day.date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="mt-0.5 text-mini font-semibold leading-none tabnum">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm text-text"
                      title={day.workouts.map((workout) => workout.title).join(" · ")}
                    >
                      {day.workouts.map((workout) => workout.title).join(" · ")}
                    </p>
                    <p className="mt-0.5 text-micro tabnum text-sub">
                      {formatTime(day.firstStart)}–{formatTime(day.lastEnd)}
                    </p>
                  </div>
                  <span className="shrink-0 text-mini tabnum text-hevy">
                    {formatMinutes(day.totalMinutes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <StravaPanel />
    </div>
  );
}

function TrainingSkeleton() {
  return (
    <SkeletonScreen label="Loading your training">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-40" delay={40} />
          <Skeleton className="h-4 w-52" delay={60} />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" delay={80} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[7.5rem] rounded-lg" delay={100 + index * 45} />
        ))}
      </div>
      <Skeleton className="mt-4 h-64 rounded-lg" delay={300} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-72 rounded-lg" delay={360} />
        <Skeleton className="h-72 rounded-lg" delay={400} />
      </div>
    </SkeletonScreen>
  );
}
