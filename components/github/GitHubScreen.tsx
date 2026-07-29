"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  ExternalLink,
  Flame,
  GitCommitHorizontal,
  GitGraph,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useGithub } from "@/lib/hooks/useGithub";
import {
  formatGitHubDate,
  githubActivityStats,
  githubValuesByDay,
} from "@/lib/github-activity";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof GitGraph;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel/70 p-4 shadow-card">
      <div className="flex items-center gap-2 text-sub">
        <Icon className="h-4 w-4 text-github" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="mt-4 font-display text-2xl font-semibold tracking-[-0.015em] text-text">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-sub">{detail}</p>
    </div>
  );
}

function GitHubSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export function GitHubScreen() {
  const { data, loading, refreshing, error, refresh } = useGithub();
  const values = useMemo(() => githubValuesByDay(data ?? undefined), [data]);
  const stats = useMemo(() => (data ? githubActivityStats(data) : null), [data]);

  if (loading) return <GitHubSkeleton />;

  if (!data || !stats) {
    return (
      <div className="animate-[praxis-fade-in_0.3s_var(--ease-out)]">
        <PageHeader
          eyebrow="@danieljcksn"
          title="GitHub activity"
          subtitle="Code, collaboration, and shipping in one annual view."
        />
        <EmptyState
          icon={GitGraph}
          title="GitHub activity is out of reach"
          description={error ?? "The contribution calendar could not be loaded right now."}
          action={
            <Button variant="subtle" onClick={() => void refresh()} loading={refreshing}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const busiestDetail = stats.busiestDay
    ? formatGitHubDate(stats.busiestDay.date)
    : "No contribution days yet";

  return (
    <div className="animate-[praxis-fade-in_0.3s_var(--ease-out)]">
      <PageHeader
        eyebrow={`@${data.username}`}
        title="GitHub activity"
        subtitle="Code, collaboration, and shipping in one annual view."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="subtle"
              onClick={() => void refresh()}
              loading={refreshing}
              aria-label="Refresh GitHub activity"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <a
              href={data.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-panel px-4 text-sm font-medium text-sub-strong transition-[background-color,color,transform] duration-[130ms] hover:bg-accent hover:text-bg active:scale-[0.98]"
            >
              <GitGraph className="h-4 w-4" />
              <span className="hidden sm:inline">Open profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        }
      />

      {error && (
        <div className="mb-5 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[12px] text-error">
          {error} Showing the last successful refresh.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={CalendarDays}
          label="Active days"
          value={stats.activeDays.toLocaleString("en-US")}
          detail="Days with a contribution"
        />
        <Metric
          icon={GitCommitHorizontal}
          label="This week"
          value={stats.thisWeek.toLocaleString("en-US")}
          detail="Contributions since Sunday"
        />
        <Metric
          icon={Flame}
          label="Current streak"
          value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`}
          detail="Through today or yesterday"
        />
        <Metric
          icon={Sparkles}
          label="Best day"
          value={(stats.busiestDay?.count ?? 0).toLocaleString("en-US")}
          detail={busiestDetail}
        />
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-panel/70 p-5 shadow-card sm:p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-github">Contribution calendar</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.01em] text-text">
              {data.total.toLocaleString("en-US")} contributions in the last year
            </h2>
          </div>
          <span className="rounded-full border border-github/15 bg-github/8 px-2.5 py-1 text-[10px] text-github">
            contributions per day
          </span>
        </div>
        <ContributionGrid
          values={values}
          color="var(--color-github)"
          label="GitHub"
          weeks={53}
          weekStartsOn={0}
          valueLabel={(value) => `${value} ${value === 1 ? "contribution" : "contributions"}`}
        />
        <p className="mt-5 text-[10px] text-sub">
          Refreshed{" "}
          {new Date(data.syncedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          {" · "}
          Public activity from GitHub
        </p>
      </section>
    </div>
  );
}
