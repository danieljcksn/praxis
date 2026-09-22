import { cn } from "@/lib/cn";
import type { Tone } from "./Card";

const FILL: Partial<Record<Tone, string>> = {
  accent: "bg-accent",
  mint: "bg-mint",
  book: "bg-book",
  hevy: "bg-hevy",
  strava: "bg-strava",
  github: "bg-github",
  neutral: "bg-sub",
};

/** One progress track for the whole app — the overview's two goal cards, the
 *  reading band, the shelf rows, the book detail.
 *
 *  A screen reader hearing "45" in a reading app cannot tell pages from
 *  percent from books, so `valueText` is not optional decoration: pass the
 *  sentence a person would say. */
export function Progress({
  percent,
  tone = "accent",
  valueText,
  label,
  className,
  height = "h-1.5",
}: {
  percent: number;
  tone?: Tone;
  valueText?: string;
  label?: string;
  className?: string;
  height?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={cn("overflow-hidden rounded-full bg-inset", height, className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
    >
      {/* A hair of width at any non-zero value, so "barely started" still
          reads as started rather than as empty. */}
      <div
        className={cn(
          "h-full rounded-full transition-[width,background-color] duration-[280ms] ease-out",
          FILL[tone] ?? FILL.accent,
        )}
        style={{ width: `${Math.max(clamped > 0 ? 2 : 0, clamped)}%` }}
      />
    </div>
  );
}
