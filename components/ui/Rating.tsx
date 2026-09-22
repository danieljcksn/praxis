"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

const LABELS = ["", "Rough", "Okay", "Solid", "Great", "Flow"];

/** Same scale, different word for the top of it: a session ends in flow, a
 *  book ends in something you'll still be carrying next year. */
export const BOOK_RATING_LABELS = ["", "Rough", "Okay", "Solid", "Great", "Unforgettable"];

/** Editable 1–5 "how did it feel" rating. Click the active value again to clear. */
export function RatingInput({
  value,
  onChange,
  size = "md",
  labels = LABELS,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: "sm" | "md";
  labels?: string[];
}) {
  // The glyph shrinks, the target does not: Button.tsx sets a 32px floor and
  // a row of 20px stars a few pixels apart misses it badly on touch.
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const star = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value != null && n <= value;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n} — ${labels[n]}`}
              aria-pressed={active}
              onClick={() => onChange(value === n ? null : n)}
              className={cn(
                "flex items-center justify-center rounded-md transition-[color,transform] duration-[130ms]",
                "hover:scale-110 active:scale-95",
                dim,
                active ? "text-accent" : "text-sub hover:text-sub-strong",
              )}
            >
              <Star className={star} fill={active ? "currentColor" : "none"} strokeWidth={2} />
            </button>
          );
        })}
      </div>
      <span className="min-w-[3ch] text-mini text-sub">{value ? labels[value] : ""}</span>
    </div>
  );
}

/** Compact read-only rating for dense rows. Takes the same vocabulary as the
 *  input, so a book is never described in the practice session's words. */
export function RatingDots({ value, labels = LABELS }: { value: number; labels?: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={labels[value] ?? String(value)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn("h-1.5 w-1.5 rounded-full", n <= value ? "bg-accent" : "bg-border-strong")}
        />
      ))}
    </span>
  );
}
