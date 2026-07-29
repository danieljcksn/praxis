"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { CategoryId } from "@/lib/types";
import { formatClock } from "@/lib/time";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { RatingInput } from "@/components/ui/Rating";
import { CategoryChips } from "./CategoryChips";
import { PieceChips } from "./PieceChips";

export interface FinishPayload {
  category: CategoryId;
  pieceIds: string[];
  notes: string;
  rating: number | null;
}

export function FinishDialog({
  open,
  elapsedMs,
  defaultCategory,
  defaultPieceIds,
  onClose,
  onSave,
  onDiscard,
}: {
  open: boolean;
  elapsedMs: number;
  defaultCategory: CategoryId;
  defaultPieceIds: string[];
  onClose: () => void;
  onSave: (payload: FinishPayload) => void;
  onDiscard: () => void;
}) {
  const pieces = useStore((s) => s.pieces);
  const [category, setCategory] = useState<CategoryId>(defaultCategory);
  const [pieceIds, setPieceIds] = useState<string[]>(defaultPieceIds);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  // Re-seed the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setCategory(defaultCategory);
      setPieceIds(defaultPieceIds);
      setNotes("");
      setRating(null);
    }
  }, [open, defaultCategory, defaultPieceIds]);

  const availablePieces = pieces.filter((p) => !p.archived);
  const togglePiece = (id: string) =>
    setPieceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Finish session"
      description="Log what you worked on while it's fresh."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="danger" onClick={onDiscard}>
            Discard
          </Button>
          <div className="flex gap-2">
            <Button variant="subtle" onClick={onClose}>
              Keep going
            </Button>
            <Button
              variant="primary"
              data-autofocus
              onClick={() => onSave({ category, pieceIds, notes, rating })}
            >
              Save session
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center rounded-xl bg-inset py-6">
          <span className="font-fine tabnum text-5xl font-medium text-accent">
            {formatClock(elapsedMs)}
          </span>
          <span className="mt-1 text-[11px] text-sub">practiced</span>
        </div>

        <Field label="Focus">
          <div className="pt-1">
            <CategoryChips value={category} onChange={setCategory} />
          </div>
        </Field>

        {availablePieces.length > 0 && (
          <Field label="Pieces" hint="optional">
            <div className="pt-1">
              <PieceChips pieces={availablePieces} selected={pieceIds} onToggle={togglePiece} />
            </div>
          </Field>
        )}

        <Field label="Notes" hint="optional" htmlFor="finish-notes">
          <TextArea
            id="finish-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on? What to fix next time?"
            rows={3}
          />
        </Field>

        <Field label="How did it feel">
          <div className="pt-1">
            <RatingInput value={rating} onChange={setRating} />
          </div>
        </Field>
      </div>
    </Modal>
  );
}
