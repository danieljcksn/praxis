import type { Book, BookFormat, BookStatus, ReadingEvent } from "./types";
import { addDays, startOfDay, toDayKey } from "./time";

// ── Vocabulary ───────────────────────────────────────────────────────────────
// Shaped exactly like lib/pieces.ts and lib/categories.ts: the colors are token
// references, never hex, so a shelf recolors with the rest of the app.

export interface BookStatusMeta {
  id: BookStatus;
  label: string;
  color: string;
  blurb: string;
}

/** Ordered the way a book travels, which is also the order the filter chips
 *  read in. `reading` is the only one that gets the domain hue — the rest
 *  borrow the muted status palette the repertoire already uses, so a shelf of
 *  mixed states stays as calm as a list of mixed pieces. */
export const BOOK_STATUSES: BookStatusMeta[] = [
  {
    id: "reading",
    label: "Reading",
    color: "var(--color-book)",
    blurb: "Open on the table right now",
  },
  {
    id: "backlog",
    label: "Want to read",
    color: "var(--color-status-backlog)",
    blurb: "On the pile, not started",
  },
  {
    id: "finished",
    label: "Finished",
    color: "var(--color-status-performance)",
    blurb: "Read to the end",
  },
  {
    id: "paused",
    label: "Paused",
    color: "var(--color-status-polishing)",
    blurb: "Set down, meant to return",
  },
  {
    id: "abandoned",
    label: "Abandoned",
    color: "var(--color-category-free)",
    blurb: "Stopped for good — and that's a decision, not a failure",
  },
];

const STATUS_MAP = BOOK_STATUSES.reduce(
  (acc, meta) => {
    acc[meta.id] = meta;
    return acc;
  },
  {} as Record<BookStatus, BookStatusMeta>,
);

export function getBookStatus(id: BookStatus): BookStatusMeta {
  return STATUS_MAP[id] ?? BOOK_STATUSES[0];
}

export const BOOK_FORMATS: Array<{ id: BookFormat; label: string; unit: string }> = [
  { id: "paper", label: "Paper", unit: "pages" },
  { id: "ebook", label: "Ebook", unit: "pages" },
  { id: "audio", label: "Audio", unit: "minutes" },
];

/** Audiobooks measure themselves in minutes; everything else in pages. This is
 *  the only behavioural consequence of `format`, and it is why `Book.length`
 *  and `Book.position` are named for neither unit. */
export function unitOf(format: BookFormat): "pages" | "minutes" {
  return format === "audio" ? "minutes" : "pages";
}

/** "p. 214" / "3h 24m". The one place a position becomes words. */
export function formatPosition(format: BookFormat, value: number): string {
  if (format !== "audio") return `p. ${Math.round(value)}`;
  const total = Math.max(0, Math.round(value));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** The bare amount, for "read 32 pages" style sentences. */
export function formatAmount(format: BookFormat, value: number): string {
  const n = Math.round(value);
  if (format !== "audio") return `${n} ${n === 1 ? "page" : "pages"}`;
  return `${n} ${n === 1 ? "minute" : "minutes"}`;
}

// ── Covers ───────────────────────────────────────────────────────────────────

const COVER_HOST = "https://covers.openlibrary.org/b/id";

/** Open Library cover sizes. M is 180px wide, L is bounded at ~500px; S is
 *  58px tall and useless above a favicon. Neither dimension is guaranteed —
 *  covers run from 1:1 to 1:1.6 — so every call site crops inside a fixed box. */
export type CoverSize = "M" | "L";

/** `?default=false` is not optional. Without it a missing cover returns HTTP
 *  200 with a 43-byte transparent 1×1 GIF, which fires the image's `load`
 *  event instead of `error` — the designed fallback would never render and an
 *  invisible pixel would stretch to fill the frame. With it, a miss is a
 *  clean 404 and `onError` does its job. */
export function coverSrc(book: Book, size: CoverSize = "M"): string | null {
  if (book.coverUrl) return book.coverUrl;
  if (book.coverId == null) return null;
  return `${COVER_HOST}/${book.coverId}-${size}.jpg?default=false`;
}

/** Deterministic tint for the typographic fallback, drawn from the five muted
 *  status hues already in the palette. A shelf of coverless books should read
 *  as a run of different cloth bindings, not as a run of identical errors —
 *  and because these tokens are redefined for the light palette, the tint is
 *  automatically correct in both themes with no second table. */
const BINDING_TINTS = [
  "var(--color-status-backlog)",
  "var(--color-status-learning)",
  "var(--color-status-polishing)",
  "var(--color-status-performance)",
  "var(--color-status-maintenance)",
];

export function bindingTint(book: Book): string {
  const seed = `${book.title}${book.author}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return BINDING_TINTS[hash % BINDING_TINTS.length];
}

// ── Identity ─────────────────────────────────────────────────────────────────

/** Case-, accent- and article-insensitive key used for both duplicate
 *  detection on import and local search. Subtitles are dropped because the
 *  same work is catalogued with and without them. */
export function fingerprint(title: string, author: string): string {
  const flatten = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const main = flatten(title.split(":")[0] ?? title).replace(/^(the|a|an|o|a|os|as|um|uma)\s+/, "");
  const surname = flatten(author).split(" ").pop() ?? "";
  return `${main}|${surname}`;
}

/** Everything a search box should match against, flattened once. */
export function searchKey(book: Book): string {
  return `${book.title} ${book.subtitle} ${book.author} ${book.tags.join(" ")}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

export function normalizeQuery(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").trim();
}

// ── Derived progress ─────────────────────────────────────────────────────────

/** 0–1, or null when the book has no stated length. Never guessed: a book with
 *  no page count shows a bare position rather than an invented percentage. */
export function progressOf(book: Book): number | null {
  if (!book.length || book.length <= 0) return null;
  return Math.min(1, Math.max(0, book.position / book.length));
}

export interface BookPace {
  /** Median amount per sitting, over this book's own history. */
  perSitting: number;
  /** Amount per elapsed day since the first logged sitting. */
  perDay: number;
  /** Days to the end at the current pace, or null when unknowable. */
  daysLeft: number | null;
  sittings: number;
}

export function bookPace(book: Book, events: ReadingEvent[], now = Date.now()): BookPace | null {
  const deltas = events.map((event) => event.to - event.from).filter((delta) => delta > 0);
  if (deltas.length === 0) return null;

  const sorted = [...deltas].sort((a, b) => a - b);
  const perSitting = sorted[Math.floor(sorted.length / 2)];

  // The span ends where the reading ended, not at the clock. Measured to
  // today, a book finished at 30 pages a day would read "1 page/day" six
  // months later and "0 pages/day" eventually — a number about the calendar
  // rather than about the book. An open book still counts the days since
  // you last picked it up, because there a stall is the point.
  const first = Math.min(...events.map((event) => event.at));
  const lastSitting = Math.max(...events.map((event) => event.at));
  const end =
    book.status === "finished" || book.status === "abandoned"
      ? (book.finishedAt ?? lastSitting)
      : now;
  const spanDays = Math.max(
    1,
    Math.round((Math.max(startOfDay(end), startOfDay(first)) - startOfDay(first)) / 86_400_000) + 1,
  );
  const total = deltas.reduce((sum, delta) => sum + delta, 0);
  const perDay = total / spanDays;

  const remaining = book.length ? Math.max(0, book.length - book.position) : null;
  const daysLeft =
    remaining != null && remaining > 0 && perDay > 0 ? Math.ceil(remaining / perDay) : null;

  return { perSitting, perDay, daysLeft, sittings: deltas.length };
}

const STEP_RAMP = [5, 10, 15, 20, 25, 30, 40, 50];

/** The step size the ± buttons carry.
 *
 *  Not a constant: it is the median sitting for *this* book, snapped to a
 *  human ramp. Because the number is printed on the button you watch `+10`
 *  become `+18` after four sittings — the app learns how you read this book
 *  and never hides that it did. Audiobooks step in minutes on the same ramp,
 *  which lands on sensible 15- and 30-minute jumps by itself. */
export function learnedStep(events: ReadingEvent[]): number {
  const deltas = events
    .map((event) => event.to - event.from)
    .filter((delta) => delta > 0)
    .sort((a, b) => a - b);
  if (deltas.length === 0) return 10;
  const median = deltas[Math.floor(deltas.length / 2)];
  return STEP_RAMP.reduce((best, candidate) =>
    Math.abs(candidate - median) < Math.abs(best - median) ? candidate : best,
  );
}

// ── Rollups ──────────────────────────────────────────────────────────────────

/** Pages read per local day, in the shape ContributionGrid consumes.
 *
 *  Audiobooks are excluded rather than folded in: 45 minutes and 45 pages are
 *  not the same quantity, and a grid that silently adds them is lying about a
 *  number the whole page is built on. The insights screen says so out loud. */
export function pagesByDay(events: ReadingEvent[], books: Book[]): Map<string, number> {
  const paged = new Set(books.filter((book) => book.format !== "audio").map((book) => book.id));
  const values = new Map<string, number>();
  for (const event of events) {
    if (!paged.has(event.bookId)) continue;
    const delta = event.to - event.from;
    if (delta <= 0) continue;
    const key = toDayKey(event.at);
    values.set(key, (values.get(key) ?? 0) + delta);
  }
  return values;
}

/** Consecutive days with at least one sitting, counted back from today. Stays
 *  alive if you read today or yesterday, exactly like the practice streak. */
export function readingStreak(events: ReadingEvent[], now = Date.now()): number {
  const days = new Set(events.filter((event) => event.to > event.from).map((event) => toDayKey(event.at)));
  let cursor = startOfDay(now);
  if (!days.has(toDayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestReadingStreak(events: ReadingEvent[]): number {
  const days = [...new Set(events.filter((e) => e.to > e.from).map((e) => toDayKey(e.at)))].sort();
  let longest = 0;
  let run = 0;
  let previous: number | null = null;
  for (const key of days) {
    const ts = new Date(`${key}T00:00:00`).getTime();
    if (previous !== null && Math.round((ts - previous) / 86_400_000) === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    previous = ts;
  }
  return longest;
}

export interface FinishedBook {
  book: Book;
  finishedAt: number;
  /** Calendar days from first page to last, when both dates are known. */
  days: number | null;
}

export function finishedBooks(books: Book[]): FinishedBook[] {
  return books
    .filter((book): book is Book & { finishedAt: number } => book.finishedAt != null)
    .map((book) => ({
      book,
      finishedAt: book.finishedAt,
      days:
        book.startedAt != null && book.finishedAt >= book.startedAt
          ? Math.max(1, Math.round((startOfDay(book.finishedAt) - startOfDay(book.startedAt)) / 86_400_000) + 1)
          : null,
    }))
    .sort((a, b) => b.finishedAt - a.finishedAt);
}

export interface ReadingTotals {
  /** Units read, across every book, from the log. */
  pagesRead: number;
  listeningMinutes: number;
  activeDays: number;
  finishedThisYear: number;
  finishedAllTime: number;
  /** Best calendar year by books finished, as [year, count]. */
  bestYear: [number, number] | null;
  medianDaysToFinish: number | null;
}

export function readingTotals(
  books: Book[],
  events: ReadingEvent[],
  now = Date.now(),
): ReadingTotals {
  const audio = new Set(books.filter((book) => book.format === "audio").map((book) => book.id));
  let pagesRead = 0;
  let listeningMinutes = 0;
  const days = new Set<string>();
  for (const event of events) {
    const delta = event.to - event.from;
    if (delta <= 0) continue;
    days.add(toDayKey(event.at));
    if (audio.has(event.bookId)) listeningMinutes += delta;
    else pagesRead += delta;
  }

  const finished = finishedBooks(books);
  const byYear = new Map<number, number>();
  for (const entry of finished) {
    const year = new Date(entry.finishedAt).getFullYear();
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
  }
  const bestYear = [...byYear.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] ?? null;

  const spans = finished
    .map((entry) => entry.days)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);

  return {
    pagesRead,
    listeningMinutes,
    activeDays: days.size,
    finishedThisYear: byYear.get(new Date(now).getFullYear()) ?? 0,
    finishedAllTime: finished.length,
    bestYear,
    medianDaysToFinish: spans.length ? spans[Math.floor(spans.length / 2)] : null,
  };
}

/** Books finished per calendar month for the last `months` months, oldest
 *  first — the series behind the insights bar chart. */
export function finishedByMonth(
  books: Book[],
  months: number,
  now = Date.now(),
): Array<{ start: number; count: number }> {
  const bars: Array<{ start: number; count: number }> = [];
  const anchor = new Date(now);
  anchor.setDate(1);
  anchor.setHours(0, 0, 0, 0);
  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(anchor);
    start.setMonth(start.getMonth() - i);
    bars.push({ start: start.getTime(), count: 0 });
  }
  const index = new Map(bars.map((bar, i) => [monthKey(bar.start), i]));
  for (const book of books) {
    if (book.finishedAt == null) continue;
    const i = index.get(monthKey(book.finishedAt));
    if (i !== undefined) bars[i].count += 1;
  }
  return bars;
}

function monthKey(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/** Total units read per book, from the log — the basis of "most read authors"
 *  and of anything that must not double-count a re-read. */
export function unitsReadByBook(events: ReadingEvent[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const event of events) {
    const delta = event.to - event.from;
    if (delta <= 0) continue;
    totals.set(event.bookId, (totals.get(event.bookId) ?? 0) + delta);
  }
  return totals;
}

/** The most recent sitting per book — the default sort for a shelf, because
 *  what you touched last is what you want to see first. */
export function lastReadByBook(events: ReadingEvent[]): Map<string, number> {
  const last = new Map<string, number>();
  for (const event of events) {
    last.set(event.bookId, Math.max(last.get(event.bookId) ?? 0, event.at));
  }
  return last;
}

// ── Series for the charts ────────────────────────────────────────────────────
// Audiobooks are excluded from every page-based series, the same rule the grid
// and the totals follow: 45 minutes and 45 pages are not the same quantity.

function pagedBookIds(books: Book[]): Set<string> {
  return new Set(books.filter((book) => book.format !== "audio").map((book) => book.id));
}

export interface MonthPoint {
  start: number;
  pages: number;
}

/** Pages per calendar month, oldest first — the trend the day grid is too
 *  fine-grained to show. */
export function pagesByMonth(
  events: ReadingEvent[],
  books: Book[],
  months: number,
  now = Date.now(),
): MonthPoint[] {
  const paged = pagedBookIds(books);
  const points: MonthPoint[] = [];
  const anchor = new Date(now);
  anchor.setDate(1);
  anchor.setHours(0, 0, 0, 0);
  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(anchor);
    start.setMonth(start.getMonth() - i);
    points.push({ start: start.getTime(), pages: 0 });
  }
  const key = (ts: number) => {
    const date = new Date(ts);
    return `${date.getFullYear()}-${date.getMonth()}`;
  };
  const index = new Map(points.map((point, i) => [key(point.start), i]));
  for (const event of events) {
    if (!paged.has(event.bookId)) continue;
    const delta = event.to - event.from;
    if (delta <= 0) continue;
    const i = index.get(key(event.at));
    if (i !== undefined) points[i].pages += delta;
  }
  return points;
}

export interface WeekdayPoint {
  /** 0–6, as `Date.getDay()` reports it. */
  day: number;
  label: string;
  pages: number;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Pages per day of the week, rotated to the week start the rest of the app
 *  uses. Answers "when do I actually read", which no other view does. */
export function pagesByWeekday(
  events: ReadingEvent[],
  books: Book[],
  weekStartsOn: 0 | 1,
): WeekdayPoint[] {
  const paged = pagedBookIds(books);
  const totals = new Array(7).fill(0) as number[];
  for (const event of events) {
    if (!paged.has(event.bookId)) continue;
    const delta = event.to - event.from;
    if (delta > 0) totals[new Date(event.at).getDay()] += delta;
  }
  return Array.from({ length: 7 }, (_, i) => {
    const day = (weekStartsOn + i) % 7;
    return { day, label: WEEKDAY_NAMES[day], pages: totals[day] };
  });
}

export interface ProgressPoint {
  at: number;
  position: number;
}

/** Where the bookmark stood after each sitting, oldest first — the shape of
 *  how one book actually got read, plateaus and binges included. Seeded with
 *  the first sitting's starting point so the line begins where you began. */
export function progressSeries(events: ReadingEvent[]): ProgressPoint[] {
  const ordered = [...events].filter((event) => event.to > event.from).sort((a, b) => a.at - b.at);
  if (ordered.length === 0) return [];
  const points: ProgressPoint[] = [{ at: ordered[0].at, position: ordered[0].from }];
  for (const event of ordered) points.push({ at: event.at, position: event.to });
  return points;
}
