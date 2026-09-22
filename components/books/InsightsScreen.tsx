"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BookOpen, ChartColumn, Clock, FileText, Flame, Headphones } from "lucide-react";
import type { Book } from "@/lib/types";
import {
  BOOK_STATUSES,
  finishedBooks,
  finishedByMonth,
  formatAmount,
  longestReadingStreak,
  pagesByDay,
  pagesByMonth,
  pagesByWeekday,
  readingStreak,
  readingTotals,
  unitsReadByBook,
} from "@/lib/books";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatMinutes } from "@/lib/time";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ContributionGrid } from "@/components/activity/ContributionGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Metric } from "@/components/ui/Metric";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { Cover } from "./Cover";
import { MonthlyPages, StatusBars, WeekdayPages } from "./Charts";

const MONTH_LABEL = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short" });

/** What the shelf can't show. Sibling of /stats, built from the same objects
 *  so the two pages are visibly the same kind of thing. */
export function InsightsScreen() {
  const hydrated = useHydrated();
  const books = useStore((s) => s.books);
  const readingEvents = useStore((s) => s.readingEvents);
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn);

  const totals = useMemo(() => readingTotals(books, readingEvents), [books, readingEvents]);
  const values = useMemo(() => pagesByDay(readingEvents, books), [readingEvents, books]);
  const streak = useMemo(() => readingStreak(readingEvents), [readingEvents]);
  const longest = useMemo(() => longestReadingStreak(readingEvents), [readingEvents]);
  const months = useMemo(() => finishedByMonth(books, 12), [books]);
  const monthlyPages = useMemo(
    () => pagesByMonth(readingEvents, books, 12),
    [readingEvents, books],
  );
  const weekday = useMemo(
    () => pagesByWeekday(readingEvents, books, weekStartsOn),
    [readingEvents, books, weekStartsOn],
  );
  const finished = useMemo(() => finishedBooks(books), [books]);

  const thisYear = useMemo(() => {
    const year = new Date().getFullYear();
    return finished
      .filter((entry) => new Date(entry.finishedAt).getFullYear() === year)
      .filter((entry) => entry.days != null)
      .sort((a, b) => (b.days ?? 0) - (a.days ?? 0));
  }, [finished]);

  const authors = useMemo(() => {
    const units = unitsReadByBook(readingEvents);
    const map = new Map<string, { units: number; cover: Book }>();
    for (const book of books) {
      const name = book.author.trim();
      if (!name) continue;
      const amount = units.get(book.id) ?? 0;
      if (amount <= 0) continue;
      const current = map.get(name);
      if (current) current.units += amount;
      else map.set(name, { units: amount, cover: book });
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 6);
  }, [books, readingEvents]);

  const shelf = useMemo(
    () =>
      BOOK_STATUSES.map((meta) => ({
        meta,
        count: books.filter((book) => book.status === meta.id).length,
      })).filter((slice) => slice.count > 0),
    [books],
  );

  /** Named rather than silently dropped: a stats page that quietly excludes
   *  data is a stats page you stop trusting. */
  const unmeasured = useMemo(
    () => books.filter((book) => book.length == null && book.status !== "backlog"),
    [books],
  );

  if (!hydrated) return <InsightsSkeleton />;

  if (books.length === 0 || (totals.pagesRead < 50 && totals.finishedAllTime === 0)) {
    return (
      <div>
        <PageHeader eyebrow="Reading" tone="book" title="Insights" subtitle="What the shelf can't show." />
        <EmptyState
          icon={ChartColumn}
          title="Not enough to measure yet"
          description="Once you've logged a few reading days, this fills with pace, streaks, and how long books actually take you."
          action={
            <ButtonLink href="/books" variant="primary">
              Go to the library
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const monthMax = Math.max(1, ...months.map((month) => month.count));
  const daysMax = Math.max(1, ...thisYear.map((entry) => entry.days ?? 0));

  return (
    <div>
      <PageHeader
        eyebrow="Reading"
        tone="book"
        title="Insights"
        subtitle={`${totals.pagesRead.toLocaleString("en-US")} pages across ${totals.activeDays} ${totals.activeDays === 1 ? "day" : "days"}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={BookOpen}
          tone="book"
          label="Finished"
          value={totals.finishedThisYear}
          detail={
            totals.bestYear && totals.bestYear[0] !== new Date().getFullYear()
              ? `best year: ${totals.bestYear[1]} in ${totals.bestYear[0]}`
              : `${totals.finishedAllTime} all time`
          }
        />
        <Metric
          icon={FileText}
          label="Pages read"
          value={
            totals.pagesRead >= 10_000
              ? `${(totals.pagesRead / 1000).toFixed(1)}k`
              : totals.pagesRead.toLocaleString("en-US")
          }
          detail={
            totals.activeDays > 0
              ? `${Math.round(totals.pagesRead / totals.activeDays)}/day when reading`
              : undefined
          }
        />
        <Metric
          icon={Flame}
          tone={streak > 0 ? "book" : "neutral"}
          label="Streak"
          value={`${streak} ${streak === 1 ? "day" : "days"}`}
          detail={`best ${longest} days`}
        />
        <Metric
          icon={Clock}
          label="Time to finish"
          value={totals.medianDaysToFinish != null ? `${totals.medianDaysToFinish}d` : "—"}
          detail="median, from first page to last"
        />
      </div>

      <Card className="mt-4">
        <div className="mb-6">
          <p className="eyebrow mb-2 text-book">The last 12 months</p>
          <h2 className="text-title text-text">Pages per day</h2>
        </div>
        <ContributionGrid
          values={values}
          color="var(--color-book)"
          label="Reading"
          weeks={52}
          weekStartsOn={weekStartsOn}
          valueLabel={(value) => `${value} ${value === 1 ? "page" : "pages"}`}
        />
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-5">
            <p className="eyebrow mb-2 text-sub">Last 12 months</p>
            <h2 className="text-title text-text">Pages per month</h2>
          </div>
          <MonthlyPages points={monthlyPages} />
        </Card>

        <Card>
          <div className="mb-5">
            <p className="eyebrow mb-2 text-sub">Rhythm</p>
            <h2 className="text-title text-text">When you read</h2>
          </div>
          <WeekdayPages points={weekday} />
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-6">
            <p className="eyebrow mb-2 text-sub">Last 12 months</p>
            <h2 className="text-title text-text">Books finished by month</h2>
          </div>
          <div className="flex h-32 items-end gap-1.5">
            {months.map((month, index) => {
              const last = index === months.length - 1;
              return (
                <div
                  key={month.start}
                  className="group flex h-full flex-1 items-end"
                  title={`${new Date(month.start).toLocaleDateString("en-US", { month: "long", year: "numeric" })} · ${month.count} ${month.count === 1 ? "book" : "books"}`}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-sm transition-colors duration-[130ms]",
                      last ? "bg-book" : "bg-book/60 group-hover:bg-book",
                    )}
                    style={{
                      height: month.count > 0 ? `${Math.max(4, (month.count / monthMax) * 100)}%` : "2px",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5">
            {months.map((month, index) => (
              <div key={month.start} className="flex-1 text-center text-micro text-sub">
                {index % 3 === 0 || index === months.length - 1 ? MONTH_LABEL(month.start) : ""}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-6">
            <p className="eyebrow mb-2 text-sub">Balance</p>
            <h2 className="text-title text-text">The shelf, at a glance</h2>
          </div>
          {/* Labelled rows, not a stacked rule: the palette validator puts
              `finished` and `want to read` at ΔE 0.4 for a deuteranope
              against warm paper, so a reader could not have told two of the
              fills apart. The word carries identity; the hue only echoes it. */}
          <StatusBars
            rows={shelf.map((slice) => ({
              id: slice.meta.id,
              label: slice.meta.label,
              color: slice.meta.color,
              count: slice.count,
            }))}
            total={books.length}
          />

          {totals.listeningMinutes > 0 && (
            <p className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-mini text-sub">
              <Headphones className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {formatMinutes(totals.listeningMinutes)} listened — counted separately from pages.
            </p>
          )}
        </Card>
      </div>

      {thisYear.length > 0 && (
        <Card className="mt-4">
          <div className="mb-6">
            <p className="eyebrow mb-2 text-sub">This year</p>
            <h2 className="text-title text-text">How long books took</h2>
          </div>
          <ul className="space-y-3">
            {thisYear.map(({ book, days }) => (
              <li key={book.id}>
                <Link href={`/books/${book.id}`} className="group flex items-center gap-3 rounded-md">
                  <Cover book={book} className="w-6 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-text">{book.title}</span>
                      <span className="shrink-0 text-mini tabnum text-sub">
                        {book.length != null && `${book.length} pp · `}
                        {days}d
                      </span>
                    </span>
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-inset">
                      <span
                        className="block h-full rounded-full bg-book/70 transition-[width] duration-500 ease-out group-hover:bg-book"
                        style={{ width: `${Math.max(2, ((days ?? 0) / daysMax) * 100)}%` }}
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {authors.length > 0 && (
        <Card className="mt-4">
          <div className="mb-6">
            <p className="eyebrow mb-2 text-sub">Company kept</p>
            <h2 className="text-title text-text">Most-read authors</h2>
          </div>
          <ul className="space-y-3">
            {authors.map((author) => (
              <li key={author.name} className="flex items-center gap-3">
                <Cover book={author.cover} className="w-6 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-text">{author.name}</span>
                    <span className="shrink-0 text-mini tabnum text-sub">
                      {formatAmount(author.cover.format, author.units)}
                    </span>
                  </span>
                  <span className="block h-1.5 w-full overflow-hidden rounded-full bg-inset">
                    <span
                      className="block h-full rounded-full bg-book/70"
                      style={{
                        width: `${Math.max(2, (author.units / authors[0].units) * 100)}%`,
                      }}
                    />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {unmeasured.length > 0 && (
        <p className="mt-6 text-micro text-sub">
          {unmeasured.length} {unmeasured.length === 1 ? "book has" : "books have"} no length set, so
          {unmeasured.length === 1 ? " it is" : " they are"} left out of the pace figures:{" "}
          {unmeasured.map((book, index) => (
            <span key={book.id}>
              {index > 0 && ", "}
              <Link href={`/books/${book.id}`} className="underline underline-offset-2 hover:text-text">
                {book.title}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <SkeletonScreen label="Loading your reading insights">
      <div className="mb-7 space-y-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-36" delay={40} />
        <Skeleton className="h-4 w-56" delay={60} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[7.5rem] rounded-lg" delay={80 + i * 45} />
        ))}
      </div>
      <Skeleton className="mt-4 h-56 w-full rounded-lg" delay={280} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" delay={340} />
        <Skeleton className="h-64 rounded-lg" delay={380} />
      </div>
    </SkeletonScreen>
  );
}
