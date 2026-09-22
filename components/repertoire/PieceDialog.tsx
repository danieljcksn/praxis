"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useArmedConfirm } from "@/lib/hooks/useArmedConfirm";
import type { Piece, PieceStatus } from "@/lib/types";
import { PIECE_STATUSES } from "@/lib/pieces";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextField, TextArea } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";

const EMPTY = {
  title: "",
  composer: "",
  status: "learning" as PieceStatus,
  difficulty: null as number | null,
  notes: "",
  archived: false,
};

export function PieceDialog({
  open,
  piece,
  onClose,
}: {
  open: boolean;
  piece: Piece | null;
  onClose: () => void;
}) {
  const addPiece = useStore((s) => s.addPiece);
  const updatePiece = useStore((s) => s.updatePiece);
  const deletePiece = useStore((s) => s.deletePiece);

  const [form, setForm] = useState(EMPTY);
  const isEdit = piece != null;

  const confirmDeleteAction = useCallback(() => {
    if (!piece) return;
    deletePiece(piece.id);
    toast.show("Piece deleted");
    onClose();
  }, [piece, deletePiece, onClose]);

  const del = useArmedConfirm(confirmDeleteAction, open ? (piece?.id ?? "new") : null);

  useEffect(() => {
    if (!open) return;
    setForm(
      piece
        ? {
            title: piece.title,
            composer: piece.composer,
            status: piece.status,
            difficulty: piece.difficulty,
            notes: piece.notes,
            archived: piece.archived,
          }
        : EMPTY,
    );
  }, [open, piece]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSave = form.title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (isEdit && piece) {
      updatePiece(piece.id, { ...form, title: form.title.trim(), composer: form.composer.trim() });
      toast.success("Piece updated");
    } else {
      addPiece(form);
      toast.success("Piece added");
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit piece" : "Add a piece"}
      description={isEdit ? undefined : "Something you're learning or want to learn."}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          {isEdit ? (
            <Button variant="danger" size="sm" onClick={del.trigger}>
              {del.armed ? "Confirm delete" : "Delete"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!canSave}>
              {isEdit ? "Save" : "Add piece"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="piece-title">
            <TextField
              id="piece-title"
              data-autofocus
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Asturias (Leyenda)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) handleSave();
              }}
            />
          </Field>
          <Field label="Composer" htmlFor="piece-composer">
            <TextField
              id="piece-composer"
              value={form.composer}
              onChange={(e) => set("composer", e.target.value)}
              placeholder="Isaac Albéniz"
            />
          </Field>
        </div>

        <Field label="Status">
          <div className="flex flex-wrap gap-2 pt-1">
            {PIECE_STATUSES.map((s) => {
              const active = form.status === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("status", s.id)}
                  aria-pressed={active}
                  title={s.blurb}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-[130ms]",
                    active
                      ? "border-transparent text-text"
                      : "border-border text-sub hover:border-border-strong hover:text-text",
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: `color-mix(in srgb, ${s.color} 13%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Difficulty" hint="optional">
          <div className="flex items-center gap-2 pt-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = form.difficulty != null && n <= form.difficulty;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`Difficulty ${n}`}
                  aria-pressed={active}
                  onClick={() => set("difficulty", form.difficulty === n ? null : n)}
                  className={cn(
                    "h-7 w-7 rounded-md border text-sm tabnum transition-colors duration-[130ms]",
                    active
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-border text-sub hover:border-border-strong hover:text-text",
                  )}
                >
                  {n}
                </button>
              );
            })}
            {form.difficulty != null && (
              <button
                type="button"
                onClick={() => set("difficulty", null)}
                className="ml-1 text-mini text-sub transition-colors hover:text-text"
              >
                clear
              </button>
            )}
          </div>
        </Field>

        <Field label="Notes" hint="optional" htmlFor="piece-notes">
          <TextArea
            id="piece-notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Tricky passages, fingerings, tempo goals…"
            rows={3}
          />
        </Field>

        {isEdit && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm text-text">Archive</p>
              <p className="text-mini text-sub">Hide from the timer picker without deleting.</p>
            </div>
            <Switch
              checked={form.archived}
              onChange={(v) => set("archived", v)}
              ariaLabel="Archive this piece"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
