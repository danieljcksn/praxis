"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Check, Dumbbell, Flame, Play, Plus, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useHevy } from "@/lib/hooks/useHevy";
import { useStrava } from "@/lib/hooks/useStrava";
import { useGithub } from "@/lib/hooks/useGithub";
import { completedToday, entriesByDay } from "@/lib/habits";
import { computeRollups, computeStreaks, practiceMinutesByDay } from "@/lib/stats";
import { groupHevyByDay, hevyValuesByDay } from "@/lib/hevy-activity";
import { groupStravaByDay, stravaValuesByDay } from "@/lib/strava-activity";
import { githubActivityStats, githubValuesByDay } from "@/lib/github-activity";
import { formatDuration, formatTime } from "@/lib/time";
import { cn } from "@/lib/cn";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { HABIT_COLORS } from "@/components/habits/HabitDialog";
import { HabitIcon } from "@/components/habits/HabitIcon";
import { Card, CardLink } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** A single progress track, used by both cards on the today band so the two
 *  halves rhyme instead of inventing separate vocabularies for the same idea. */
function Track({ percent, tone }: { percent: number; tone: "accent" | "mint" }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-inset"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-[280ms] ease-out",
          tone === "accent" ? "bg-accent" : "bg-mint",
        )}
        style={{ width: `${Math.min(100, Math.max(percent > 0 ? 2 : 0, percent))}%` }}
      />
    </div>
  );
}

/** One stream in the year view. The label column carries the numbers so the
 *  grid never has to be read for a total. */
function ActivityRow({
  label,
  href,
  total,
  detail,
  values,
  color,
  valueLabel,
  loading = false,
  weekStartsOn = 1,
}: {
  label: string;
  href: string;
  total: string;
  detail: string;
  values: Map<string, number>;
  color: string;
  valueLabel: (value: number) => string;
  loading?: boolean;
  weekStartsOn?: 0 | 1;
}) {
  return (
    <div className="grid gap-3 border-t border-border py-5 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-6">
      <Link
        href={href}
        className="group flex items-center justify-between gap-3 rounded-md lg:block"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text transition-colors duration-[130ms] group-hover:text-accent">
            {label}
          </span>
          <ArrowRight className="h-3 w-3 text-sub opacity-0 transition-[opacity,transform] duration-[130ms] group-hover:translate-x-0.5 group-hover:opacity-100" />
        </span>
        <span className="text-right lg:mt-1.5 lg:block lg:text-left">
          <span className="block text-mini tabnum text-sub-strong">{total}</span>
          <span className="block text-micro text-sub">{detail}</span>
        </span>
      </Link>
      {loading ? (
        <Skeleton className="h-[105px] rounded-md" />
      ) : (
        <ContributionGrid
          values={values}
          color={color}
          label={label}
          weeks={52}
          weekStartsOn={weekStartsOn}
          valueLabel={valueLabel}
          legend={false}
        />
      )}
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
  const { data: githubActivity, loading: githubLoading } = useGithub();

  const habits = useMemo(() => allHabits.filter((habit) => !habit.archived), [allHabits]);
  const rollups = useMemo(
    () => computeRollups(sessions, settings.weekStartsOn),
    [sessions, settings.weekStartsOn],
  );
  const practiceStreak = useMemo(() => computeStreaks(sessions).current, [sessions]);
  const completedHabits = habits.filter((habit) =>
    completedToday(habitEntries.filter((entry) => entry.habitId === habit.id)),
  ).length;

  const habitValues = useMemo(() => entriesByDay(habitEntries), [habitEntries]);
  const practiceMap = useMemo(() => practiceMinutesByDay(sessions), [sessions]);
  const hevyMap = useMemo(() => hevyValuesByDay(workouts), [workouts]);
  const hevyDays = useMemo(() => groupHevyByDay(workouts), [workouts]);
  const stravaMap = useMemo(() => stravaValuesByDay(stravaActivities), [stravaActivities]);
  const stravaDays = useMemo(() => groupStravaByDay(stravaActivities), [stravaActivities]);
  const githubMap = useMemo(
    () => githubValuesByDay(githubActivity ?? undefined),
    [githubActivity],
  );
  const githubStats = useMemo(
    () => (githubActivity ? githubActivityStats(githubActivity) : null),
    [githubActivity],
  );

  const latestTraining = hevyDays[0];
  const goalMs = settings.dailyGoalMinutes * 60_000;
  const practicePercent = goalMs > 0 ? (rollups.today / goalMs) * 100 : 0;
  const habitPercent = habits.length > 0 ? (completedHabits / habits.length) * 100 : 0;
  const stravaMinutes = stravaDays.reduce((total, day) => total + day.movingMinutes, 0);
  const hevyMinutes = hevyDays.reduce((total, day) => total + day.totalMinutes, 0);

  if (!hydrated) return <DashboardSkeleton />;

  const shownHabits = habits.slice(0, 5);

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2.5 text-accent">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="font-display text-display-lg text-text">{greeting()}.</h1>
        </div>
        {practiceStreak > 0 && (
          <span className="flex h-8 items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 text-mini text-accent">
            <Flame className="h-3.5 w-3.5" aria-hidden />
            <span className="tabnum">{practiceStreak}</span>-day practice streak
          </span>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Practice today ─────────────────────────────────────────────── */}
        <Card className="flex flex-col">
          <p className="eyebrow text-accent">Practice today</p>
          <p className="mt-3 font-display text-display-sm tabnum text-text">
            {rollups.today > 0 ? formatDuration(rollups.today) : "Not started"}
          </p>
          <p className="mt-1 text-sm text-sub">
            {rollups.today > 0
              ? `${Math.round(practicePercent)}% of your ${settings.dailyGoalMinutes} minute target`
              : `${settings.dailyGoalMinutes} minute daily target`}
          </p>

          <div className="mt-auto pt-6">
            <Track percent={practicePercent} tone="accent" />
            <ButtonLink href="/practice" variant="primary" className="mt-5">
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {rollups.today > 0 ? "Practice again" : "Start a session"}
            </ButtonLink>
          </div>
        </Card>

        {/* Habits today ───────────────────────────────────────────────── */}
        <Card className="flex flex-col">
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow text-mint">Habits today</p>
            {habits.length > 0 && (
              <span className="text-mini tabnum text-sub">
                {completedHabits}/{habits.length}
              </span>
            )}
          </div>
          <p className="mt-3 font-display text-display-sm text-text">
            {habits.length === 0
              ? "Nothing tracked yet"
              : completedHabits === habits.length
                ? "All done"
                : `${habits.length - completedHabits} left`}
          </p>
          <div className="mt-4">
            <Track percent={habitPercent} tone="mint" />
          </div>

          <div className="mt-4 space-y-0.5">
            {shownHabits.map((habit) => {
              const entries = habitEntries.filter((entry) => entry.habitId === habit.id);
              const done = completedToday(entries);
              const color = HABIT_COLORS[habit.color].hex;
              return (
                <button
                  key={habit.id}
                  type="button"
                  aria-pressed={done}
                  aria-label={
                    done ? `Mark ${habit.name} not done today` : `Mark ${habit.name} done today`
                  }
                  onClick={() => useStore.getState().toggleHabitForDay(habit.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left",
                    "transition-[background-color,transform] duration-[130ms] ease-out",
                    "hover:bg-soft active:scale-[0.99]",
                  )}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{
                      background: `color-mix(in srgb, ${color} 10%, transparent)`,
                      color,
                    }}
                    aria-hidden
                  >
                    <HabitIcon name={habit.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm transition-colors duration-[130ms]",
                      done ? "text-sub line-through" : "text-text",
                    )}
                    title={habit.name}
                  >
                    {habit.name}
                  </span>
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-[130ms]"
                    style={
                      done
                        ? { background: color, borderColor: color, color: "var(--color-on-color)" }
                        : {
                            borderColor: `color-mix(in srgb, ${color} 22%, transparent)`,
                            color,
                          }
                    }
                    aria-hidden
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>
              );
            })}

            {habits.length > shownHabits.length && (
              <Link
                href="/habits"
                className="flex items-center gap-1.5 rounded-md px-2 py-2 text-mini text-sub transition-colors duration-[130ms] hover:text-text"
              >
                {habits.length - shownHabits.length} more
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            )}

            {habits.length === 0 && (
              <Link
                href="/habits"
                className="flex items-center gap-2.5 rounded-md border border-dashed border-border-strong p-3 text-sm text-sub transition-[border-color,color] duration-[130ms] hover:border-mint/30 hover:text-text"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-mint" aria-hidden />
                Create your first habit
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* The year ────────────────────────────────────────────────────── */}
      <Card className="mt-4">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2 text-sub">The last 12 months</p>
            <h2 className="font-display text-title-lg text-text">Every stream, one timeline</h2>
          </div>
          {/* One legend for five grids — repeating it per row would be noise. */}
          <span className="hidden items-center gap-1.5 text-micro text-sub sm:flex">
            less
            {[0, 26, 48, 72, 100].map((mix) => (
              <span
                key={mix}
                className="h-2.5 w-2.5 rounded-sm border border-grid-border"
                style={{
                  backgroundColor:
                    mix === 0
                      ? "var(--color-grid-empty)"
                      : `color-mix(in srgb, var(--color-sub-strong) ${mix}%, var(--color-grid-empty))`,
                }}
              />
            ))}
            more
          </span>
        </div>

        <ActivityRow
          label="Practice"
          href="/practice"
          total={formatDuration(rollups.total)}
          detail={`${rollups.activeDays} active days`}
          values={practiceMap}
          color="var(--color-accent)"
          valueLabel={(value) => `${value} min practiced`}
          weekStartsOn={settings.weekStartsOn}
        />
        <ActivityRow
          label="Habits"
          href="/habits"
          total={`${habitEntries.length} check-ins`}
          detail={`${habits.length} tracked`}
          values={habitValues}
          color="var(--color-mint)"
          valueLabel={(value) => `${value} completed`}
          weekStartsOn={settings.weekStartsOn}
        />
        <ActivityRow
          label="GitHub"
          href="/github"
          total={`${(githubActivity?.total ?? 0).toLocaleString("en-US")} contributions`}
          detail={`${githubStats?.activeDays ?? 0} active days`}
          values={githubMap}
          color="var(--color-github)"
          valueLabel={(value) => `${value} ${value === 1 ? "contribution" : "contributions"}`}
          loading={githubLoading}
          weekStartsOn={0}
        />
        <ActivityRow
          label="Training"
          href="/training"
          total={formatDuration(hevyMinutes * 60_000)}
          detail={`${hevyDays.length} active days`}
          values={hevyMap}
          color="var(--color-hevy)"
          valueLabel={(value) => `${value} min trained`}
          loading={hevyLoading}
          weekStartsOn={settings.weekStartsOn}
        />
        <ActivityRow
          label="Strava"
          href="/training"
          total={formatDuration(stravaMinutes * 60_000)}
          detail={`${stravaDays.length} active days`}
          values={stravaMap}
          color="var(--color-strava)"
          valueLabel={(value) => `${value} min moving`}
          loading={stravaLoading}
          weekStartsOn={settings.weekStartsOn}
        />
      </Card>

      {latestTraining && (
        <CardLink href="/training" tone="hevy" className="mt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow text-hevy">Latest workout</p>
              <h2
                className="mt-2.5 truncate text-title text-text"
                title={latestTraining.workouts.map((workout) => workout.title).join(" · ")}
              >
                {latestTraining.workouts.map((workout) => workout.title).join(" · ")}
              </h2>
              <p className="mt-1 text-mini tabnum text-sub">
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
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-hevy/10 text-hevy">
              <Dumbbell className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </CardLink>
      )}
    </div>
  );
}

/** A ghosted preview of the real layout, staggered so the page assembles
 *  rather than blinking into place. */
function DashboardSkeleton() {
  return (
    <SkeletonScreen label="Loading your overview">
      <div className="mb-7 space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-64" delay={40} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" delay={80} />
        <Skeleton className="h-64 rounded-lg" delay={120} />
      </div>
      <Skeleton className="mt-4 h-[38rem] rounded-lg" delay={160} />
    </SkeletonScreen>
  );
}
