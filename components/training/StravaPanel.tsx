"use client";

import { useMemo } from "react";
import { Bike, ExternalLink, Footprints, Gauge, MapPin, RefreshCw } from "lucide-react";
import { useStrava } from "@/lib/hooks/useStrava";
import { groupStravaByDay, stravaValuesByDay } from "@/lib/strava-activity";
import { formatMinutes, formatTime } from "@/lib/time";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { SectionHeading } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { Skeleton } from "@/components/ui/Skeleton";

function distance(meters: number): string {
  return `${(meters / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
}

/** Strava used to be a bespoke panel with its own header, metric grid, and
 *  footer. It is the same kind of thing as the Hevy section above it, so it
 *  now uses exactly the same parts — only the hue changes. */
export function StravaPanel() {
  const { activities, syncedAt, warning, loading, refreshing, error, refresh } = useStrava();
  const days = useMemo(() => groupStravaByDay(activities), [activities]);
  const values = useMemo(() => stravaValuesByDay(activities), [activities]);
  const totalDistance = activities.reduce((total, activity) => total + activity.distanceMeters, 0);
  const movingMinutes = activities.reduce((total, activity) => total + activity.movingMinutes, 0);
  const needsConnect = activities.length === 0 && Boolean(error || warning);

  if (loading) {
    return (
      <div className="mt-10">
        <Skeleton className="h-8 w-44" />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-[7.5rem] rounded-lg" delay={index * 45} />
          ))}
        </div>
        <Skeleton className="mt-4 h-64 rounded-lg" delay={200} />
      </div>
    );
  }

  return (
    <section className="mt-10">
      <SectionHeading
        eyebrow="Strava"
        tone="strava"
        title="Outdoor activity"
        subtitle={
          syncedAt
            ? `Last synced ${new Date(syncedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}`
            : "Runs, rides, walks, and everything between"
        }
        action={
          <>
            {needsConnect && (
              <ButtonLink href="/api/strava/connect" external variant="primary">
                Connect with Strava
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </ButtonLink>
            )}
            <Button variant="subtle" onClick={() => void refresh()} loading={refreshing}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Sync Strava
            </Button>
          </>
        }
      />

      {(error || warning) && (
        <Alert tone={error ? "error" : "warning"} className="mb-4">
          {error ?? warning}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={MapPin}
          tone="strava"
          label="Active days"
          value={days.length}
          detail={`${activities.length} activities`}
        />
        <Metric
          icon={Gauge}
          tone="strava"
          label="Distance"
          value={distance(totalDistance)}
          detail="Total logged"
        />
        <Metric
          icon={Footprints}
          tone="strava"
          label="Moving time"
          value={formatMinutes(movingMinutes)}
          detail="Across every activity"
        />
        <Metric
          icon={Bike}
          tone="strava"
          label="Average"
          value={activities.length ? distance(totalDistance / activities.length) : "—"}
          detail="Per activity"
        />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-2 text-strava">Consistency</p>
              <h2 className="text-title text-text">Moving minutes by day</h2>
            </div>
            <Badge tone="strava">minutes per day</Badge>
          </div>
          <ContributionGrid
            values={values}
            color="var(--color-strava)"
            label="Strava activity"
            weeks={52}
            valueLabel={formatMinutes}
          />
        </Card>

        <Card>
          <div className="mb-4">
            <p className="eyebrow mb-2 text-sub">Exact hours</p>
            <h2 className="text-title text-text">Recent activities</h2>
          </div>
          {days.length === 0 ? (
            <p className="py-10 text-center text-sm text-sub">
              {needsConnect
                ? "Connect Strava to pull in your runs and rides."
                : "No Strava activities yet."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {days.slice(0, 6).map((day) => (
                <div key={day.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm text-text"
                      title={day.activities.map((activity) => activity.name).join(" · ")}
                    >
                      {day.activities.map((activity) => activity.name).join(" · ")}
                    </p>
                    <p className="mt-0.5 text-micro tabnum text-sub">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {formatTime(day.firstStart)}–{formatTime(day.lastEnd)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-mini tabnum text-strava">{formatMinutes(day.movingMinutes)}</p>
                    <p className="mt-0.5 text-micro tabnum text-sub">
                      {distance(day.distanceMeters)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Required by the Strava API terms. */}
      <p className="mt-4 text-right text-micro font-medium text-strava">Powered by Strava</p>
    </section>
  );
}
