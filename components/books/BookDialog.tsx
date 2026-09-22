"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Book, BookFormat } from "@/lib/types";
import { BOOK_FORMATS } from "@/lib/books";
import { useStore } from "@/lib/store";
import { useArmedConfirm } from "@/lib/hooks/useArmedConfirm";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextField } from "@/components/ui/Field";
import { Cover } from "./Cover";

/** Correcting a book.
 *
 *  Everything the catalogue guessed is editable here, because the catalogue
 *  is regularly wrong in ways that matter: page counts are medians across
 *  every edition and come back as 3 for an omnibus, and publication years are
 *  off by more than a decade often enough to notice. The reader's number
 *  always wins. */
export function BookDialog({
  book,
  open,
  onClose,
}: {
  book: Book | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const updateBook = useStore((s) => s.updateBook);
  const deleteBook = useStore((s) => s.deleteBook);
  const eventCount = useStore(
    (s) => s.readingEvents.filter((event) => event.bookId === book?.id).length,
  );

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    author: "",
    format: "paper" as BookFormat,
    length: "",
    year: "",
    isbn: "",
    tags: "",
    coverUrl: "",
    notes: "",
  });

  const confirmDelete = useCallback(() => {
    if (!book) return;
    deleteBook(book.id);
    toast.show(`Deleted ${book.title}`);
    onClose();
    router.push("/books");
  }, [book, deleteBook, onClose, router]);

  // Keyed on the book on screen: opening a different one, or closing the
  // dialog, forgets any half-pressed delete.
  const del = useArmedConfirm(confirmDelete, open ? book?.id : null);

  useEffect(() => {
    if (!open || !book) return;
    setForm({
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      format: book.format,
      length: book.length != null ? String(book.length) : "",
      year: book.publishedYear != null ? String(book.publishedYear) : "",
      isbn: book.isbn,
      tags: book.tags.join(", "),
      coverUrl: book.coverUrl,
      notes: book.notes,
    });
  }, [open, book]);

  if (!book) return null;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const canSave = form.title.trim().length > 0;
  const trimmedCover = form.coverUrl.trim();
  const preview = {
    ...book,
    title: form.title || book.title,
    author: form.author,
    coverUrl: /^https:\/\//i.test(trimmedCover) ? trimmedCover : "",
    coverId: trimmedCover ? book.coverId : book.coverId,
  };

  const save = () => {
    if (!canSave) return;
    const length = Number.parseInt(form.length, 10);
    updateBook(book.id, {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      author: form.author.trim(),
      format: form.format,
      length: Number.isFinite(length) && length > 0 ? length : null,
      publishedYear: Number.parseInt(form.year, 10) || null,
      isbn: form.isbn.replace(/[^0-9Xx]/g, "").slice(0, 13),
      tags: [
        ...new Set(
          form.tags
            .split(",")
            .map((tag) => tag.trim().slice(0, 24))
            .filter(Boolean),
        ),
      ].slice(0, 8),
      coverUrl: /^https:\/\//i.test(trimmedCover) ? trimmedCover : "",
      notes: form.notes,
    });
    toast.success("Book updated");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit book"
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Button variant="danger" size="sm" onClick={del.trigger}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {del.armed ? "Confirm delete" : "Delete"}
            </Button>
            {/* Only once the button is armed — ambient anxiety otherwise. */}
            {del.armed && eventCount > 0 && (
              <span className="text-mini text-sub">
                Also removes {eventCount} reading {eventCount === 1 ? "entry" : "entries"}.
              </span>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={!canSave}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-4">
          <Cover book={preview} className="w-20 shrink-0" quiet={false} />
          <div className="min-w-0 flex-1 space-y-4">
            <Field label="Title" htmlFor="book-title">
              <TextField
                id="book-title"
                data-autofocus
                maxLength={300}
                value={form.title}
                onChange={(event) => set("title", event.target.value)}
              />
            </Field>
            <Field label="Author" htmlFor="book-author" hint="optional">
              <TextField
                id="book-author"
                maxLength={200}
                value={form.author}
                onChange={(event) => set("author", event.target.value)}
              />
            </Field>
          </div>
        </div>

        <Field label="Subtitle" htmlFor="book-subtitle" hint="optional">
          <TextField
            id="book-subtitle"
            maxLength={300}
            value={form.subtitle}
            onChange={(event) => set("subtitle", event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Format">
            <div
              className="inline-flex w-full overflow-hidden rounded-md border border-border"
              role="radiogroup"
              aria-label="Format"
            >
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
            label={form.format === "audio" ? "Length in minutes" : "Pages"}
            htmlFor="book-length"
            hint="drives percent and pace"
          >
            <TextField
              id="book-length"
              inputMode="numeric"
              value={form.length}
              onChange={(event) => set("length", event.target.value.replace(/[^\d]/g, ""))}
              placeholder="—"
              className="tabnum"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Published" htmlFor="book-year" hint="optional">
            <TextField
              id="book-year"
              inputMode="numeric"
              value={form.year}
              onChange={(event) => set("year", event.target.value.replace(/[^\d]/g, ""))}
              className="tabnum"
            />
          </Field>
          <Field label="ISBN" htmlFor="book-isbn" hint="optional">
            <TextField
              id="book-isbn"
              value={form.isbn}
              onChange={(event) => set("isbn", event.target.value)}
              className="tabnum"
            />
          </Field>
        </div>

        <Field label="Tags" htmlFor="book-tags" hint="comma separated · up to 8">
          <TextField
            id="book-tags"
            value={form.tags}
            onChange={(event) => set("tags", event.target.value)}
            placeholder="brasil, philosophy, borrowed"
          />
        </Field>

        <Field
          label="Cover image URL"
          htmlFor="book-cover"
          hint={book.coverId != null ? "overrides the catalogue cover" : "https only"}
        >
          <TextField
            id="book-cover"
            value={form.coverUrl}
            onChange={(event) => set("coverUrl", event.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Field label="Your notes" htmlFor="book-notes" hint="optional">
          <TextArea
            id="book-notes"
            maxLength={4000}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Quotes, arguments, who pressed it on you, why you stopped…"
            rows={4}
          />
        </Field>
      </div>
    </Modal>
  );
}
