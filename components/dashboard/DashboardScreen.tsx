"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Dumbbell,
  Flame,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useHevy } from "@/lib/hooks/useHevy";
import { useStrava } from "@/lib/hooks/useStrava";
import { completedToday, entriesByDay } from "@/lib/habits";
import { computeRollups, computeStreaks } from "@/lib/stats";
import { groupHevyByDay, hevyValuesByDay } from "@/lib/hevy-activity";
import { groupStravaByDay, stravaValuesByDay } from "@/lib/strava-activity";
import { formatDuration, formatTime, toDayKey } from "@/lib/time";
import { cn } from "@/lib/cn";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { HABIT_COLORS } from "@/components/habits/HabitDialog";
import { HabitIcon } from "@/components/habits/HabitIcon";
import { Skeleton } from "@/components/ui/Skeleton";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function practiceValues(sessions: ReturnType<typeof useStore.getState>["sessions"]) {
  const values = new Map<string, number>();
  for (const session of sessions) {
    const key = toDayKey(session.startedAt);
    values.set(key, (values.get(key) ?? 0) + Math.round(session.durationMs / 60_000));
  }
  return values;
}

function ProgressRing({ complete, total }: { complete: number; total: number }) {
  const fraction = total > 0 ? complete / total : 0;
  const circumference = 2 * Math.PI * 25;
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg className="-rotate-90" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="25" fill="none" stroke="var(--color-inset)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          stroke="var(--color-mint)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      <span className="absolute text-[12px] font-semibold tabnum text-text">
        {complete}/{total}
      </span>
    </div>
  );
}

function ActivityRow({
  label,
  detail,
  href,
  values,
  color,
  valueLabel,
}: {
  label: string;
  detail: string;
  href: string;
  values: Map<string, number>;
  color: string;
  valueLabel: (value: number) => string;
}) {
  return (
    <div className="grid gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[9rem_minmax(0,1fr)]">
      <Link href={href} className="group flex items-center justify-between lg:block">
        <div>
          <p className="text-[13px] font-medium text-text transition-colors group-hover:text-accent">
            {label}
          </p>
          <p className="mt-0.5 text-[10px] text-sub">{detail}</p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-sub transition-transform group-hover:translate-x-0.5 lg:mt-2" />
      </Link>
      <ContributionGrid
        values={values}
        color={color}
        label={label}
        weeks={52}
        valueLabel={valueLabel}
      />
    </div>
  );
}

export function DashboardScreen() {
  const hydrated = useHydrated();
  const sessions = useStore((state) => state.sessions);
  const allHabits = useStore((state) => state.habits);
  const habitEntries = useStore((state) => state.habitEntries);
  const settings = useStore((state) => state.settings);
  const { workouts, loading: hevyLoading } = useHevy();
  const { activities: stravaActivities, loading: stravaLoading } = useStrava();
  const habits = useMemo(
    () => allHabits.filter((habit) => !habit.archived),
    [allHabits],
  );

  const rollups = useMemo(
    () => computeRollups(sessions, settings.weekStartsOn),
    [sessions, settings.weekStartsOn],
  );
  const practiceStreak = useMemo(() => computeStreaks(sessions).current, [sessions]);
  const completedHabits = habits.filter((habit) =>
    completedToday(habitEntries.filter((entry) => entry.habitId === habit.id)),
  ).length;
  const habitValues = useMemo(() => entriesByDay(habitEntries), [habitEntries]);
  const practiceMap = useMemo(() => practiceValues(sessions), [sessions]);
  const hevyMap = useMemo(() => hevyValuesByDay(workouts), [workouts]);
  const hevyDays = useMemo(() => groupHevyByDay(workouts), [workouts]);
  const stravaMap = useMemo(() => stravaValuesByDay(stravaActivities), [stravaActivities]);
  const stravaDays = useMemo(() => groupStravaByDay(stravaActivities), [stravaActivities]);
  const latestTraining = hevyDays[0];

  if (!hydrated) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-[praxis-fade-in_0.3s_var(--ease-out)]">
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-none tracking-[-0.045em] text-text">
            {greeting()}.
          </h1>
        </div>
        {practiceStreak > 0 && (
          <div className="hidden items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1.5 text-[11px] text-accent sm:flex">
            <Flame className="h-3.5 w-3.5" />
            {practiceStreak}-day practice streak
          </div>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-panel/75 p-5 shadow-card sm:p-6">
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                  Practice
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-text">
                  {rollups.today > 0 ? formatDuration(rollups.today) : "Ready when you are"}
                </h2>
                <p className="mt-1 text-[12px] text-sub">
                  {rollups.today > 0
                    ? `${Math.round((rollups.today / (settings.dailyGoalMinutes * 60_000)) * 100)}% of your daily goal`
                    : `${settings.dailyGoalMinutes} minute daily target`}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/15 bg-accent/8 text-accent">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{
                  width: `${Math.min(100, (rollups.today / (settings.dailyGoalMinutes * 60_000)) * 100)}%`,
                }}
              />
            </div>
            <Link
              href="/practice"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-[#16130a] transition-[background-color,transform] duration-150 hover:bg-accent-dim active:scale-[0.97]"
            >
              <Play className="h-4 w-4 fill-current" />
              Start a session
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-panel/75 p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mint">
                Today’s habits
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-text">
                {habits.length === 0
                  ? "Build a daily rhythm"
                  : completedHabits === habits.length
                    ? "Everything is checked"
                    : `${habits.length - completedHabits} left for today`}
              </h2>
            </div>
            <ProgressRing complete={completedHabits} total={habits.length} />
          </div>

          <div className="mt-4 space-y-2">
            {habits.slice(0, 4).map((habit) => {
              const entries = habitEntries.filter((entry) => entry.habitId === habit.id);
              const done = completedToday(entries);
              const color = HABIT_COLORS[habit.color].hex;
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => useStore.getState().toggleHabitForDay(habit.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-left transition-[background-color,border-color,transform] duration-150 hover:border-border hover:bg-white/[0.025] active:scale-[0.99]"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: `color-mix(in srgb, ${color} 10%, transparent)`,
                      color,
                    }}
                  >
                    <HabitIcon name={habit.icon} className="h-4 w-4" />
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-[12px]", done ? "text-sub line-through" : "text-text")}>
                    {habit.name}
                  </span>
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg border"
                    style={
                      done
                        ? { background: color, borderColor: color, color: "#07120e" }
                        : { borderColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }
                    }
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
            {habits.length === 0 && (
              <Link
                href="/habits"
                className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong p-3 text-[12px] text-sub transition-colors hover:border-mint/30 hover:text-text"
              >
                <Sparkles className="h-4 w-4 text-mint" />
                Create your first habit
              </Link>
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-panel/75 p-5 shadow-card sm:p-6">
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sub">
            The long view
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.025em] text-text">
            Your momentum, side by side
          </h2>
        </div>
        <ActivityRow
          label="Practice"
          detail={`${rollups.activeDays} active days`}
          href="/practice"
          values={practiceMap}
          color="#f0c458"
          valueLabel={(value) => `${value} minutes`}
        />
        <ActivityRow
          label="Habits"
          detail={`${habitEntries.length} check-ins`}
          href="/habits"
          values={habitValues}
          color="#54d6ad"
          valueLabel={(value) => `${value} completed`}
        />
        <ActivityRow
          label="Training"
          detail={hevyLoading ? "Syncing Hevy…" : `${hevyDays.length} active days`}
          href="/training"
          values={hevyMap}
          color="#70a7ff"
          valueLabel={(value) => `${value} minutes`}
        />
        <ActivityRow
          label="Strava"
          detail={stravaLoading ? "Syncing Strava…" : `${stravaDays.length} active days`}
          href="/training"
          values={stravaMap}
          color="#fc4c02"
          valueLabel={(value) => `${value} moving minutes`}
        />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Link
          href="/training"
          className="group rounded-2xl border border-border bg-panel/75 p-5 shadow-card transition-[border-color,transform] duration-150 hover:border-hevy/20 active:scale-[0.995]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-hevy">
                Latest from Hevy
              </p>
              <h2 className="mt-2 font-display text-lg font-semibold tracking-tight text-text">
                {latestTraining
                  ? latestTraining.workouts.map((workout) => workout.title).join(" · ")
                  : hevyLoading
                    ? "Syncing your workouts…"
                    : "No workouts yet"}
              </h2>
              {latestTraining && (
                <p className="mt-1 text-[11px] tabnum text-sub">
                  {new Date(latestTraining.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {formatTime(latestTraining.firstStart)}–{formatTime(latestTraining.lastEnd)}
                  {" · "}
                  {latestTraining.totalMinutes}m
                </p>
              )}
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hevy/8 text-hevy">
              <Dumbbell className="h-4 w-4" />
            </span>
          </div>
        </Link>

        <Link
          href="/stats"
          className="group rounded-2xl border border-border bg-panel/75 p-5 shadow-card transition-[border-color,transform] duration-150 hover:border-accent/20 active:scale-[0.995]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                Practice archive
              </p>
              <h2 className="mt-2 font-display text-lg font-semibold tracking-tight text-text">
                {rollups.sessionCount
                  ? `${rollups.sessionCount} sessions · ${formatDuration(rollups.total)}`
                  : "Your story starts with one session"}
              </h2>
              <p className="mt-1 text-[11px] text-sub">
                Trends, repertoire, and focus over time
              </p>
            </div>
            <ArrowRight className="mt-2 h-4 w-4 text-sub transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </section>
    </div>
  );
}
