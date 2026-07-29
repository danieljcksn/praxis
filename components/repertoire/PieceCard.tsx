"use client";

import { Pencil } from "lucide-react";
import type { Piece } from "@/lib/types";
import type { PieceStat } from "@/lib/stats";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDuration, formatRelativeDay } from "@/lib/time";
import { cn } from "@/lib/cn";

function DifficultyMeter({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Difficulty ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn("h-2.5 w-1 rounded-full", n <= value ? "bg-sub-strong" : "bg-border-strong")}
        />
      ))}
    </span>
  );
}

export function PieceCard({
  piece,
  stat,
  onClick,
}: {
  piece: Piece;
  stat?: PieceStat;
  onClick: () => void;
}) {
  const total = stat?.totalMs ?? 0;
  const count = stat?.sessionCount ?? 0;
  const last = stat?.lastPracticed ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Edit ${piece.title}`}
      className={cn(
        "group flex w-full items-center gap-4 rounded-lg border border-border px-4 py-3.5 text-left",
        "transition-[background-color,border-color] duration-[130ms] ease-out",
        "hover:border-border-strong hover:bg-panel",
        piece.archived ? "bg-transparent opacity-55" : "bg-panel/60",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text" title={piece.title}>
            {piece.title}
          </span>
          <StatusBadge status={piece.status} />
          {piece.archived && (
            <span className="shrink-0 text-micro text-sub">archived</span>
          )}
        </span>
        <span className="mt-1 flex items-center gap-2.5 text-mini text-sub">
          <span className="truncate" title={piece.composer || undefined}>
            {piece.composer || "Unknown composer"}
          </span>
          {piece.difficulty != null && (
            <>
              <span className="text-border-strong" aria-hidden>
                ·
              </span>
              <DifficultyMeter value={piece.difficulty} />
            </>
          )}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="text-sm tabnum text-text">{count > 0 ? formatDuration(total) : "—"}</span>
        <span className="text-micro tabnum text-sub">
          {last ? `${formatRelativeDay(last)} · ${count}×` : "not practiced yet"}
        </span>
      </span>

      {/* Fades in on hover, but is always there for keyboard users. */}
      <Pencil
        className="h-3.5 w-3.5 shrink-0 text-sub opacity-0 transition-opacity duration-[130ms] group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      />
    </button>
  );
}
