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
import { formatGitHubDate, githubActivityStats, githubValuesByDay } from "@/lib/github-activity";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

export function GitHubScreen() {
  const { data, loading, refreshing, error, refresh } = useGithub();
  const values = useMemo(() => githubValuesByDay(data ?? undefined), [data]);
  const stats = useMemo(() => (data ? githubActivityStats(data) : null), [data]);

  if (loading) return <GitHubSkeleton />;

  if (!data || !stats) {
    return (
      <div>
        <PageHeader
          eyebrow="GitHub"
          tone="github"
          title="Contribution activity"
          subtitle="Code, collaboration, and shipping in one annual view."
        />
        <EmptyState
          icon={GitGraph}
          title="GitHub activity is out of reach"
          description={
            error ?? "The contribution calendar could not be loaded right now."
          }
          action={
            <Button variant="subtle" onClick={() => void refresh()} loading={refreshing}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={`@${data.username}`}
        tone="github"
        title="Contribution activity"
        subtitle="Code, collaboration, and shipping in one annual view."
        action={
          <>
            <Button
              variant="subtle"
              onClick={() => void refresh()}
              loading={refreshing}
              title="Refresh GitHub activity"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <ButtonLink
              href={data.profileUrl}
              external
              target="_blank"
              rel="noreferrer"
              title={`Open @${data.username} on GitHub`}
            >
              <GitGraph className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Open profile</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </ButtonLink>
          </>
        }
      />

      {/* A failed refresh keeps the last good calendar on screen rather than
          replacing a year of data with an error. */}
      {error && (
        <Alert tone="warning" className="mb-5">
          {error} Showing the last successful refresh.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={CalendarDays}
          tone="github"
          label="Active days"
          value={stats.activeDays.toLocaleString("en-US")}
          detail="Days with a contribution"
        />
        <Metric
          icon={GitCommitHorizontal}
          tone="github"
          label="This week"
          value={stats.thisWeek.toLocaleString("en-US")}
          detail="Contributions since Sunday"
        />
        <Metric
          icon={Flame}
          tone="github"
          label="Current streak"
          value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`}
          detail="Through today or yesterday"
        />
        <Metric
          icon={Sparkles}
          tone="github"
          label="Best day"
          value={(stats.busiestDay?.count ?? 0).toLocaleString("en-US")}
          detail={
            stats.busiestDay ? formatGitHubDate(stats.busiestDay.date) : "No contribution days yet"
          }
        />
      </div>

      <Card className="mt-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2 text-github">Contribution calendar</p>
            <h2 className="font-display text-title-lg text-text">
              {data.total.toLocaleString("en-US")} contributions in the last year
            </h2>
          </div>
          <Badge tone="github">contributions per day</Badge>
        </div>

        <ContributionGrid
          values={values}
          color="var(--color-github)"
          label="GitHub"
          weeks={53}
          weekStartsOn={0}
          valueLabel={(value) => `${value} ${value === 1 ? "contribution" : "contributions"}`}
        />

        <p className="mt-5 border-t border-border pt-4 text-micro text-sub">
          Public activity from GitHub · refreshed{" "}
          {new Date(data.syncedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </Card>
    </div>
  );
}

function GitHubSkeleton() {
  return (
    <SkeletonScreen label="Loading GitHub activity">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64" delay={40} />
          <Skeleton className="h-4 w-72" delay={60} />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" delay={80} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[7.5rem] rounded-lg" delay={100 + index * 45} />
        ))}
      </div>
      <Skeleton className="mt-4 h-64 rounded-lg" delay={300} />
    </SkeletonScreen>
  );
}
