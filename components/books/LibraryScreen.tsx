"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, LayoutGrid, List, Plus, Search, X } from "lucide-react";
import type { Book, BookFormat, BookStatus, ReadingEvent } from "@/lib/types";
import {
  BOOK_FORMATS,
  BOOK_STATUSES,
  formatAmount,
  lastReadByBook,
  normalizeQuery,
  progressOf,
  searchKey,
} from "@/lib/books";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatRelativeDay, toDayKey } from "@/lib/time";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { Progress } from "@/components/ui/Progress";
import { Select, inputClass } from "@/components/ui/Field";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { AddBookDialog } from "./AddBookDialog";
import { BookCell } from "./BookCell";
import { BookRow } from "./BookRow";
import { Cover } from "./Cover";
import { FinishDialog } from "./FinishDialog";
import { ProgressStepper } from "./ProgressStepper";

type Sort = "recent" | "finished" | "added" | "title" | "author" | "longest" | "rating" | "year";
type StatusFilter = "all" | BookStatus;

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "recent", label: "Recently read" },
  { id: "finished", label: "Recently finished" },
  { id: "added", label: "Recently added" },
  { id: "title", label: "Title A–Z" },
  { id: "author", label: "Author A–Z" },
  { id: "longest", label: "Longest first" },
  { id: "rating", label: "Highest rated" },
  { id: "year", label: "Newest published" },
];

/** Number keys map to the chip row in the order it is printed. */
const CHIP_KEYS: StatusFilter[] = ["reading", "backlog", "finished", "paused", "abandoned"];

export function LibraryScreen() {
  const hydrated = useHydrated();
  const books = useStore((s) => s.books);
  const readingEvents = useStore((s) => s.readingEvents);
  const view = useStore((s) => s.settings.bookView);
  const updateSettings = useStore((s) => s.updateSettings);
  const setBookStatus = useStore((s) => s.setBookStatus);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [format, setFormat] = useState<BookFormat | "all">("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState<Book | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);

  const lastRead = useMemo(() => lastReadByBook(readingEvents), [readingEvents]);
  const eventsByBook = useMemo(() => {
    const map = new Map<string, typeof readingEvents>();
    for (const event of readingEvents) {
      const list = map.get(event.bookId);
      if (list) list.push(event);
      else map.set(event.bookId, [event]);
    }
    return map;
  }, [readingEvents]);

  const tags = useMemo(
    () => [...new Set(books.flatMap((book) => book.tags))].sort((a, b) => a.localeCompare(b)),
    [books],
  );

  /** Counted before the status filter is applied, so a chip's number always
   *  matches what pressing it will show. */
  const inScope = useMemo(() => {
    const query = normalizeQuery(search);
    return books.filter((book) => {
      if (format !== "all" && book.format !== format) return false;
      if (tag !== "all" && !book.tags.includes(tag)) return false;
      if (query && !searchKey(book).includes(query)) return false;
      return true;
    });
  }, [books, format, tag, search]);

  const counts = useMemo(() => {
    const map = new Map<StatusFilter, number>([["all", inScope.length]]);
    for (const book of inScope) map.set(book.status, (map.get(book.status) ?? 0) + 1);
    return map;
  }, [inScope]);

  const visible = useMemo(() => {
    const list = inScope.filter((book) => status === "all" || book.status === status);
    const read = (book: Book) => lastRead.get(book.id) ?? 0;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "finished":
          return (b.finishedAt ?? 0) - (a.finishedAt ?? 0);
        case "added":
          return b.addedAt - a.addedAt;
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return (a.author || "￿").localeCompare(b.author || "￿");
        case "longest":
          return (b.length ?? 0) - (a.length ?? 0);
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0) || b.addedAt - a.addedAt;
        case "year":
          return (b.publishedYear ?? 0) - (a.publishedYear ?? 0);
        case "recent":
        default:
          return (read(b) || b.addedAt) - (read(a) || a.addedAt);
      }
    });
  }, [inScope, status, sort, lastRead]);

  const open = useMemo(
    () =>
      books
        .filter((book) => book.status === "reading")
        .sort((a, b) => (lastRead.get(b.id) ?? b.addedAt) - (lastRead.get(a.id) ?? a.addedAt)),
    [books, lastRead],
  );

  const filtered = search.trim() !== "" || status !== "all" || format !== "all" || tag !== "all";
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setFormat("all");
    setTag("all");
  };

  const finish = useCallback(
    (book: Book) => {
      // Committed first, acknowledged second — so the panel that follows can
      // be escaped with nothing lost.
      setBookStatus(book.id, "finished");
      setFinishing(book);
    },
    [setBookStatus],
  );

  // Section shortcuts. Suppressed whenever something is being typed into or a
  // dialog is open, and deliberately chordless — praxis has no chord
  // vocabulary to build on.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Modal portals into document.body, so its keys bubble all the way to
      // window. Without this, "a" stacks a second dialog on the first and
      // "/" moves focus to the shelf search *behind* the overlay, outside
      // the dialog's own focus trap.
      if (document.querySelector('[aria-modal="true"]')) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        setAdding(true);
        return;
      }
      if (event.key.toLowerCase() === "v") {
        event.preventDefault();
        updateSettings({ bookView: view === "shelf" ? "list" : "shelf" });
        return;
      }
      if (event.key === "0") setStatus("all");
      const index = Number.parseInt(event.key, 10);
      if (index >= 1 && index <= CHIP_KEYS.length) setStatus(CHIP_KEYS[index - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [updateSettings, view]);

  // The shelf is one tab stop, not four hundred: exactly one cell is tabbable
  // and the arrows move which. The column count is read from the grid's own
  // resolved template rather than guessed from a breakpoint, so it stays
  // right through zoom and window resizing.
  const onGridKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const grid = gridRef.current;
    if (!grid || visible.length === 0) return;
    const columns = Math.max(
      1,
      window.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
    );

    const deltas: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
      PageDown: columns * 5,
      PageUp: -columns * 5,
    };

    let next: number | null = null;
    if (event.key in deltas) next = focusIndex + deltas[event.key];
    else if (event.key === "Home") next = event.ctrlKey || event.metaKey ? 0 : focusIndex - (focusIndex % columns);
    else if (event.key === "End")
      next =
        event.ctrlKey || event.metaKey
          ? visible.length - 1
          : Math.min(visible.length - 1, focusIndex - (focusIndex % columns) + columns - 1);
    if (next === null) return;

    event.preventDefault();
    const clamped = Math.min(visible.length - 1, Math.max(0, next));
    setFocusIndex(clamped);
    grid
      .querySelector<HTMLElement>(`[data-book-cell="${clamped}"]`)
      ?.focus({ preventScroll: false });
  };

  useEffect(() => {
    // Keep the roving index inside the list when a filter shrinks it.
    if (focusIndex > visible.length - 1) setFocusIndex(Math.max(0, visible.length - 1));
  }, [visible.length, focusIndex]);

  if (!hydrated) return <LibrarySkeleton />;

  const finishedCount = books.filter((book) => book.status === "finished").length;

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        tone="book"
        title="Reading"
        subtitle={
          books.length === 0
            ? "What you're reading, and what you mean to read."
            : `${books.length} ${books.length === 1 ? "book" : "books"} · ${open.length} in progress · ${finishedCount} finished`
        }
        action={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add book
          </Button>
        }
      />

      {books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nothing on the shelf yet"
          description="Add what you're reading and what you mean to read. Covers, page counts and publication years fill themselves in from the catalogue."
          action={
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add your first book
            </Button>
          }
        />
      ) : (
        <>
          {/* No prompt when nothing is open. An overview that asks you every
              morning why you aren't reading is the beginning of a guilt app. */}
          {open.length > 0 && (
            <div className="mb-7">
              {open.length === 1 ? (
                <OpenBookCard
                  book={open[0]}
                  events={eventsByBook.get(open[0].id) ?? []}
                  lastRead={lastRead.get(open[0].id) ?? null}
                  onFinish={() => finish(open[0])}
                />
              ) : open.length <= 3 ? (
                <div
                  className={cn(
                    "grid gap-3 sm:grid-cols-2",
                    // Three books earn a third column; two would just leave a
                    // hole in it and squeeze both steppers for no reason.
                    open.length === 3 && "xl:grid-cols-3",
                  )}
                >
                  {open.map((book) => (
                    <OpenBookCard
                      key={book.id}
                      compact
                      book={book}
                      events={eventsByBook.get(book.id) ?? []}
                      lastRead={lastRead.get(book.id) ?? null}
                      onFinish={() => finish(book)}
                    />
                  ))}
                </div>
              ) : (
                <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 max-sm:edge-fade-x sm:mx-0 sm:px-0">
                  {open.map((book) => (
                    <OpenBookCard
                      key={book.id}
                      compact
                      className="w-[17.5rem] shrink-0 snap-start"
                      book={book}
                      events={eventsByBook.get(book.id) ?? []}
                      lastRead={lastRead.get(book.id) ?? null}
                      onFinish={() => finish(book)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[12rem] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    if (search) setSearch("");
                    else event.currentTarget.blur();
                  }}
                  placeholder="Search your shelf"
                  aria-label="Search your shelf"
                  className={cn(inputClass, "h-10 pl-9", search && "pr-9")}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    title="Clear search"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-sub transition-colors duration-[130ms] hover:text-text"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>

              <Select
                aria-label="Sort books"
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="w-auto"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select
                aria-label="Filter by format"
                value={format}
                onChange={(event) => setFormat(event.target.value as BookFormat | "all")}
                className="w-auto"
              >
                <option value="all">Any format</option>
                {BOOK_FORMATS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>

              {/* Only offered once there is something to filter by. */}
              {tags.length > 0 && (
                <Select
                  aria-label="Filter by tag"
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  className="w-auto"
                >
                  <option value="all">Any tag</option>
                  {tags.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              )}

              <div
                className="inline-flex overflow-hidden rounded-md border border-border"
                role="radiogroup"
                aria-label="Shelf layout"
              >
                {([
                  ["shelf", "Shelf", LayoutGrid],
                  ["list", "List", List],
                ] as const).map(([value, label, Icon], index) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={view === value}
                    aria-label={label}
                    title={`${label} view`}
                    onClick={() => updateSettings({ bookView: value })}
                    className={cn(
                      "segment flex h-10 w-10 items-center justify-center transition-colors duration-[130ms] ease-out",
                      index > 0 && "border-l border-border",
                      view === value ? "bg-soft-strong text-text" : "text-sub hover:text-text",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </button>
                ))}
              </div>
            </div>

            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              <FilterChip
                active={status === "all"}
                count={counts.get("all") ?? 0}
                onClick={() => setStatus("all")}
              >
                All
              </FilterChip>
              {BOOK_STATUSES.map((meta) => (
                <FilterChip
                  key={meta.id}
                  active={status === meta.id}
                  // Want-to-read is the default state, so it gets no dot —
                  // FilterChip already renders a neutral one at half opacity.
                  color={meta.id === "backlog" ? undefined : meta.color}
                  count={counts.get(meta.id) ?? 0}
                  title={meta.blurb}
                  onClick={() => setStatus(meta.id)}
                >
                  {meta.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {visible.length} {visible.length === 1 ? "book" : "books"}
            {status !== "all" ? `, ${BOOK_STATUSES.find((s) => s.id === status)?.label}` : ""}
          </p>

          {visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
              <p className="text-sm text-sub">No books match these filters.</p>
              {search.trim() && (
                <Button variant="subtle" size="sm" className="mt-4" onClick={() => setAdding(true)}>
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  Search the catalogue instead
                </Button>
              )}
              {filtered && !search.trim() && (
                <Button variant="subtle" size="sm" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : view === "shelf" ? (
            <ul
              ref={gridRef}
              onKeyDown={onGridKeyDown}
              className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
            >
              {visible.map((book, index) => (
                <BookCell
                  key={book.id}
                  book={book}
                  index={index}
                  total={visible.length}
                  focusable={index === Math.min(focusIndex, visible.length - 1)}
                  onFocus={() => setFocusIndex(index)}
                />
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              {visible.map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  events={eventsByBook.get(book.id) ?? []}
                  lastRead={lastRead.get(book.id) ?? null}
                  onFinish={() => finish(book)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AddBookDialog open={adding} onClose={() => setAdding(false)} />
      <FinishDialog book={finishing} onClose={() => setFinishing(null)} />
    </div>
  );
}

/** A book that is open right now. Given the top of the page in one of three
 *  shapes chosen by how many there are, so the band is never a hole and never
 *  a wall — and never a separate route, because the thing you came for should
 *  be zero clicks away rather than one. */
function OpenBookCard({
  book,
  events,
  lastRead,
  onFinish,
  compact = false,
  className,
}: {
  book: Book;
  events: ReadingEvent[];
  lastRead: number | null;
  onFinish: () => void;
  compact?: boolean;
  className?: string;
}) {
  const percent = progressOf(book);
  const todayKey = toDayKey(Date.now());
  const today = events
    .filter((event) => toDayKey(event.at) === todayKey)
    .reduce((sum, event) => sum + (event.to - event.from), 0);

  return (
    <Card className={cn("flex gap-4", compact ? "p-4" : "p-5 sm:p-5", className)}>
      <Link href={`/books/${book.id}`} className="shrink-0 rounded-md">
        <Cover book={book} size={compact ? "M" : "L"} priority className={compact ? "w-16" : "w-24"} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="eyebrow text-book">Reading</p>
        <Link href={`/books/${book.id}`} className="mt-1.5 min-w-0 rounded-sm">
          <h2
            className={cn("truncate text-text", compact ? "text-lead font-medium" : "text-title")}
            title={book.title}
          >
            {book.title}
          </h2>
        </Link>
        <p className="mt-0.5 truncate text-mini text-sub">
          {book.author || book.subtitle || " "}
        </p>

        <div className="mt-auto pt-4">
          <Progress
            percent={(percent ?? 0) * 100}
            tone="book"
            label={`Progress through ${book.title}`}
            valueText={
              percent != null
                ? `${formatAmount(book.format, book.position)} of ${book.length}, ${Math.round(percent * 100)} percent`
                : formatAmount(book.format, book.position)
            }
          />
          <p className="mt-2 text-micro tabnum text-sub">
            {lastRead ? formatRelativeDay(lastRead) : "Not opened yet"}
            {today > 0 && ` · ${formatAmount(book.format, today)} today`}
            {percent != null && ` · ${Math.round(percent * 100)}%`}
          </p>
          <ProgressStepper
            book={book}
            events={events}
            size={compact ? "sm" : "md"}
            onFinish={onFinish}
            className="mt-3"
          />
        </div>
      </div>
    </Card>
  );
}

function LibrarySkeleton() {
  return (
    <SkeletonScreen label="Loading your library">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-40" delay={40} />
          <Skeleton className="h-4 w-56" delay={60} />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" delay={80} />
      </div>
      <Skeleton className="mb-7 h-[9.5rem] w-full rounded-lg" delay={120} />
      <div className="mb-5 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-md" delay={160} />
          <Skeleton className="h-10 w-40 rounded-md" delay={180} />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" delay={200 + i * 25} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[2/3] w-full rounded-md" delay={340 + Math.min(i, 10) * 30} />
            <Skeleton className="mt-2.5 h-3 w-full" delay={360 + Math.min(i, 10) * 30} />
            <Skeleton className="mt-1.5 h-2.5 w-2/3" delay={380 + Math.min(i, 10) * 30} />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
