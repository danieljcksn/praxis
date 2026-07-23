"use client";

import type { Piece } from "@/lib/types";
import type { PieceStat } from "@/lib/stats";
import { formatDuration } from "@/lib/time";

export function TopPieces({
  rows,
}: {
  rows: Array<{ piece: Piece; stat: PieceStat }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.stat.totalMs));
  return (
    <ul className="space-y-3">
      {rows.map(({ piece, stat }) => {
        const pct = (stat.totalMs / max) * 100;
        return (
          <li key={piece.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-text">{piece.title}</span>
              <span className="tabnum shrink-0 text-[12px] text-sub">
                {formatDuration(stat.totalMs)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full bg-accent-dim transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
