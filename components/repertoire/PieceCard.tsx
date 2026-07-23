"use client";

import { Pencil } from "lucide-react";
import type { Piece } from "@/lib/types";
import type { PieceStat } from "@/lib/stats";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDuration, formatRelativeDay } from "@/lib/time";
import { cn } from "@/lib/cn";

function DifficultyMeter({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Difficulty ${value}/5`}>
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
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-border px-4 py-3.5 text-left",
        "transition-colors duration-150 hover:border-border-strong hover:bg-panel",
        piece.archived ? "bg-transparent opacity-55" : "bg-panel/60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-text">{piece.title}</span>
          <StatusBadge status={piece.status} />
          {piece.archived && <span className="text-[11px] text-sub">archived</span>}
        </div>
        <div className="mt-1 flex items-center gap-2.5 text-[12px] text-sub">
          <span className="truncate">{piece.composer || "Unknown"}</span>
          {piece.difficulty != null && (
            <>
              <span className="text-border-strong">·</span>
              <DifficultyMeter value={piece.difficulty} />
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="tabnum text-sm text-text">{count > 0 ? formatDuration(total) : "—"}</span>
        <span className="text-[11px] text-sub">
          {last ? `${formatRelativeDay(last)} · ${count}×` : "not practiced yet"}
        </span>
      </div>

      <Pencil className="h-4 w-4 shrink-0 text-sub opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
