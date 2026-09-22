"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BookCandidate } from "@/lib/openlibrary";

export type SearchStatus = "idle" | "searching" | "ready" | "empty" | "error" | "offline";

interface SearchState {
  status: SearchStatus;
  results: BookCandidate[];
  /** The query the visible results belong to, which is not always the query
   *  in the field. */
  resultQuery: string;
  message: string;
  /** True once a search has been in flight long enough to be worth narrating. */
  slow: boolean;
}

const SLOW_AFTER_MS = 2500;

/** Catalogue search for the add dialog.
 *
 *  Submit-driven, deliberately. Open Library's search is genuinely slow —
 *  measured between 1.5 and 9 seconds for the same kind of query — and it
 *  answers one request at a time, so type-ahead would queue a request per
 *  keystroke behind a serial upstream and deliver the one you wanted last.
 *  Pressing Enter is honest about the wait and never feels like lag, because
 *  you asked for it.
 *
 *  Results are never blanked while a new search is in flight: the previous
 *  list stays on screen and dims, which is the same rule Alert.tsx states for
 *  a failed refresh — a pending request must not empty a working page. */
export function useBookSearch() {
  const [state, setState] = useState<SearchState>({
    status: "idle",
    results: [],
    resultQuery: "",
    message: "",
    slow: false,
  });

  const cache = useRef(new Map<string, BookCandidate[]>());
  const controller = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const slowTimer = useRef<number | null>(null);

  const stopSlowTimer = () => {
    if (slowTimer.current !== null) {
      window.clearTimeout(slowTimer.current);
      slowTimer.current = null;
    }
  };

  useEffect(
    () => () => {
      controller.current?.abort();
      stopSlowTimer();
    },
    [],
  );

  const search = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (query.length < 2) return;

    // Every search supersedes whatever is in flight, including one answered
    // from cache — otherwise a slow response for the previous query still
    // holds a live ticket and replaces the results now on screen.
    controller.current?.abort();
    stopSlowTimer();
    const ticket = ++seq.current;

    const cached = cache.current.get(query);
    if (cached) {
      setState({
        status: cached.length ? "ready" : "empty",
        results: cached,
        resultQuery: query,
        message: "",
        slow: false,
      });
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState((prev) => ({
        ...prev,
        status: "offline",
        message: "You're offline — add this one by hand and fix the cover later.",
        slow: false,
      }));
      return;
    }

    const local = new AbortController();
    controller.current = local;

    setState((prev) => ({ ...prev, status: "searching", message: "", slow: false }));
    slowTimer.current = window.setTimeout(() => {
      if (seq.current === ticket) setState((prev) => ({ ...prev, slow: true }));
    }, SLOW_AFTER_MS);

    try {
      const response = await fetch(`/api/books?q=${encodeURIComponent(query)}`, {
        signal: local.signal,
        cache: "no-store",
      });
      const payload = (await response.json()) as { results?: BookCandidate[]; error?: string };
      // A slow answer for "her" must never overwrite a fast one for "herzog".
      if (seq.current !== ticket) return;
      if (!response.ok) throw new Error(payload.error ?? "Could not reach the book catalogue.");

      const results = payload.results ?? [];
      // Bounded: an add session is a handful of searches, and an unbounded
      // map here would be the one thing in this dialog that only grows.
      if (cache.current.size >= 40) cache.current.delete(cache.current.keys().next().value!);
      cache.current.set(query, results);
      setState({
        status: results.length ? "ready" : "empty",
        results,
        resultQuery: query,
        message: "",
        slow: false,
      });
    } catch (error) {
      if (local.signal.aborted || seq.current !== ticket) return;
      setState((prev) => ({
        ...prev,
        status: "error",
        message: error instanceof Error ? error.message : "Could not reach the book catalogue.",
        slow: false,
      }));
    } finally {
      if (seq.current === ticket) stopSlowTimer();
    }
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    stopSlowTimer();
    seq.current += 1;
    setState({ status: "idle", results: [], resultQuery: "", message: "", slow: false });
  }, []);

  return { ...state, search, reset };
}

/** Pull a blurb for a book that was just added, one at a time and quietly.
 *
 *  Coverage on the long tail is under a fifth and each call costs about a
 *  second, so this never blocks the add and never reports a failure — the
 *  description simply doesn't appear, which is also what happens for the many
 *  books that don't have one. */
export async function fetchBookDescription(workId: string): Promise<string> {
  if (!workId) return "";
  try {
    const response = await fetch(`/api/books?work=${encodeURIComponent(workId)}`, {
      cache: "no-store",
    });
    if (!response.ok) return "";
    const payload = (await response.json()) as { description?: string };
    return payload.description ?? "";
  } catch {
    return "";
  }
}
