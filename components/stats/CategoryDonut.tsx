"use client";

import { getCategory } from "@/lib/categories";
import type { CategorySlice } from "@/lib/stats";
import { formatDuration, formatDurationCompact } from "@/lib/time";

const R = 15.915; // circumference ≈ 100 → fractions map straight to dash length

export function CategoryDonut({ slices, total }: { slices: CategorySlice[]; total: number }) {
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle cx="21" cy="21" r={R} fill="none" className="stroke-inset" strokeWidth="5" />
          {slices.map((s) => {
            const dash = s.fraction * 100;
            // Only carve a separator gap out of slices comfortably larger than
            // it, so sub-1% categories still render a visible arc.
            const shown = dash > 1.5 ? dash - 0.75 : dash;
            const el = (
              <circle
                key={s.category}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                stroke={getCategory(s.category).color}
                strokeWidth="5"
                strokeDasharray={`${shown} ${100 - shown}`}
                strokeDashoffset={-acc}
              />
            );
            acc += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabnum text-xl font-medium text-text">{formatDurationCompact(total)}</span>
          <span className="text-micro text-sub">total</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {slices.map((s) => {
          const cat = getCategory(s.category);
          return (
            <li key={s.category} className="flex items-center gap-2.5 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="flex-1 text-sub">{cat.label}</span>
              <span className="tabnum text-text">{formatDuration(s.totalMs)}</span>
              <span className="tabnum w-9 text-right text-sub">{Math.round(s.fraction * 100)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
