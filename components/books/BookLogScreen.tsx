"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { Book, ReadingEvent } from "@/lib/types";
import { formatAmount } from "@/lib/books";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatRelativeDay, startOfDay, toDayKey } from "@/lib/time";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BOOK_RATING_LABELS, RatingDots } from "@/components/ui/Rating";
import { Select } from "@/components/ui/Field";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { Cover } from "./Cover";

const PAGE = 45;

type Entry =
  | { kind: "read"; at: number; book: Book | undefined; event: ReadingEvent }
  | { kind: "finished"; at: number; book: Book };

interface DayGroup {
  key: string;
  date: number;
  amount: number;
  /** null when the day mixes pages and minutes, which is the one case where
   *  a single total genuinely has no unit. */
  unit: "pages" | "minutes" | null;
  entries: Entry[];
}

/** The chronological record — the reading counterpart of /history.
 *
 *  Finishes are woven into the same feed as ordinary days rather than given
 *  their own page, because the point of scrolling a year of reading is to see
 *  where the endings fell among the evenings. */
export function BookLogScreen() {
  const hydrated = useHydrated();
  const books = useStore((s) => s.books);
  const readingEvents = useStore((s) => s.readingEvents);

  const [bookFilter, setBookFilter] = useState("all");
  const [visibleDays, setVisibleDays] = useState(PAGE);

  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);

  const groups = useMemo(() => {
    const entries: Entry[] = [];
    for (const event of readingEvents) {
      if (bookFilter !== "all" && event.bookId !== bookFilter) continue;
      entries.push({ kind: "read", at: event.at, book: byId.get(event.bookId), event });
    }
    for (const book of books) {
      if (book.finishedAt == null) continue;
      if (bookFilter !== "all" && book.id !== bookFilter) continue;
      entries.push({ kind: "finished", at: book.finishedAt, book });
    }

    const map = new Map<string, DayGroup>();
    for (const entry of entries) {
      const key = toDayKey(entry.at);
      let group = map.get(key);
      if (!group) {
        group = { key, date: startOfDay(entry.at), amount: 0, unit: null, entries: [] };
        map.set(key, group);
      }
      if (entry.kind === "read") {
        group.amount += entry.event.to - entry.event.from;
        const unit = entry.book?.format === "audio" ? "minutes" : "pages";
        group.unit = group.entries.some((e) => e.kind === "read") && group.unit !== unit
          ? null
          : unit;
      }
      group.entries.push(entry);
    }

    const list = [...map.values()].sort((a, b) => b.date - a.date);
    // A finish is the day's headline, so it leads the day it happened on.
    for (const group of list) {
      group.entries.sort((a, b) => (a.kind === "finished" ? -1 : b.kind === "finished" ? 1 : 0));
    }
    return list;
  }, [readingEvents, books, byId, bookFilter]);

  const totalEntries = useMemo(
    () => groups.reduce((sum, group) => sum + group.entries.length, 0),
    [groups],
  );

  if (!hydrated) return <LogSkeleton />;

  const shown = groups.slice(0, visibleDays);

  return (
    <div>
      <PageHeader
        eyebrow="Reading"
        tone="book"
        title="Log"
        subtitle={
          totalEntries === 0
            ? "Every page you record lands here."
            : `${totalEntries} ${totalEntries === 1 ? "entry" : "entries"} across ${groups.length} ${groups.length === 1 ? "day" : "days"}`
        }
        action={
          books.length > 0 && (
            <Select
              aria-label="Filter by book"
              value={bookFilter}
              onChange={(event) => {
                setBookFilter(event.target.value);
                setVisibleDays(PAGE);
              }}
              className="w-auto max-w-[16rem]"
            >
              <option value="all">Every book</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </Select>
          )
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing logged yet"
          description="Every time you move a bookmark, the day and the pages land here — and the grids and pace figures are built from it."
          action={
            <ButtonLink href="/books" variant="primary">
              Go to the library
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="space-y-6">
            {shown.map((group) => (
              <section key={group.key}>
                <div className="sticky top-16 z-10 -mx-4 mb-2 flex items-baseline justify-between gap-3 bg-bg/85 px-4 py-2 backdrop-blur-xl">
                  <h2 className="eyebrow text-sub">{formatRelativeDay(group.date)}</h2>
                  {group.amount > 0 && (
                    <span className="text-micro tabnum text-sub">
                      {group.unit === "minutes"
                        ? `${group.amount} min`
                        : group.unit === "pages"
                          ? `${group.amount} pages`
                          : group.amount}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {group.entries.map((entry) => (
                    <LogEntry
                      key={entry.kind === "read" ? entry.event.id : `finished-${entry.book.id}`}
                      entry={entry}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {groups.length > shown.length && (
            <div className="mt-8 flex justify-center">
              <Button variant="subtle" onClick={() => setVisibleDays((n) => n + PAGE)}>
                Show earlier days
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LogEntry({ entry }: { entry: Entry }) {
  const book = entry.book;

  // An entry whose book was deleted still has to render, or the day's total
  // would not add up against the rows beneath it.
  if (!book) {
    return (
      <div className="flex h-12 items-center gap-3 rounded-md px-2.5 text-mini italic text-sub">
        <span className="h-9 w-6 shrink-0 rounded-sm bg-inset" aria-hidden />
        Deleted book · {entry.kind === "read" ? entry.event.to - entry.event.from : 0}
      </div>
    );
  }

  const finished = entry.kind === "finished";

  return (
    <Link
      href={`/books/${book.id}`}
      className={cn(
        "group flex h-12 items-center gap-3 rounded-md px-2.5",
        "transition-colors duration-[130ms] ease-out",
        finished ? "bg-mint/[0.05] hover:bg-mint/[0.09]" : "hover:bg-soft",
      )}
    >
      <Cover book={book} className="w-6 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm text-text">
        {finished ? (
          <>
            <span className="font-medium">Finished</span> {book.title}
          </>
        ) : (
          <>
            <span className="tabnum">
              {formatAmount(book.format, entry.event.to - entry.event.from)}
            </span>{" "}
            <span className="text-sub">of</span> {book.title}
          </>
        )}
      </span>
      <span className="shrink-0 text-right text-micro tabnum text-sub">
        {finished ? (
          book.rating != null ? (
            <RatingDots value={book.rating} labels={BOOK_RATING_LABELS} />
          ) : (
            book.length != null && `${book.length} pp`
          )
        ) : (
          `${entry.event.from} → ${entry.event.to}`
        )}
      </span>
    </Link>
  );
}

function LogSkeleton() {
  return (
    <SkeletonScreen label="Loading your reading log">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" delay={40} />
          <Skeleton className="h-4 w-52" delay={60} />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" delay={80} />
      </div>
      <div className="space-y-6">
        {[0, 1, 2].map((group) => (
          <div key={group}>
            <Skeleton className="mb-2 h-3 w-24" delay={120 + group * 80} />
            <div className="space-y-1">
              {[0, 1, 2].map((row) => (
                <Skeleton
                  key={row}
                  className="h-12 w-full rounded-md"
                  delay={140 + group * 80 + row * 25}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
