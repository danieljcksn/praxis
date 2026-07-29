"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Flame, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Session } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { computeStreaks, groupByDay, practiceMinutesByDay } from "@/lib/stats";
import { formatDate, formatDuration, formatRelativeDay, formatTime } from "@/lib/time";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RatingDots } from "@/components/ui/Rating";
import { SessionDialog } from "./SessionDialog";

const PAGE = 30;

export function HistoryScreen() {
  const hydrated = useHydrated();
  const sessions = useStore((s) => s.sessions);
  const pieces = useStore((s) => s.pieces);
  const settings = useStore((s) => s.settings);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [visibleDays, setVisibleDays] = useState(PAGE);

  const groups = useMemo(() => groupByDay(sessions), [sessions]);
  const streaks = useMemo(() => computeStreaks(sessions), [sessions]);
  const values = useMemo(() => practiceMinutesByDay(sessions), [sessions]);
  const pieceTitle = useMemo(() => {
    const map = new Map(pieces.map((p) => [p.id, p.title]));
    return (id: string) => map.get(id) ?? "Unknown piece";
  }, [pieces]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (session: Session) => {
    setEditing(session);
    setDialogOpen(true);
  };

  if (!hydrated) return <HistorySkeleton />;

  const shown = groups.slice(0, visibleDays);

  return (
    <div>
      <PageHeader
        title="History"
        subtitle={
          sessions.length === 0
            ? "Every session you log lands here."
            : `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"} across ${groups.length} ${groups.length === 1 ? "day" : "days"}`
        }
        action={
          <Button variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" aria-hidden />
            Log session
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow mb-2 text-accent">The last 12 months</p>
            <h2 className="text-title text-text">Practice activity</h2>
          </div>
          <div className="flex items-center gap-4 text-mini text-sub">
            <span className="inline-flex items-center gap-1.5">
              <Flame
                className={cn("h-3.5 w-3.5", streaks.current > 0 ? "text-accent" : "text-sub")}
                aria-hidden
              />
              <span className="tabnum">{streaks.current}</span> day
              {streaks.current === 1 ? "" : "s"} current
            </span>
            <span className="hidden sm:inline">
              longest <span className="tabnum">{streaks.longest}</span>
            </span>
          </div>
        </div>
        <ContributionGrid
          values={values}
          color="var(--color-accent)"
          label="Practice"
          weeks={52}
          weekStartsOn={settings.weekStartsOn}
          valueLabel={(value) => formatDuration(value * 60_000)}
        />
      </Card>

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing logged yet"
          description="Finish a session on the timer and it lands here — or log practice you did away from the app."
          action={
            <>
              <ButtonLink href="/practice" variant="primary">
                Go practice
              </ButtonLink>
              <Button variant="subtle" onClick={openAdd}>
                Log a session
              </Button>
            </>
          }
        />
      ) : (
        <div className="space-y-6">
          {shown.map((group, index) => (
            <section
              key={group.key}
              className="enter"
              style={{ "--enter-delay": `${Math.min(index, 8) * 35}ms` } as React.CSSProperties}
            >
              <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
                <div className="flex min-w-0 items-baseline gap-2">
                  <h3 className="shrink-0 text-sm font-medium text-text">
                    {formatRelativeDay(group.date)}
                  </h3>
                  <span className="truncate text-micro text-sub">{formatDate(group.date)}</span>
                </div>
                <span className="shrink-0 text-mini tabnum text-sub">
                  {formatDuration(group.totalMs)} · {group.sessions.length}×
                </span>
              </div>

              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-panel/60">
                {group.sessions.map((session) => {
                  const cat = getCategory(session.category);
                  const titles = session.pieceIds.map(pieceTitle);
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => openEdit(session)}
                      title="Edit this session"
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left",
                        "transition-colors duration-[130ms] ease-out hover:bg-panel-hover",
                      )}
                    >
                      <span className="w-12 shrink-0 text-mini tabnum text-sub">
                        {formatTime(session.startedAt)}
                      </span>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="shrink-0 text-sm text-text">{cat.label}</span>
                          {titles.length > 0 && (
                            <span className="truncate text-mini text-sub" title={titles.join(", ")}>
                              {titles.join(", ")}
                            </span>
                          )}
                        </span>
                        {session.notes && (
                          <span
                            className="mt-0.5 block truncate text-mini text-sub"
                            title={session.notes}
                          >
                            {session.notes}
                          </span>
                        )}
                      </span>
                      {session.rating != null && (
                        <span className="hidden shrink-0 sm:block">
                          <RatingDots value={session.rating} />
                        </span>
                      )}
                      <span className="shrink-0 text-sm tabnum text-text">
                        {formatDuration(session.durationMs)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {groups.length > visibleDays && (
            <div className="flex justify-center pt-1">
              <Button variant="subtle" onClick={() => setVisibleDays((v) => v + PAGE)}>
                Show earlier days
                <span className="text-sub">({groups.length - visibleDays} left)</span>
              </Button>
            </div>
          )}
        </div>
      )}

      <SessionDialog open={dialogOpen} session={editing} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <SkeletonScreen label="Loading your history">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-44" delay={40} />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" delay={60} />
      </div>
      <Skeleton className="mb-6 h-56 w-full rounded-lg" delay={100} />
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-40" delay={160 + i * 60} />
            <Skeleton className="h-[6.5rem] w-full rounded-lg" delay={180 + i * 60} />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
