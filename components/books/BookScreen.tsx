"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Pencil, Trash2 } from "lucide-react";
import type { Book, BookStatus, ReadingEvent } from "@/lib/types";
import {
  BOOK_STATUSES,
  bookPace,
  formatAmount,
  formatPosition,
  getBookStatus,
  progressOf,
  unitOf,
} from "@/lib/books";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatDate, formatRelativeDay, startOfDay, toDayKey } from "@/lib/time";
import { cn } from "@/lib/cn";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { BOOK_RATING_LABELS, RatingInput } from "@/components/ui/Rating";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { TextArea, inputBase } from "@/components/ui/Field";
import { BookDialog } from "./BookDialog";
import { Cover } from "./Cover";
import { FinishDialog } from "./FinishDialog";
import { ProgressStepper } from "./ProgressStepper";

export function BookScreen({ id }: { id: string }) {
  const hydrated = useHydrated();
  const cloudStatus = useStore((s) => s.cloudStatus);
  const book = useStore((s) => s.books.find((candidate) => candidate.id === id));
  const allEvents = useStore((s) => s.readingEvents);
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn);
  const setBookStatus = useStore((s) => s.setBookStatus);
  const updateBook = useStore((s) => s.updateBook);

  const [editing, setEditing] = useState(false);
  const [finishing, setFinishing] = useState<Book | null>(null);
  const [expanded, setExpanded] = useState(false);

  const events = useMemo(
    () => allEvents.filter((event) => event.bookId === id).sort((a, b) => b.at - a.at),
    [allEvents, id],
  );

  /** A twelve-month grid for a book read over three weeks is 95% empty and
   *  reads as missing data rather than as a short read. The window is the
   *  book's own span, rounded up to whole weeks — with a half-year floor so
   *  it still has the presence of the grids everywhere else in the app, and
   *  the usual 52-week ceiling above it. */
  const weeks = useMemo(() => {
    if (events.length === 0) return 26;
    const first = Math.min(...events.map((event) => event.at));
    const last = Math.max(Date.now(), ...events.map((event) => event.at));
    const days = Math.round((startOfDay(last) - startOfDay(first)) / 86_400_000) + 1;
    return Math.min(52, Math.max(26, Math.ceil(days / 7) + 1));
  }, [events]);

  const values = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      const delta = event.to - event.from;
      if (delta > 0) map.set(toDayKey(event.at), (map.get(toDayKey(event.at)) ?? 0) + delta);
    }
    return map;
  }, [events]);

  if (!hydrated) return <BookSkeleton />;

  // A 404 for a book you own is unforgivable, and a hard load can arrive
  // before the cloud pull lands — so the miss waits for sync to settle and
  // then explains itself rather than throwing a not-found.
  if (!book) {
    if (cloudStatus === "idle" || cloudStatus === "syncing") return <BookSkeleton />;
    return (
      <EmptyState
        icon={BookOpen}
        title="That book isn't in your library"
        description="It may have been deleted, or this link came from a device that hasn't synced yet."
        action={
          <ButtonLink href="/books" variant="primary">
            Back to the library
          </ButtonLink>
        }
      />
    );
  }

  const meta = getBookStatus(book.status);
  const percent = progressOf(book);
  const pace = bookPace(book, events);
  const unit = unitOf(book.format);
  const totalRead = events.reduce((sum, event) => sum + (event.to - event.from), 0);
  const description = book.description;
  const details: Array<[string, string]> = [
    ["Format", book.format === "paper" ? "Paper" : book.format === "ebook" ? "Ebook" : "Audio"],
    book.length != null
      ? [unit === "pages" ? "Pages" : "Length", formatPosition(book.format, book.length).replace("p. ", "")]
      : null,
    book.publishedYear != null ? ["Published", String(book.publishedYear)] : null,
    book.startedAt != null ? ["Started", formatDate(book.startedAt)] : null,
    book.finishedAt != null ? ["Finished", formatDate(book.finishedAt)] : null,
    book.isbn ? ["ISBN", book.isbn] : null,
  ].filter((row): row is [string, string] => row !== null);

  return (
    <div>
      <Link
        href="/books"
        className="mb-5 inline-flex items-center gap-1.5 rounded-sm text-mini text-sub transition-colors duration-[130ms] hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Library
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {/* Cropping is right on a shelf and vandalism here, where the
              artwork is the subject rather than a tile in a wall. */}
          <Cover
            book={book}
            size="L"
            natural
            quiet={false}
            priority
            className="mx-auto w-full max-w-[15rem] sm:mx-0"
          />

          <div className="mt-5 flex flex-wrap gap-1.5">
            {BOOK_STATUSES.map((option) => {
              const active = book.status === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  title={option.blurb}
                  onClick={() => {
                    if (active) return;
                    if (option.id === "finished") {
                      setBookStatus(book.id, "finished");
                      setFinishing(book);
                      return;
                    }
                    setBookStatus(book.id, option.id as BookStatus);
                  }}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-full border px-3 text-mini",
                    "transition-colors duration-[130ms] ease-out",
                    active
                      ? "border-transparent text-text"
                      : "border-border text-sub hover:border-border-strong hover:text-text",
                  )}
                  style={
                    active
                      ? { backgroundColor: `color-mix(in srgb, ${option.color} 13%, transparent)` }
                      : undefined
                  }
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: option.color }}
                    aria-hidden
                  />
                  {option.label}
                </button>
              );
            })}
          </div>

          <dl className="mt-5 space-y-2 border-t border-border pt-5">
            {details.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-micro text-sub">{label}</dt>
                <dd className="truncate text-mini tabnum text-sub-strong">{value}</dd>
              </div>
            ))}
          </dl>

          {book.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {book.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-book/15 bg-book/8 px-2.5 py-0.5 text-micro text-book"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-1">
            <Button variant="subtle" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="mb-6">
            <p className="eyebrow mb-2.5 text-book">{meta.label}</p>
            <h1 className="font-display text-display text-text">{book.title}</h1>
            {(book.subtitle || book.author) && (
              <p className="mt-2 text-sm text-sub">
                {[book.subtitle, book.author].filter(Boolean).join(" · ")}
              </p>
            )}
          </header>

          <Card className="mb-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-display text-display-sm tabnum text-text">
                {formatPosition(book.format, book.position)}
                {book.length != null && (
                  <span className="text-title-lg text-sub"> / {book.length}</span>
                )}
              </p>
              {percent != null && (
                <p className="text-mini tabnum text-sub">{Math.round(percent * 100)}%</p>
              )}
            </div>

            <Progress
              className="mt-3"
              percent={(percent ?? 0) * 100}
              tone={book.status === "finished" ? "mint" : "book"}
              label={`Progress through ${book.title}`}
              valueText={
                percent != null
                  ? `${formatAmount(book.format, book.position)} of ${book.length}, ${Math.round(percent * 100)} percent`
                  : formatAmount(book.format, book.position)
              }
            />

            <p className="mt-2.5 text-mini text-sub">
              {[
                book.startedAt != null && `Started ${formatDate(book.startedAt)}`,
                pace &&
                  `${pace.perDay >= 10 ? Math.round(pace.perDay) : pace.perDay.toFixed(1)} ${unit}/day`,
                pace?.daysLeft != null &&
                  book.status !== "finished" &&
                  `about ${pace.daysLeft} ${pace.daysLeft === 1 ? "day" : "days"} left`,
                book.length == null && "No length set — add one for pace and percent",
              ]
                .filter(Boolean)
                .join(" · ") || "Not started yet"}
            </p>

            {book.status !== "finished" ? (
              <ProgressStepper
                book={book}
                events={events}
                className="mt-4"
                onFinish={() => {
                  setBookStatus(book.id, "finished");
                  setFinishing(book);
                }}
              />
            ) : (
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <Check className="h-4 w-4 shrink-0 text-mint" aria-hidden />
                <span className="text-sm text-sub">
                  Finished {book.finishedAt != null ? formatRelativeDay(book.finishedAt) : ""}
                </span>
                <div className="ml-auto">
                  <RatingInput
                    size="sm"
                    value={book.rating}
                    labels={BOOK_RATING_LABELS}
                    onChange={(rating) => updateBook(book.id, { rating })}
                  />
                </div>
              </div>
            )}
          </Card>

          {description && (
            <div className="mb-6">
              <p className={cn("text-sm leading-relaxed text-sub", !expanded && "line-clamp-3")}>
                {description}
              </p>
              {description.length > 200 && (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="mt-1.5 text-mini text-sub-strong transition-colors duration-[130ms] hover:text-text"
                >
                  {expanded ? "Less" : "More"}
                </button>
              )}
            </div>
          )}

          <Card className="mb-4">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow mb-2 text-book">
                  {weeks >= 52 ? "The last 12 months" : `The last ${weeks} weeks`}
                </p>
                <h2 className="text-title text-text">Days with this book</h2>
              </div>
              {totalRead > 0 && (
                <span className="text-mini tabnum text-sub">
                  {formatAmount(book.format, totalRead)} logged
                </span>
              )}
            </div>
            {events.length > 0 ? (
              <ContributionGrid
                values={values}
                color="var(--color-book)"
                label={`Reading ${book.title}`}
                weeks={weeks}
                weekStartsOn={weekStartsOn}
                valueLabel={(value) => formatAmount(book.format, value)}
              />
            ) : (
              <p className="py-6 text-center text-sm text-sub">
                Nothing logged yet — the grid fills in as you read.
              </p>
            )}
          </Card>

          <Card className="mb-4">
            <h2 className="text-title text-text">Your notes</h2>
            <p className="mt-1 text-sm text-sub">
              Quotes, arguments, who pressed it on you, why you stopped.
            </p>
            <TextArea
              className="mt-4"
              rows={5}
              // The store's sanitizer clamps notes on every load; enforcing
              // the same ceiling here means it never has anything to cut.
              maxLength={4000}
              value={book.notes}
              aria-label={`Notes on ${book.title}`}
              placeholder="Nothing yet."
              onChange={(event) => updateBook(book.id, { notes: event.target.value })}
            />
          </Card>

          {events.length > 0 && (
            <Card>
              <h2 className="text-title text-text">Reading log</h2>
              <p className="mt-1 text-sm text-sub">
                One row per day. Correct a mistyped {unit === "pages" ? "page" : "minute"} here.
              </p>
              <div className="mt-4 space-y-1">
                {events.map((event) => (
                  <LogRow key={event.id} event={event} book={book} />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <BookDialog book={book} open={editing} onClose={() => setEditing(false)} />
      <FinishDialog book={finishing} onClose={() => setFinishing(null)} />
    </div>
  );
}

/** One day of reading, and the place to fix it.
 *
 *  The same-day record is adjusted automatically as you step, so only an
 *  older mistake needs this — which is why editing is a click away rather
 *  than always on screen. */
function LogRow({ event, book }: { event: ReadingEvent; book: Book }) {
  const updateReadingEvent = useStore((s) => s.updateReadingEvent);
  const deleteReadingEvent = useStore((s) => s.deleteReadingEvent);
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState(String(event.from));
  const [to, setTo] = useState(String(event.to));

  const commit = () => {
    const nextFrom = Number.parseInt(from, 10);
    const nextTo = Number.parseInt(to, 10);
    updateReadingEvent(event.id, {
      from: Number.isFinite(nextFrom) ? nextFrom : event.from,
      to: Number.isFinite(nextTo) ? nextTo : event.to,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-soft px-2.5 py-2">
        <span className="w-24 shrink-0 text-mini tabnum text-sub">
          {formatDate(event.at)}
        </span>
        <input
          value={from}
          inputMode="numeric"
          aria-label="From"
          onChange={(e) => setFrom(e.target.value.replace(/[^\d]/g, ""))}
          className={cn(inputBase, "h-8 w-16 px-2 text-center text-mini tabnum")}
        />
        <span className="text-mini text-sub" aria-hidden>
          →
        </span>
        <input
          value={to}
          inputMode="numeric"
          aria-label="To"
          autoFocus
          onChange={(e) => setTo(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className={cn(inputBase, "h-8 w-16 px-2 text-center text-mini tabnum")}
        />
        <Button size="sm" variant="primary" onClick={commit} className="ml-auto">
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-4 rounded-md px-2.5 py-1.5 transition-colors duration-[130ms] hover:bg-soft">
      <span className="w-20 shrink-0 text-mini tabnum text-sub">{formatDate(event.at)}</span>
      <span className="w-28 shrink-0 text-mini tabnum text-sub-strong">
        {event.from} → {event.to}
      </span>
      <span className="min-w-0 flex-1 truncate text-mini tabnum text-sub">
        {formatAmount(book.format, event.to - event.from)}
      </span>
      <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-[130ms] group-hover:opacity-100 group-focus-within:opacity-100">
        <IconButton
          size="sm"
          label="Edit this entry"
          onClick={() => {
            setFrom(String(event.from));
            setTo(String(event.to));
            setEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" aria-hidden />
        </IconButton>
        <IconButton
          size="sm"
          variant="danger"
          label="Delete this entry"
          onClick={() => deleteReadingEvent(event.id)}
        >
          <Trash2 className="h-3 w-3" aria-hidden />
        </IconButton>
      </span>
    </div>
  );
}

function BookSkeleton() {
  return (
    <SkeletonScreen label="Loading the book">
      <Skeleton className="mb-5 h-3 w-20" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div>
          <Skeleton className="aspect-[2/3] w-full max-w-[15rem] rounded-md" delay={40} />
          <Skeleton className="mt-5 h-8 w-full rounded-full" delay={80} />
        </div>
        <div>
          <Skeleton className="h-9 w-3/4" delay={120} />
          <Skeleton className="mt-3 h-4 w-1/2" delay={140} />
          <Skeleton className="mt-6 h-36 w-full rounded-lg" delay={180} />
          <Skeleton className="mt-4 h-[13rem] w-full rounded-lg" delay={220} />
        </div>
      </div>
    </SkeletonScreen>
  );
}
