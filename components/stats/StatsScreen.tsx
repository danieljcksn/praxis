"use client";

import { useMemo } from "react";
import { ChartColumn, Clock, Flame, Repeat, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  categoryBreakdown,
  computeRollups,
  computeStreaks,
  pieceStats,
  weeklySeries,
} from "@/lib/stats";
import { formatDuration, formatDurationCompact } from "@/lib/time";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryDonut } from "./CategoryDonut";
import { WeeklyTrend } from "./WeeklyTrend";
import { TopPieces } from "./TopPieces";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function StatsScreen() {
  const hydrated = useHydrated();
  const sessions = useStore((s) => s.sessions);
  const pieces = useStore((s) => s.pieces);
  const settings = useStore((s) => s.settings);

  const rollups = useMemo(
    () => computeRollups(sessions, settings.weekStartsOn),
    [sessions, settings.weekStartsOn],
  );
  const streaks = useMemo(() => computeStreaks(sessions), [sessions]);
  const slices = useMemo(() => categoryBreakdown(sessions), [sessions]);
  const bars = useMemo(
    () => weeklySeries(sessions, 12, settings.weekStartsOn),
    [sessions, settings.weekStartsOn],
  );
  const topPieces = useMemo(() => {
    const stats = pieceStats(sessions, pieces);
    return pieces
      .map((p) => ({ piece: p, stat: stats.get(p.id)! }))
      .filter((r) => r.stat && r.stat.totalMs > 0)
      .sort((a, b) => b.stat.totalMs - a.stat.totalMs)
      .slice(0, 6);
  }, [sessions, pieces]);

  const weekday = useMemo(() => {
    const totals = new Array(7).fill(0) as number[];
    for (const s of sessions) totals[new Date(s.startedAt).getDay()] += s.durationMs;
    const ordered = Array.from({ length: 7 }, (_, i) => {
      const dow = (settings.weekStartsOn + i) % 7;
      return { name: WEEKDAY_NAMES[dow], ms: totals[dow] };
    });
    return { ordered, max: Math.max(1, ...totals) };
  }, [sessions, settings.weekStartsOn]);

  if (!hydrated) return <StatsSkeleton />;

  if (sessions.length === 0) {
    return (
      <div>
        <PageHeader title="Stats" subtitle="Insights from your practice." />
        <EmptyState
          icon={ChartColumn}
          title="No stats yet"
          description="Once you log a few sessions, this page fills with streaks, trends, and where your time actually goes."
          action={
            <ButtonLink href="/practice" variant="primary">
              Start practicing
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const weeklyGoalMs = settings.dailyGoalMinutes * 7 * 60_000;
  const best = weekday.ordered.reduce((a, b) => (b.ms > a.ms ? b : a));

  return (
    <div>
      <PageHeader
        title="Stats"
        subtitle={`${formatDuration(rollups.total)} across ${rollups.activeDays} days`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={Clock}
          label="Total"
          value={formatDurationCompact(rollups.total)}
          detail={`${rollups.activeDays} active days`}
        />
        <Metric
          icon={TrendingUp}
          label="This week"
          value={formatDurationCompact(rollups.week)}
          detail={
            weeklyGoalMs > 0
              ? `${Math.round((rollups.week / weeklyGoalMs) * 100)}% of weekly goal`
              : undefined
          }
        />
        <Metric
          icon={Flame}
          tone={streaks.current > 0 ? "accent" : "neutral"}
          label="Streak"
          value={`${streaks.current} ${streaks.current === 1 ? "day" : "days"}`}
          detail={`best ${streaks.longest} days`}
        />
        <Metric
          icon={Repeat}
          label="Sessions"
          value={rollups.sessionCount}
          detail={`${formatDuration(rollups.avgSession)} average`}
        />
      </div>

      <Card className="mt-4">
        <div className="mb-6">
          <p className="eyebrow mb-2 text-sub">Last 12 weeks</p>
          <h2 className="text-title text-text">Weekly practice</h2>
        </div>
        <WeeklyTrend bars={bars} goalMsPerWeek={weeklyGoalMs} />
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-6">
            <p className="eyebrow mb-2 text-sub">Balance</p>
            <h2 className="text-title text-text">Where the time goes</h2>
          </div>
          <CategoryDonut slices={slices} total={rollups.total} />
        </Card>

        <Card>
          <div className="mb-6">
            <p className="eyebrow mb-2 text-sub">Repertoire</p>
            <h2 className="text-title text-text">Most-practiced pieces</h2>
          </div>
          {topPieces.length > 0 ? (
            <TopPieces rows={topPieces} />
          ) : (
            <p className="py-10 text-center text-sm text-sub">
              Attach pieces to your sessions to see them ranked here.
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-6">
          <p className="eyebrow mb-2 text-sub">Rhythm</p>
          <h2 className="text-title text-text">By day of week</h2>
        </div>
        <div className="flex h-32 items-end gap-2">
          {weekday.ordered.map((d) => {
            const height = (d.ms / weekday.max) * 100;
            const isBest = d.ms > 0 && d.name === best.name;
            return (
              <div
                key={d.name}
                className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                title={`${d.name} · ${d.ms > 0 ? formatDuration(d.ms) : "no practice"}`}
              >
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={
                      isBest
                        ? "w-full max-w-12 rounded-t-sm bg-accent transition-[height] duration-[280ms] ease-out"
                        : "w-full max-w-12 rounded-t-sm bg-accent-dim/70 transition-[background-color,height] duration-[280ms] ease-out group-hover:bg-accent"
                    }
                    style={{ height: d.ms > 0 ? `${Math.max(3, height)}%` : "2px" }}
                  />
                </div>
                <span className="text-micro text-sub">{d.name}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <SkeletonScreen label="Loading your stats">
      <div className="mb-7 space-y-2.5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-52" delay={40} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[7.5rem] rounded-lg" delay={80 + i * 45} />
        ))}
      </div>
      <Skeleton className="mt-4 h-56 w-full rounded-lg" delay={280} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" delay={340} />
        <Skeleton className="h-64 rounded-lg" delay={380} />
      </div>
    </SkeletonScreen>
  );
}
