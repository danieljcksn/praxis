"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { CategoryId, Session } from "@/lib/types";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextField, TextArea } from "@/components/ui/Field";
import { RatingInput } from "@/components/ui/Rating";
import { CategoryChips } from "@/components/timer/CategoryChips";
import { PieceChips } from "@/components/timer/PieceChips";

const pad = (n: number) => String(n).padStart(2, "0");
const toDateValue = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toTimeValue = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export function SessionDialog({
  open,
  session,
  onClose,
}: {
  open: boolean;
  session: Session | null;
  onClose: () => void;
}) {
  const pieces = useStore((s) => s.pieces);
  const addManualSession = useStore((s) => s.addManualSession);
  const updateSession = useStore((s) => s.updateSession);
  const deleteSession = useStore((s) => s.deleteSession);

  const isEdit = session != null;
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [minutes, setMinutes] = useState(30);
  const [category, setCategory] = useState<CategoryId>("repertoire");
  const [pieceIds, setPieceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    const base = session?.startedAt ?? Date.now();
    setDate(toDateValue(base));
    setTime(toTimeValue(session ? base : new Date().setHours(18, 0, 0, 0)));
    setMinutes(session ? Math.max(1, Math.round(session.durationMs / 60000)) : 30);
    setCategory(session?.category ?? "repertoire");
    setPieceIds(session?.pieceIds ?? []);
    setNotes(session?.notes ?? "");
    setRating(session?.rating ?? null);
  }, [open, session]);

  const availablePieces = pieces.filter((p) => !p.archived || pieceIds.includes(p.id));
  const togglePiece = (id: string) =>
    setPieceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const valid = date !== "" && minutes > 0;

  const handleSave = () => {
    if (!valid) return;
    // Never let a hand-typed future date land in the log — it would inflate
    // today/week/month rollups.
    const startedAt = Math.min(Date.now(), new Date(`${date}T${time || "18:00"}`).getTime());
    const durationMs = minutes * 60000;
    if (isEdit && session) {
      updateSession(session.id, { startedAt, durationMs, category, pieceIds, notes, rating });
      toast.success("Session updated");
    } else {
      addManualSession({ startedAt, durationMs, category, pieceIds, notes, rating });
      toast.success("Session logged");
    }
    onClose();
  };

  const handleDelete = () => {
    if (!session) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteSession(session.id);
    toast.show("Session deleted");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit session" : "Log a session"}
      description={isEdit ? undefined : "Add practice you did away from the timer."}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          {isEdit ? (
            <Button variant="danger" onClick={handleDelete}>
              {confirmDelete ? "Confirm delete" : "Delete"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!valid}>
              {isEdit ? "Save" : "Log session"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="session-date">
            <TextField
              id="session-date"
              type="date"
              value={date}
              max={toDateValue(Date.now())}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Start time" hint="optional" htmlFor="session-time">
            <TextField
              id="session-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Duration" hint="minutes" htmlFor="session-minutes">
          <div className="flex flex-wrap items-center gap-2">
            <TextField
              id="session-minutes"
              type="number"
              min={1}
              inputMode="numeric"
              value={minutes}
              onChange={(e) => {
                const n = Number(e.target.value);
                setMinutes(Number.isFinite(n) ? Math.min(1440, Math.max(0, Math.round(n))) : 0);
              }}
              className="w-24"
            />
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={minutes === m}
                  onClick={() => setMinutes(m)}
                  className={cn(
                    "h-8 rounded-md border px-2.5 text-[12px] tabnum transition-colors duration-150",
                    minutes === m
                      ? "border-accent/40 bg-accent/12 text-text"
                      : "border-border text-sub hover:border-border-strong hover:text-text",
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </Field>

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

        <Field label="Notes" hint="optional" htmlFor="session-notes">
          <TextArea
            id="session-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on?"
            rows={2}
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
