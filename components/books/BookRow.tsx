"use client";

import Link from "next/link";
import type { Book, ReadingEvent } from "@/lib/types";
import { getBookStatus, progressOf } from "@/lib/books";
import { formatRelativeDay } from "@/lib/time";
import { cn } from "@/lib/cn";
import { StatusPill } from "@/components/ui/StatusPill";
import { BOOK_RATING_LABELS, RatingDots } from "@/components/ui/Rating";
import { Cover } from "./Cover";
import { PositionLabel, ProgressStepper } from "./ProgressStepper";

/** The shelf in list form: PieceCard's grammar with a jacket on the left.
 *
 *  This is where triage and bulk progress happen, which is why a reading row
 *  carries the stepper inline — at 98px a shelf cell cannot hold one honestly,
 *  and hiding it behind hover would make the most repeated action in the app
 *  invisible on touch. */
export function BookRow({
  book,
  events,
  lastRead,
  onFinish,
}: {
  book: Book;
  events: ReadingEvent[];
  lastRead: number | null;
  onFinish: () => void;
}) {
  const meta = getBookStatus(book.status);
  const percent = progressOf(book);
  const active = book.status === "reading" || book.status === "paused";

  return (
    <div
      className={cn(
        "group flex items-center gap-3.5 rounded-lg border border-border px-3 py-3",
        "transition-[background-color,border-color] duration-[130ms] ease-out",
        "hover:border-border-strong hover:bg-panel",
        book.status === "abandoned" ? "bg-transparent opacity-60" : "bg-panel/60",
      )}
    >
      <Link
        href={`/books/${book.id}`}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-md"
      >
        <Cover book={book} className="w-8 shrink-0" />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text" title={book.title}>
              {book.title}
            </span>
            <StatusPill label={meta.label} color={meta.color} blurb={meta.blurb} />
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-mini text-sub">
            <span className="truncate" title={book.author || undefined}>
              {book.author || book.subtitle || "—"}
            </span>
            {book.publishedYear != null && (
              <>
                <span className="text-border-strong" aria-hidden>
                  ·
                </span>
                <span className="shrink-0 tabnum">{book.publishedYear}</span>
              </>
            )}
          </span>
        </span>

        <span className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
          <span className="text-sm tabnum text-text">
            {book.status === "finished" && book.rating != null ? (
              <RatingDots value={book.rating} labels={BOOK_RATING_LABELS} />
            ) : (
              <PositionLabel book={book} />
            )}
          </span>
          <span className="text-micro tabnum text-sub">
            {percent != null && book.status !== "finished"
              ? `${Math.round(percent * 100)}%`
              : book.finishedAt != null
                ? formatRelativeDay(book.finishedAt)
                : lastRead
                  ? formatRelativeDay(lastRead)
                  : "not started"}
          </span>
        </span>
      </Link>

      {active && (
        <div className="hidden shrink-0 lg:block">
          <ProgressStepper book={book} events={events} size="sm" onFinish={onFinish} />
        </div>
      )}
    </div>
  );
}
