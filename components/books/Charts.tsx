"use client";

import { useId, useMemo, useState } from "react";
import type { MonthPoint, ProgressPoint, WeekdayPoint } from "@/lib/books";
import { useMeasure } from "@/lib/hooks/useMeasure";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/cn";

/* Mark specs, in one place so every chart on the page is the same object:
   2px lines with round joins, an area wash at 10%, dots at r=4 with a 2px
   surface ring, bars capped so the band keeps its air, and hairline grid in
   a recessive gray. Text never wears the series color — the mark beside it
   carries identity. */
const LINE = 2;
const DOT = 4;
const AREA_OPACITY = 0.1;
const PAD = { top: 18, right: 12, bottom: 22, left: 30 };

const TIP =
  "pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap " +
  "rounded-md border border-border-strong bg-elevated px-2.5 py-1.5 text-micro text-text shadow-card " +
  "animate-[praxis-fade_120ms_var(--ease-out)_both]";

interface Tip {
  x: number;
  y: number;
  lines: string[];
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className={TIP} style={{ left: tip.x, top: tip.y - 10 }} role="tooltip">
      {tip.lines.map((line, i) => (
        <span key={i} className={cn("block", i === 0 ? "tabnum text-text" : "text-sub")}>
          {line}
        </span>
      ))}
    </div>
  );
}

/** Round a maximum up to something a person would say out loud. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = value / magnitude <= 2 ? 0.5 : value / magnitude <= 5 ? 1 : 2;
  return Math.ceil(value / (step * magnitude)) * step * magnitude;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

// ── Pages per month ──────────────────────────────────────────────────────────

/** Volume over time. The day grid shows texture; this shows the trend, which
 *  is the one thing a year of little squares genuinely cannot say. */
export function MonthlyPages({ points, height = 168 }: { points: MonthPoint[]; height?: number }) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId();

  const max = useMemo(() => niceMax(Math.max(...points.map((p) => p.pages), 0)), [points]);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.pages)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;
  const peak = points.reduce((best, p, i) => (p.pages > points[best].pages ? i : best), 0);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (plotW <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - PAD.left) / plotW;
    const i = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
    setActive(i);
    setTip({
      x: x(i),
      y: y(points[i].pages),
      lines: [
        `${fmt(points[i].pages)} ${points[i].pages === 1 ? "page" : "pages"}`,
        new Date(points[i].start).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      ],
    });
  };

  return (
    <div
      ref={ref}
      className="relative"
      onPointerMove={onMove}
      onPointerLeave={() => {
        setTip(null);
        setActive(null);
      }}
    >
      <svg
        width={width || undefined}
        height={height}
        role="img"
        aria-label={`Pages read per month. Peak ${fmt(points[peak]?.pages ?? 0)} pages in ${new Date(points[peak]?.start ?? Date.now()).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.`}
        className="block overflow-visible"
      >
        {width > 0 && (
          <>
            <defs>
              <clipPath id={clipId}>
                <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
              </clipPath>
            </defs>

            {/* Hairline grid, one step off the surface, never dashed. */}
            {[0, 0.5, 1].map((t) => (
              <line
                key={t}
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={PAD.top + plotH * t}
                y2={PAD.top + plotH * t}
                className="stroke-border"
                strokeWidth={1}
              />
            ))}
            <text x={0} y={PAD.top + 4} className="fill-sub text-[10px] tabnum">
              {fmt(max)}
            </text>
            <text x={0} y={PAD.top + plotH + 4} className="fill-sub text-[10px] tabnum">
              0
            </text>

            <g clipPath={`url(#${clipId})`}>
              <path d={area} fill="var(--color-book)" opacity={AREA_OPACITY} />
            </g>
            <path
              d={line}
              fill="none"
              stroke="var(--color-book)"
              strokeWidth={LINE}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {active !== null && (
              <>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  className="stroke-border-strong"
                  strokeWidth={1}
                />
                <circle
                  cx={x(active)}
                  cy={y(points[active].pages)}
                  r={DOT}
                  fill="var(--color-book)"
                  stroke="var(--color-panel)"
                  strokeWidth={2}
                />
              </>
            )}

            {/* One direct label, on the extreme. The tooltip carries the rest. */}
            {points[peak].pages > 0 && active === null && (
              <>
                <circle
                  cx={x(peak)}
                  cy={y(points[peak].pages)}
                  r={DOT}
                  fill="var(--color-book)"
                  stroke="var(--color-panel)"
                  strokeWidth={2}
                />
                <text
                  x={Math.min(x(peak), PAD.left + plotW - 24)}
                  y={y(points[peak].pages) - 10}
                  textAnchor={peak > points.length - 3 ? "end" : "middle"}
                  className="fill-sub-strong text-[10px] tabnum"
                >
                  {fmt(points[peak].pages)}
                </text>
              </>
            )}
          </>
        )}
      </svg>

      <div className="mt-1 flex" style={{ paddingLeft: PAD.left, paddingRight: PAD.right }}>
        {points.map((point, i) => (
          <span key={point.start} className="flex-1 text-center text-micro text-sub">
            {i % 3 === 0 || i === points.length - 1
              ? new Date(point.start).toLocaleDateString("en-US", { month: "short" })
              : ""}
          </span>
        ))}
      </div>

      <Tooltip tip={tip} />
    </div>
  );
}

// ── Pages by weekday ─────────────────────────────────────────────────────────

/** Which days you actually read on. One series, one hue: the peak is called
 *  out with a label rather than a different colour, because colour here would
 *  be encoding rank rather than identity. */
export function WeekdayPages({ points, height = 168 }: { points: WeekdayPoint[]; height?: number }) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const max = Math.max(...points.map((p) => p.pages), 1);
  const peak = points.reduce((best, p, i) => (p.pages > points[best].pages ? i : best), 0);
  const plotH = height - PAD.top - PAD.bottom;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-end gap-2" style={{ height: plotH + PAD.top }}>
        {points.map((point, i) => {
          const ratio = point.pages / max;
          return (
            <div
              key={point.day}
              className="group flex h-full flex-1 flex-col justify-end"
              onPointerEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const host = event.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                setTip({
                  x: rect.left - host.left + rect.width / 2,
                  y: rect.bottom - host.top - Math.max(4, ratio * plotH),
                  lines: [
                    `${fmt(point.pages)} ${point.pages === 1 ? "page" : "pages"}`,
                    point.label,
                  ],
                });
              }}
              onPointerLeave={() => setTip(null)}
            >
              {i === peak && point.pages > 0 && (
                <span className="mb-1 text-center text-[10px] tabnum text-sub-strong">
                  {fmt(point.pages)}
                </span>
              )}
              {/* 4px rounded cap, square at the baseline, capped thickness so
                  the band keeps its air. */}
              <div
                className="mx-auto w-full max-w-6 rounded-t bg-book transition-[filter] duration-[130ms] group-hover:brightness-110"
                style={{ height: point.pages > 0 ? `${Math.max(3, ratio * 100)}%` : 2 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {points.map((point) => (
          <span key={point.day} className="flex-1 text-center text-micro text-sub">
            {point.label}
          </span>
        ))}
      </div>
      <Tooltip tip={tip} />
      <span className="sr-only">
        Pages by day of the week:{" "}
        {points.map((p) => `${p.label} ${fmt(p.pages)}`).join(", ")}.
      </span>
      {width === 0 && null}
    </div>
  );
}

// ── One book, over time ──────────────────────────────────────────────────────

/** The shape of how a single book got read. A step line, not a smooth one:
 *  the bookmark does not drift between sittings, it jumps — and the flat
 *  stretches are the part worth seeing. */
export function BookProgress({
  points,
  length,
  unit,
  height = 150,
}: {
  points: ProgressPoint[];
  length: number | null;
  unit: "pages" | "minutes";
  height?: number;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId();

  const first = points[0]?.at ?? 0;
  const last = points[points.length - 1]?.at ?? 1;
  const span = Math.max(1, last - first);
  // Scaled to the reading, not to the book. Anchoring at the full length
  // squashes the first two hundred pages of a long book into a flat smear at
  // the baseline — and "how far is left" is already the job of the progress
  // card directly above this one. Never past the length, so a finished book
  // ends exactly at the top.
  const max = Math.min(
    length ?? Number.MAX_SAFE_INTEGER,
    niceMax(Math.max(...points.map((p) => p.position), 1)),
  );

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (at: number) => PAD.left + ((at - first) / span) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  // Step, because a bookmark jumps.
  const line = points
    .map((p, i) =>
      i === 0 ? `M${x(p.at)},${y(p.position)}` : `H${x(p.at)} V${y(p.position)}`,
    )
    .join(" ");
  const area = `${line} V${PAD.top + plotH} H${x(points[0].at)} Z`;

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (plotW <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const at = first + ((event.clientX - rect.left - PAD.left) / plotW) * span;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.at - at) < Math.abs(points[best].at - at)) best = i;
    });
    setActive(best);
    setTip({
      x: x(points[best].at),
      y: y(points[best].position),
      lines: [
        `${unit === "pages" ? "p." : ""} ${fmt(points[best].position)}`.trim(),
        formatDate(points[best].at),
      ],
    });
  };

  return (
    <div
      ref={ref}
      className="relative"
      onPointerMove={onMove}
      onPointerLeave={() => {
        setTip(null);
        setActive(null);
      }}
    >
      <svg
        width={width || undefined}
        height={height}
        role="img"
        aria-label={`Progress over time: ${points.length - 1} sittings, from ${fmt(points[0].position)} to ${fmt(points[points.length - 1].position)}${length ? ` of ${fmt(length)}` : ""}.`}
        className="block overflow-visible"
      >
        {width > 0 && (
          <>
            <defs>
              <clipPath id={clipId}>
                <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
              </clipPath>
            </defs>
            {[0, 1].map((t) => (
              <line
                key={t}
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={PAD.top + plotH * t}
                y2={PAD.top + plotH * t}
                className="stroke-border"
                strokeWidth={1}
              />
            ))}
            <text x={0} y={PAD.top + 4} className="fill-sub text-[10px] tabnum">
              {fmt(max)}
            </text>
            <text x={0} y={PAD.top + plotH + 4} className="fill-sub text-[10px] tabnum">
              0
            </text>

            <g clipPath={`url(#${clipId})`}>
              <path d={area} fill="var(--color-book)" opacity={AREA_OPACITY} />
            </g>
            <path
              d={line}
              fill="none"
              stroke="var(--color-book)"
              strokeWidth={LINE}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle
              cx={x(points[points.length - 1].at)}
              cy={y(points[points.length - 1].position)}
              r={DOT}
              fill="var(--color-book)"
              stroke="var(--color-panel)"
              strokeWidth={2}
            />
            {active !== null && (
              <line
                x1={x(points[active].at)}
                x2={x(points[active].at)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className="stroke-border-strong"
                strokeWidth={1}
              />
            )}
          </>
        )}
      </svg>
      <div
        className="mt-1 flex justify-between text-micro text-sub"
        style={{ paddingLeft: PAD.left, paddingRight: PAD.right }}
      >
        <span>{formatDate(first)}</span>
        <span>{formatDate(last)}</span>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

// ── Shelf composition ────────────────────────────────────────────────────────

/** One labelled row per status.
 *
 *  This was a stacked rule with a legend beneath it, and the palette check
 *  killed it: against the warm-paper surface, `finished` and `want to read`
 *  sit at ΔE 0.4 for a deuteranope — the same colour. Giving every status its
 *  own labelled row means identity comes from the word, the colour is only
 *  reinforcement, and nothing depends on telling two fills apart. */
export function StatusBars({
  rows,
  total,
}: {
  rows: Array<{ id: string; label: string; color: string; count: number }>;
  total: number;
}) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="mb-1 flex items-baseline gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm text-text">{row.label}</span>
            <span className="shrink-0 text-mini tabnum text-sub">
              {row.count}
              <span className="ml-1.5 text-sub/80">
                {Math.round((row.count / Math.max(1, total)) * 100)}%
              </span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(2, (row.count / max) * 100)}%`, backgroundColor: row.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
