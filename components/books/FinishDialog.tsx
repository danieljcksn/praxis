"use client";

import { useEffect, useMemo, useState } from "react";
import type { Book } from "@/lib/types";
import { finishedBooks } from "@/lib/books";
import { useStore } from "@/lib/store";
import { fromDayKey, toDayKey } from "@/lib/time";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, inputClass } from "@/components/ui/Field";
import { BOOK_RATING_LABELS, RatingInput } from "@/components/ui/Rating";
import { Cover } from "./Cover";

/** The count, said once, in the serif.
 *
 *  This is the entire celebration. No confetti, no badge, no achievement, no
 *  streak escalation, no sound — the reward is a fact, stated plainly, and it
 *  survives `prefers-reduced-motion` switching every animation off, which is
 *  the test of whether it was ever a reward or just movement. */
function milestone(book: Book, books: Book[]): string {
  const finished = finishedBooks(books);
  const year = new Date(book.finishedAt ?? Date.now()).getFullYear();
  const thisYear = finished.filter((entry) => new Date(entry.finishedAt).getFullYear() === year);
  const count = thisYear.length;

  const previousBest = finished
    .filter((entry) => new Date(entry.finishedAt).getFullYear() < year)
    .reduce((best, entry) => {
      const entryYear = new Date(entry.finishedAt).getFullYear();
      best.set(entryYear, (best.get(entryYear) ?? 0) + 1);
      return best;
    }, new Map<number, number>());
  const record = Math.max(0, ...previousBest.values());

  if (count === 1) return "The first of the year.";
  if (record > 0 && count > record) return `Book ${count} — a new best.`;
  return `Book ${count} this year.`;
}

/** Opened *after* the finish has already been written.
 *
 *  That order is the design: the book is finished before anything appears on
 *  screen, so this panel can be skipped, ignored or escaped with nothing
 *  lost. It is a capture moment, not a gate. */
export function FinishDialog({
  book,
  onClose,
}: {
  book: Book | null;
  onClose: () => void;
}) {
  const books = useStore((s) => s.books);
  const updateBook = useStore((s) => s.updateBook);

  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [day, setDay] = useState(() => toDayKey(Date.now()));

  useEffect(() => {
    if (!book) return;
    setRating(book.rating);
    setNotes(book.notes);
    setDay(toDayKey(book.finishedAt ?? Date.now()));
  }, [book]);

  // Frozen on open: the store changes underneath as the reader types, and the
  // headline must not renumber itself mid-sentence.
  const line = useMemo(() => (book ? milestone(book, books) : ""), [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!book) return null;

  const save = () => {
    updateBook(book.id, {
      rating,
      notes: notes.trim(),
      // You finish a book on the train and log it that night. A system that
      // can't express that is lying about your reading.
      finishedAt: fromDayKey(day) ?? book.finishedAt ?? Date.now(),
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={() => {
        // The state change is already committed, so leaving is safe — but
        // silence here would read as "did that work?".
        toast.show(`Marked ${book.title} finished`);
        onClose();
      }}
      title={`Finished — ${book.title}`}
      size="lg"
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Skip
          </Button>
          <Button variant="primary" data-autofocus onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p
          className={cn(
            "font-display text-display-sm text-mint",
            "animate-[praxis-enter_var(--dur-page)_var(--ease-out)_both]",
          )}
          role="status"
        >
          {line}
        </p>

        <div className="flex gap-5">
          <Cover
            book={book}
            size="M"
            quiet={false}
            priority
            className="w-24 shrink-0 animate-[praxis-ring_var(--dur-page)_var(--ease-out)_both]"
          />

          <div className="min-w-0 flex-1 space-y-4">
            <Field label="How was it" hint="optional">
              <div className="pt-1">
                <RatingInput value={rating} onChange={setRating} labels={BOOK_RATING_LABELS} />
              </div>
            </Field>

            <Field label="Finished on" htmlFor="finish-date">
              <input
                id="finish-date"
                type="date"
                value={day}
                max={toDayKey(Date.now())}
                onChange={(event) => setDay(event.target.value)}
                className={cn(inputClass, "h-10 tabnum")}
              />
            </Field>
          </div>
        </div>

        <Field label="What stays with you" hint="optional" htmlFor="finish-notes">
          <TextArea
            id="finish-notes"
            maxLength={4000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="A line, a passage, an argument you're still turning over…"
            rows={4}
          />
        </Field>
      </div>
    </Modal>
  );
}
