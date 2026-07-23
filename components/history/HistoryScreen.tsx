"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Flame, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Session } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { computeStreaks, groupByDay } from "@/lib/stats";
import { formatDate, formatDuration, formatRelativeDay, formatTime } from "@/lib/time";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RatingDots } from "@/components/ui/Rating";
import { Heatmap } from "./Heatmap";
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
    <div className="animate-[praxis-fade-in_0.3s_ease-out]">
      <PageHeader
        title="History"
        subtitle={
          sessions.length === 0
            ? "Your practice log"
            : `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"} logged`
        }
        action={
          <Button variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Log session
          </Button>
        }
      />

      {/* Activity */}
      <section className="mb-8 rounded-xl border border-border bg-panel/60 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-medium text-text">Practice activity</h2>
          <div className="flex items-center gap-4 text-[12px] text-sub">
            <span className="inline-flex items-center gap-1.5">
              <Flame className={cn("h-3.5 w-3.5", streaks.current > 0 ? "text-accent" : "text-sub")} />
              {streaks.current} day{streaks.current === 1 ? "" : "s"} current
            </span>
            <span className="hidden sm:inline">longest {streaks.longest}</span>
          </div>
        </div>
        <Heatmap sessions={sessions} weekStartsOn={settings.weekStartsOn} />
      </section>

      {/* Log */}
      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing logged yet"
          description="Finish a session on the timer and it lands here — or log practice you did away from the app."
          action={
            <div className="flex gap-2">
              <Link href="/">
                <Button variant="primary">Go practice</Button>
              </Link>
              <Button variant="subtle" onClick={openAdd}>
                Log a session
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {shown.map((group) => (
            <div key={group.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[13px] font-medium text-text">
                    {formatRelativeDay(group.date)}
                  </h3>
                  <span className="text-[11px] text-sub">{formatDate(group.date)}</span>
                </div>
                <span className="tabnum text-[12px] text-sub">
                  {formatDuration(group.totalMs)} · {group.sessions.length}×
                </span>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-panel/50">
                {group.sessions.map((session) => {
                  const cat = getCategory(session.category);
                  const titles = session.pieceIds.map(pieceTitle);
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => openEdit(session)}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-panel-hover"
                    >
                      <span className="tabnum w-12 shrink-0 text-[12px] text-sub">
                        {formatTime(session.startedAt)}
                      </span>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-[13px] text-text">{cat.label}</span>
                          {titles.length > 0 && (
                            <span className="truncate text-[12px] text-sub">
                              · {titles.join(", ")}
                            </span>
                          )}
                        </div>
                        {session.notes && (
                          <p className="mt-0.5 truncate text-[12px] text-sub">{session.notes}</p>
                        )}
                      </div>
                      {session.rating != null && (
                        <span className="hidden shrink-0 sm:block">
                          <RatingDots value={session.rating} />
                        </span>
                      )}
                      <span className="tabnum shrink-0 text-[13px] text-text">
                        {formatDuration(session.durationMs)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {groups.length > visibleDays && (
            <div className="flex justify-center pt-2">
              <Button variant="subtle" onClick={() => setVisibleDays((v) => v + PAGE)}>
                Show earlier days
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
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <Skeleton className="mb-8 h-40 w-full rounded-xl" />
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
