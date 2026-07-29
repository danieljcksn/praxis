"use client";

import { Check } from "lucide-react";
import type { Piece } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Toggleable list of repertoire pieces to attach to a session. */
export function PieceChips({
  pieces,
  selected,
  onToggle,
}: {
  pieces: Piece[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {pieces.map((piece) => {
        const active = selected.includes(piece.id);
        return (
          <button
            key={piece.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(piece.id)}
            className={cn(
              "flex h-8 max-w-[15rem] items-center gap-2 rounded-full border px-3 text-sm transition-colors duration-[130ms]",
              active
                ? "border-accent/50 bg-accent/10 text-text"
                : "border-border text-sub hover:border-border-strong hover:text-text",
            )}
          >
            {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
            <span className="truncate">{piece.title}</span>
            {piece.composer && (
              <span className="shrink-0 truncate text-sub">· {piece.composer.split(" ").slice(-1)[0]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
