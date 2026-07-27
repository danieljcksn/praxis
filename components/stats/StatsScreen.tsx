"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Clock, Flame, Repeat, TrendingUp, BarChart3 } from "lucide-react";
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
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { CategoryDonut } from "./CategoryDonut";
import { WeeklyTrend } from "./WeeklyTrend";
import { TopPieces } from "./TopPieces";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-panel/60 p-5", className)}>
      <h2 className="mb-4 text-[13px] font-medium text-text">{title}</h2>
      {children}
    </section>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel/60 p-4">
      <div className="flex items-center gap-2 text-sub">
        <Icon className={cn("h-4 w-4", accent && "text-accent")} />
        <span className="text-[11px] uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className={cn("mt-2 tabnum text-2xl font-medium leading-none", accent ? "text-accent" : "text-text")}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12px] text-sub">{sub}</div>}
    </div>
  );
}

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
      <div className="animate-[praxis-fade-in_0.3s_ease-out]">
        <PageHeader title="Stats" subtitle="Insights from your practice" />
        <EmptyState
          icon={BarChart3}
          title="No stats yet"
          description="Once you log a few sessions, this page fills with streaks, trends, and where your time goes."
          action={
            <Link href="/practice">
              <Button variant="primary">Start practicing</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const weeklyGoalMs = settings.dailyGoalMinutes * 7 * 60000;

  return (
    <div className="animate-[praxis-fade-in_0.3s_ease-out] space-y-6">
      <PageHeader
        title="Stats"
        subtitle={`${formatDuration(rollups.total)} across ${rollups.activeDays} days`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Clock}
          label="Total"
          value={formatDurationCompact(rollups.total)}
          sub={`${rollups.activeDays} active days`}
        />
        <StatTile
          icon={TrendingUp}
          label="This week"
          value={formatDurationCompact(rollups.week)}
          sub={weeklyGoalMs > 0 ? `${Math.round((rollups.week / weeklyGoalMs) * 100)}% of goal` : undefined}
        />
        <StatTile
          icon={Flame}
          label="Streak"
          accent={streaks.current > 0}
          value={
            <span>
              {streaks.current}
              <span className="ml-1 text-base font-normal text-sub">days</span>
            </span>
          }
          sub={`best ${streaks.longest} days`}
        />
        <StatTile
          icon={Repeat}
          label="Sessions"
          value={rollups.sessionCount}
          sub={`${formatDuration(rollups.avgSession)} avg`}
        />
      </div>

      <Card title="Weekly practice · last 12 weeks">
        <WeeklyTrend bars={bars} goalMsPerWeek={weeklyGoalMs} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Where the time goes">
          <CategoryDonut slices={slices} total={rollups.total} />
        </Card>
        <Card title="Most-practiced pieces">
          {topPieces.length > 0 ? (
            <TopPieces rows={topPieces} />
          ) : (
            <p className="py-8 text-center text-[13px] text-sub">
              Attach pieces to your sessions to see them ranked here.
            </p>
          )}
        </Card>
      </div>

      <Card title="By day of week">
        <div className="flex h-28 items-end gap-2">
          {weekday.ordered.map((d) => {
            const h = (d.ms / weekday.max) * 100;
            return (
              <div
                key={d.name}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                title={`${d.name} · ${d.ms > 0 ? formatDuration(d.ms) : "no practice"}`}
              >
                <div
                  className="w-full max-w-10 rounded-t-sm bg-accent-dim transition-colors hover:bg-accent"
                  style={{ height: d.ms > 0 ? `${Math.max(3, h)}%` : "2px" }}
                />
                <span className="text-[11px] text-sub">{d.name}</span>
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
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}
