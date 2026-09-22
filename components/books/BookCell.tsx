"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { Book } from "@/lib/types";
import { progressOf } from "@/lib/books";
import { cn } from "@/lib/cn";
import { Cover } from "./Cover";

/** One book on the shelf.
 *
 *  The cover carries exactly two badges for the life of this feature: a 3px
 *  reading hairline on its bottom edge, and a finished check. Ratings, page
 *  counts, formats and tags live in the caption or on the detail page — the
 *  moment a third badge lands on the artwork the wall becomes a dashboard.
 *
 *  It also does not scale on hover. A grid of tiles that inflate under the
 *  pointer is the streaming-service reflex and it turns a calm shelf into a
 *  fidget toy; two pixels of lift plus the card shadow reads as the book
 *  being taken down instead. */
export function BookCell({
  book,
  index,
  total,
  focusable,
  onFocus,
}: {
  book: Book;
  index: number;
  total: number;
  /** Exactly one cell in the grid is tabbable; arrows move which one. */
  focusable: boolean;
  onFocus: () => void;
}) {
  const percent = progressOf(book);
  const reading = book.status === "reading" || book.status === "paused";

  return (
    <li aria-posinset={index + 1} aria-setsize={total}>
      <Link
        href={`/books/${book.id}`}
        data-book-cell={index}
        tabIndex={focusable ? 0 : -1}
        onFocus={onFocus}
        className={cn(
          "group block rounded-md",
          "transition-[transform,box-shadow] duration-[130ms] ease-out",
          "hover:-translate-y-0.5 hover:shadow-card focus-visible:-translate-y-0.5",
          "active:scale-[0.985]",
        )}
      >
        <Cover
          book={book}
          className={cn(book.status === "abandoned" && "opacity-55 grayscale-[0.35]")}
        >
          {reading && percent != null && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-black/25">
              <span
                className={cn(
                  "block h-full transition-[width] duration-[280ms] ease-out",
                  book.status === "paused" ? "bg-status-polishing" : "bg-book",
                )}
                style={{ width: `${Math.max(2, percent * 100)}%` }}
              />
            </span>
          )}
          {book.status === "finished" && (
            // Filled rather than tinted: a translucent disc disappears
            // against a white jacket in the light palette, where covers
            // already sit at barely 1.1:1 against the page.
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-mint text-on-color shadow-control">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            </span>
          )}
        </Cover>

        <p
          className="mt-2.5 line-clamp-2 text-mini text-sub-strong transition-colors duration-[130ms] group-hover:text-text"
          title={book.title}
        >
          {book.title}
        </p>
        {/* A missing author is a gap you would fix, not a fact about the book,
            so it silently yields to the year rather than saying "Unknown". */}
        <p className="truncate text-micro text-sub">
          {book.author || (book.publishedYear ? String(book.publishedYear) : " ")}
        </p>
      </Link>
    </li>
  );
}
