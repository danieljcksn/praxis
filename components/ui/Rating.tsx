"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

const LABELS = ["", "Rough", "Okay", "Solid", "Great", "Flow"];

/** Editable 1–5 "how did it feel" rating. Click the active value again to clear. */
export function RatingInput({
  value,
  onChange,
  size = "md",
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-5 w-5" : "h-7 w-7";
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
              aria-label={`${n} — ${LABELS[n]}`}
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
      <span className="min-w-[3ch] text-mini text-sub">{value ? LABELS[value] : ""}</span>
    </div>
  );
}

/** Compact read-only rating for dense rows. */
export function RatingDots({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Felt: ${LABELS[value] ?? value}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn("h-1.5 w-1.5 rounded-full", n <= value ? "bg-accent" : "bg-border-strong")}
        />
      ))}
    </span>
  );
}
