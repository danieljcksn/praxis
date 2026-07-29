"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { getCategory } from "@/lib/categories";
import { CategoryChips } from "./CategoryChips";
import { PieceChips } from "./PieceChips";

const ACTIVE_STATUSES = new Set(["learning", "polishing", "maintenance"]);

/** Below the timer: pick the kind of practice, and (for repertoire) which
 *  pieces. The second row swaps between piece chips and a contextual hint,
 *  keeping a stable height so the layout never jumps. */
export function FocusSelector() {
  const category = useStore((s) => s.timer.category);
  const pieceIds = useStore((s) => s.timer.pieceIds);
  const pieces = useStore((s) => s.pieces);
  const setCategory = useStore((s) => s.setTimerCategory);
  const togglePiece = useStore((s) => s.toggleTimerPiece);

  const list = useMemo(() => {
    const active = pieces.filter((p) => !p.archived && ACTIVE_STATUSES.has(p.status));
    // Surface any selected piece that isn't in the active set, so it stays visible.
    const selectedExtra = pieces.filter(
      (p) => pieceIds.includes(p.id) && !active.some((a) => a.id === p.id),
    );
    return [...active, ...selectedExtra];
  }, [pieces, pieceIds]);

  const isRepertoire = category === "repertoire";

  return (
    <div className="w-full space-y-5">
      <CategoryChips value={category} onChange={setCategory} showKeys />
      <div key={category} className="flex min-h-[2rem] items-start justify-center animate-[praxis-fade_var(--dur-control)_var(--ease-out)]">
        {isRepertoire ? (
          list.length > 0 ? (
            <PieceChips pieces={list} selected={pieceIds} onToggle={togglePiece} />
          ) : (
            <Link
              href="/repertoire"
              className="flex items-center gap-1.5 rounded-sm text-sm text-sub transition-colors duration-[130ms] hover:text-text"
            >
              Add pieces to your repertoire
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )
        ) : (
          <p className="text-center text-sm text-sub">{getCategory(category).hint}</p>
        )}
      </div>
    </div>
  );
}
