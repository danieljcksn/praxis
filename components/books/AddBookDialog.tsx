"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PenLine, Plus, Search, X } from "lucide-react";
import type { BookCandidate } from "@/lib/openlibrary";
import type { Book, BookFormat, BookStatus } from "@/lib/types";
import { BOOK_FORMATS, fingerprint } from "@/lib/books";
import { useStore } from "@/lib/store";
import { fetchBookDescription, useBookSearch } from "@/lib/hooks/useBookSearch";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Card";
import { Field, TextField, inputClass } from "@/components/ui/Field";
import { Cover } from "./Cover";

/** The shelf a search result lands on. Remembered for the dialog's lifetime,
 *  because you stand at your bookcase and type in eleven titles at once and
 *  they are nearly always the same kind of thing. */
const LANDING: Array<{ id: BookStatus; label: string }> = [
  { id: "backlog", label: "Want to read" },
  { id: "reading", label: "Reading" },
  { id: "finished", label: "Finished" },
];

export function AddBookDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const books = useStore((s) => s.books);
  const addBook = useStore((s) => s.addBook);
  const updateBook = useStore((s) => s.updateBook);

  const { status, results, resultQuery, message, slow, search, reset } = useBookSearch();
  const [query, setQuery] = useState("");
  const [landing, setLanding] = useState<BookStatus>("backlog");
  const [active, setActive] = useState(-1);
  const [added, setAdded] = useState(0);
  const [manual, setManual] = useState(false);

  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** Books added during this dialog session. A second activation on a row
   *  you just added is a double-click, not a request to leave — and this
   *  dialog exists precisely for the case where you add eleven in a row. */
  const justAdded = useRef(new Set<string>());

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(-1);
    setAdded(0);
    setManual(false);
    justAdded.current.clear();
    reset();
  }, [open, reset]);

  /** Matched on three keys, because the same work arrives under different
   *  editions, translations and punctuation. */
  const owned = useMemo(() => {
    const byWork = new Map<string, Book>();
    const byIsbn = new Map<string, Book>();
    const byPrint = new Map<string, Book>();
    for (const book of books) {
      if (book.workId) byWork.set(book.workId, book);
      if (book.isbn) byIsbn.set(book.isbn, book);
      byPrint.set(fingerprint(book.title, book.author), book);
    }
    return (candidate: BookCandidate): Book | undefined =>
      (candidate.workId ? byWork.get(candidate.workId) : undefined) ??
      (candidate.isbn ? byIsbn.get(candidate.isbn) : undefined) ??
      byPrint.get(fingerprint(candidate.title, candidate.author));
  }, [books]);

  const runSearch = () => {
    setActive(-1);
    void search(query);
  };

  const add = (candidate: BookCandidate) => {
    const key = candidate.workId || candidate.isbn || candidate.title;
    if (justAdded.current.has(key)) return;
    const existing = owned(candidate);
    if (existing) {
      // A row you already owned before opening this dialog is a shortcut,
      // not a dead end.
      onClose();
      router.push(`/books/${existing.id}`);
      return;
    }
    justAdded.current.add(key);
    const book = addBook({
      title: candidate.title,
      subtitle: candidate.subtitle,
      author: candidate.author,
      status: landing,
      length: candidate.length,
      coverId: candidate.coverId,
      isbn: candidate.isbn,
      publishedYear: candidate.publishedYear,
      workId: candidate.workId,
    });
    setAdded((count) => count + 1);
    toast.success(`Added ${candidate.title}`);

    // The blurb arrives after the fact. Nothing about adding waits on it.
    void fetchBookDescription(candidate.workId).then((description) => {
      if (description) updateBook(book.id, { description });
    });

    // Ready for the next title without a single mouse move.
    inputRef.current?.select();
  };

  const move = (delta: number) => {
    if (results.length === 0) return;
    setActive((current) => {
      const next = current + delta;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  };

  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const dim = status === "searching" && results.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={manual ? "Add a book by hand" : "Add a book"}
      description={
        manual
          ? "For the ones no catalogue has."
          : "Search by title, author, or ISBN. Press Enter to look it up."
      }
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {manual ? (
            <Button variant="ghost" size="sm" onClick={() => setManual(false)}>
              ← Back to search
            </Button>
          ) : (
            <div
              className="inline-flex overflow-hidden rounded-md border border-border"
              role="radiogroup"
              aria-label="Add to"
            >
              {LANDING.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={landing === option.id}
                  onClick={() => setLanding(option.id)}
                  className={cn(
                    "segment h-9 px-3 text-mini transition-colors duration-[130ms] ease-out",
                    index > 0 && "border-l border-border",
                    landing === option.id
                      ? "bg-book/12 text-text"
                      : "text-sub hover:text-text",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {!manual && (
            <Button variant={added > 0 ? "primary" : "subtle"} onClick={onClose}>
              {added > 0 ? `Done · ${added} added` : "Close"}
            </Button>
          )}
        </div>
      }
    >
      {manual ? (
        <ManualEntry
          initialTitle={query}
          landing={landing}
          onAdded={(title) => {
            setAdded((count) => count + 1);
            toast.success(`Added ${title}`);
            setManual(false);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub"
              aria-hidden
            />
            <input
              ref={inputRef}
              data-autofocus
              value={query}
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              aria-label="Search the book catalogue"
              placeholder="Le Guin, The Dispossessed, 9780061054884…"
              onChange={(event) => setQuery(event.target.value)}
              onPaste={(event) => {
                // A pasted ISBN is a finished thought — look it up at once.
                const pasted = event.clipboardData.getData("text").trim();
                if (/^[\d\s-]{10,17}$/.test(pasted)) {
                  event.preventDefault();
                  setQuery(pasted);
                  window.setTimeout(() => void search(pasted), 0);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (active >= 0 && results[active]) add(results[active]);
                  else runSearch();
                  return;
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  move(1);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  move(-1);
                  return;
                }
                if (event.key === "Escape" && query) {
                  // Two-stage, so a reflexive Escape can't discard a batch of
                  // eleven books you just typed in.
                  event.preventDefault();
                  event.stopPropagation();
                  setQuery("");
                  reset();
                }
              }}
              className={cn(inputClass, "h-10 pl-9 pr-24")}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {status === "searching" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sub" aria-hidden />
              )}
              {status !== "searching" && results.length > 0 && (
                <span className="text-micro tabnum text-sub">{results.length}</span>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    reset();
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="flex h-6 w-6 items-center justify-center rounded-sm text-sub transition-colors duration-[130ms] hover:text-text"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
              <Button size="sm" variant="subtle" onClick={runSearch} disabled={query.trim().length < 2}>
                Search
              </Button>
            </div>
          </div>

          {/* Always exactly one Tab away, never buried behind a failure. */}
          <button
            type="button"
            onClick={() => setManual(true)}
            className="flex items-center gap-1.5 text-mini text-sub transition-colors duration-[130ms] hover:text-text"
          >
            <PenLine className="h-3 w-3" aria-hidden />
            Enter it manually
          </button>

          {slow && status === "searching" && (
            <p className="text-mini text-sub">Still searching — the catalogue is slow today.</p>
          )}

          {(status === "error" || status === "offline") && (
            <Alert
              tone="warning"
              title={status === "offline" ? "You're offline" : "Couldn't reach the catalogue"}
              action={
                status === "error" ? (
                  <Button size="sm" variant="subtle" onClick={runSearch}>
                    Retry
                  </Button>
                ) : undefined
              }
            >
              {message || "Add this one by hand — the cover can be filled in later."}
            </Alert>
          )}

          <div
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label="Search results"
            className={cn(
              "max-h-[22rem] space-y-1 overflow-y-auto transition-opacity duration-[130ms]",
              dim && "opacity-60",
            )}
          >
            {results.map((candidate, index) => (
              <ResultRow
                key={`${candidate.workId}-${index}`}
                id={`${listId}-${index}`}
                index={index}
                candidate={candidate}
                existing={owned(candidate)}
                active={index === active}
                onHover={() => setActive(index)}
                onSelect={() => add(candidate)}
              />
            ))}
          </div>

          {status === "empty" && (
            <div className="rounded-md border border-dashed border-border-strong px-4 py-8 text-center">
              <p className="text-sm text-text">No matches for “{resultQuery}”</p>
              <p className="mt-1 text-mini text-sub">
                Try just the author, or a shorter title — the catalogue needs every word to match.
              </p>
              <Button variant="subtle" size="sm" className="mt-4" onClick={() => setManual(true)}>
                Add it manually
              </Button>
            </div>
          )}

          {status === "idle" && (
            <p className="px-1 py-6 text-center text-mini text-sub">
              Type a title, an author, or paste an ISBN.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function ResultRow({
  id,
  index,
  candidate,
  existing,
  active,
  onHover,
  onSelect,
}: {
  id: string;
  index: number;
  candidate: BookCandidate;
  existing: Book | undefined;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  // Cover needs a Book to draw its fallback from; a candidate is close enough
  // to one, and this way the search list and the shelf share a single
  // rendering of what a book looks like.
  const preview = {
    id: candidate.workId,
    title: candidate.title,
    author: candidate.author,
    coverId: candidate.coverId,
    coverUrl: "",
    publishedYear: candidate.publishedYear,
  } as Book;

  return (
    <button
      type="button"
      id={id}
      data-index={index}
      role="option"
      aria-selected={active}
      aria-label={
        existing
          ? `${candidate.title} — already in your library, opens the book`
          : `Add ${candidate.title}`
      }
      onMouseMove={onHover}
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left",
        "transition-colors duration-[130ms] ease-out",
        active ? "bg-soft-strong" : "hover:bg-soft",
      )}
    >
      <Cover book={preview} className="w-9 shrink-0" quiet={false} />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text" title={candidate.title}>
            {candidate.title}
          </span>
          {existing && <Badge tone="mint">In your library</Badge>}
        </span>
        <span className="mt-0.5 block truncate text-mini text-sub">
          {candidate.author || "Unattributed"}
          {candidate.subtitle && ` · ${candidate.subtitle}`}
        </span>
      </span>

      <span className="shrink-0 text-right">
        {candidate.publishedYear != null && (
          <span className="block text-micro tabnum text-sub">{candidate.publishedYear}</span>
        )}
        {candidate.length != null && (
          <span className="block text-micro tabnum text-sub">{candidate.length} pp</span>
        )}
      </span>

      {existing ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-mint" aria-hidden />
      ) : (
        <Plus
          className="h-3.5 w-3.5 shrink-0 text-sub opacity-0 transition-opacity duration-[130ms] group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}

function ManualEntry({
  initialTitle,
  landing,
  onAdded,
}: {
  initialTitle: string;
  landing: BookStatus;
  onAdded: (title: string) => void;
}) {
  const addBook = useStore((s) => s.addBook);
  const [form, setForm] = useState({
    title: initialTitle,
    author: "",
    length: "",
    year: "",
    format: "paper" as BookFormat,
    coverUrl: "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const canSave = form.title.trim().length > 0;
  const preview = {
    id: "preview",
    title: form.title || "Untitled",
    author: form.author,
    coverId: null,
    coverUrl: /^https:\/\//i.test(form.coverUrl.trim()) ? form.coverUrl.trim() : "",
    publishedYear: null,
  } as Book;

  // Clamped to the same ceilings the store's sanitizer enforces, so a typo'd
  // year never round-trips to null on the next load.
  const bounded = (raw: string, max: number): number | null => {
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? Math.min(value, max) : null;
  };

  const save = () => {
    if (!canSave) return;
    addBook({
      title: form.title,
      author: form.author,
      status: landing,
      format: form.format,
      length: bounded(form.length, 200_000),
      publishedYear: bounded(form.year, 2200),
      coverUrl: preview.coverUrl,
    });
    onAdded(form.title.trim());
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <Cover book={preview} className="w-20 shrink-0" quiet={false} />
        <div className="min-w-0 flex-1 space-y-4">
          <Field label="Title" htmlFor="manual-title">
            <TextField
              id="manual-title"
              data-autofocus
              maxLength={300}
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSave) save();
              }}
              placeholder="Grande sertão: veredas"
            />
          </Field>
          <Field label="Author" htmlFor="manual-author" hint="optional">
            <TextField
              id="manual-author"
              maxLength={200}
              value={form.author}
              onChange={(event) => set("author", event.target.value)}
              placeholder="João Guimarães Rosa"
            />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Format">
          <div className="inline-flex overflow-hidden rounded-md border border-border" role="radiogroup" aria-label="Format">
            {BOOK_FORMATS.map((option, index) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={form.format === option.id}
                onClick={() => set("format", option.id)}
                className={cn(
                  "segment h-10 flex-1 px-3 text-mini transition-colors duration-[130ms] ease-out",
                  index > 0 && "border-l border-border",
                  form.format === option.id ? "bg-book/12 text-text" : "text-sub hover:text-text",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>
        <Field
          label={form.format === "audio" ? "Minutes" : "Pages"}
          htmlFor="manual-length"
          hint="optional"
        >
          <TextField
            id="manual-length"
            inputMode="numeric"
            value={form.length}
            onChange={(event) => set("length", event.target.value.replace(/[^\d]/g, ""))}
            placeholder="504"
            className="tabnum"
          />
        </Field>
        <Field label="Year" htmlFor="manual-year" hint="optional">
          <TextField
            id="manual-year"
            inputMode="numeric"
            value={form.year}
            onChange={(event) => set("year", event.target.value.replace(/[^\d]/g, ""))}
            placeholder="1956"
            className="tabnum"
          />
        </Field>
      </div>

      <Field label="Cover image URL" htmlFor="manual-cover" hint="optional · https only">
        <TextField
          id="manual-cover"
          value={form.coverUrl}
          onChange={(event) => set("coverUrl", event.target.value)}
          placeholder="https://…"
        />
      </Field>

      <div className="flex justify-end">
        <Button variant="primary" onClick={save} disabled={!canSave}>
          <Plus className="h-4 w-4" aria-hidden />
          Add book
        </Button>
      </div>
    </div>
  );
}
