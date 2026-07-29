"use client";

import { useMemo } from "react";
import { Bike, ExternalLink, Footprints, Gauge, MapPin, RefreshCw } from "lucide-react";
import { useStrava } from "@/lib/hooks/useStrava";
import { groupStravaByDay, stravaValuesByDay } from "@/lib/strava-activity";
import { formatTime } from "@/lib/time";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function distance(meters: number): string {
  return `${(meters / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
}

export function StravaPanel() {
  const { activities, syncedAt, warning, loading, refreshing, error, refresh } = useStrava();
  const days = useMemo(() => groupStravaByDay(activities), [activities]);
  const values = useMemo(() => stravaValuesByDay(activities), [activities]);
  const totalDistance = activities.reduce((total, activity) => total + activity.distanceMeters, 0);
  const movingMinutes = activities.reduce((total, activity) => total + activity.movingMinutes, 0);
  const needsConnect = activities.length === 0 && Boolean(error || warning);

  if (loading) return <Skeleton className="mt-5 h-[30rem] rounded-2xl" />;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-panel/70 shadow-card">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-strava" />
            <p className="text-[11px] font-medium text-strava">
              Strava
            </p>
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.01em] text-text">
            Outdoor activity
          </h2>
          <p className="mt-1 text-[11px] text-sub">
            {syncedAt
              ? `Synced ${new Date(syncedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Runs, rides, walks, and everything between"}
          </p>
        </div>
        <div className="flex gap-2">
          {needsConnect && (
            <a
              href="/api/strava/connect"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-strava px-4 text-[12px] font-semibold text-on-strava transition-[background-color,transform] duration-150 hover:bg-strava-strong active:scale-[0.97]"
            >
              Connect with Strava
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Button variant="subtle" onClick={() => void refresh()} loading={refreshing}>
            <RefreshCw className="h-4 w-4" />
            Sync
          </Button>
        </div>
      </div>

      {(error || warning) && (
        <div className="mx-5 mt-5 rounded-xl border border-strava/20 bg-strava/5 px-4 py-3 text-[12px] text-strava">
          {error ?? warning}
        </div>
      )}

      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {[
          { icon: MapPin, label: "Active days", value: String(days.length) },
          { icon: Gauge, label: "Distance", value: distance(totalDistance) },
          { icon: Footprints, label: "Moving time", value: duration(movingMinutes) },
          { icon: Bike, label: "Activities", value: String(activities.length) },
        ].map((metric) => (
          <div key={metric.label} className="bg-panel px-5 py-4">
            <div className="flex items-center gap-2 text-sub">
              <metric.icon className="h-3.5 w-3.5 text-strava" />
              <span className="text-[9px] font-medium">
                {metric.label}
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-semibold text-text">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-4 text-[11px] font-medium text-sub">
            Moving minutes by day
          </p>
          <ContributionGrid
            values={values}
            color="var(--color-strava)"
            label="Strava activity"
            weeks={52}
            valueLabel={duration}
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium text-sub">
            Exact hours
          </p>
          <div className="divide-y divide-border">
            {days.slice(0, 6).map((day) => (
              <div key={day.key} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-text">
                    {day.activities.map((activity) => activity.name).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-[10px] tabnum text-sub">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {formatTime(day.firstStart)}–{formatTime(day.lastEnd)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] tabnum text-strava">{duration(day.movingMinutes)}</p>
                  <p className="mt-0.5 text-[9px] tabnum text-sub">{distance(day.distanceMeters)}</p>
                </div>
              </div>
            ))}
            {days.length === 0 && !needsConnect && (
              <p className="py-10 text-center text-[12px] text-sub">No Strava activities yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-5 py-3 text-right text-[10px] font-medium text-strava">
        Powered by Strava
      </div>
    </section>
  );
}
