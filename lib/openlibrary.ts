import "server-only";

/** Open Library: the catalogue behind the add-a-book flow.
 *
 *  Why this runs on the server even though the API is CORS-open: Open Library
 *  grants 3 req/s to clients that identify themselves with a descriptive
 *  User-Agent and 1 req/s to everyone else — and browsers are forbidden from
 *  setting User-Agent at all. A browser-direct call is therefore permanently
 *  in the slow tier and spends the reader's own IP budget. Cover *images* are
 *  the opposite case and are loaded straight from the CDN: they are unmetered
 *  by cover id, cached for a century, and proxying them would put every byte
 *  through us for nothing.
 *
 *  Everything this module returns is a snapshot. Once a book is added its
 *  metadata is copied into the user's own record and never re-fetched to
 *  render, so the library works offline, opens instantly, and does not change
 *  under the reader because a volunteer edited a catalogue entry. */

const SEARCH_URL = "https://openlibrary.org/search.json";
const FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_name",
  "cover_i",
  "first_publish_year",
  "number_of_pages_median",
  "edition_count",
  "isbn",
].join(",");

/** Slowest legitimate search measured was ~11s (an accented Portuguese
 *  query), and the median moves around a lot. Cutting at 12s turns a slow
 *  catalogue into a designed failure rather than an open-ended hang. */
const TIMEOUT_MS = 12_000;
/** ~2.8 req/s, just under the identified-client ceiling. */
const MIN_SPACING_MS = 360;
/** Open Library has gone away for the better part of ten minutes. Hammering a
 *  host that is refusing connections is how a rate limit becomes an IP ban. */
const BREAKER_FAILURES = 3;
const BREAKER_COOLDOWN_MS = 10 * 60_000;

function userAgent(): string {
  // Open Library asks for a contact on the User-Agent of any app making
  // frequent calls. It is opt-in through an env var rather than hardcoded,
  // because an address baked into a request header is a thing the owner of
  // that address should choose to publish.
  const contact = process.env.OPENLIBRARY_CONTACT?.trim();
  return contact ? `praxis/1.0 (${contact})` : "praxis/1.0 (private reading dashboard)";
}

// ── Politeness ───────────────────────────────────────────────────────────────

let chain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;
let consecutiveFailures = 0;
let openedAt = 0;

export class CatalogueUnavailable extends Error {
  constructor(message = "The book catalogue is not responding.") {
    super(message);
    this.name = "CatalogueUnavailable";
  }
}

function breakerOpen(): boolean {
  if (consecutiveFailures < BREAKER_FAILURES) return false;
  if (Date.now() - openedAt < BREAKER_COOLDOWN_MS) return true;
  consecutiveFailures = 0;
  return false;
}

/** One request at a time, spaced. Parallel fan-out is the documented way to
 *  get 429'd here, and a user typing quickly is exactly the shape that would
 *  produce it. */
function queued<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = MIN_SPACING_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  chain = run.catch(() => undefined);
  return run;
}

/** Retry once, on transport failures only.
 *
 *  Open Library drops connections and 5xxs intermittently — a single
 *  `TypeError: fetch failed` is routine, not an outage — and surfacing that
 *  as an error the reader has to dismiss and retry by hand is a worse lie
 *  than waiting another second. A 4xx is not retried: that is an answer. */
const RETRY_DELAY_MS = 700;

export class Abandoned extends Error {}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  if (breakerOpen()) throw new CatalogueUnavailable();
  try {
    let result: unknown;
    try {
      result = await requestJson(url, signal);
    } catch (error) {
      if (error instanceof Abandoned || !(error instanceof RetryableFailure)) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      result = await requestJson(url, signal);
    }
    consecutiveFailures = 0;
    return result;
  } catch (error) {
    // A search the reader walked away from is not evidence that the
    // catalogue is down.
    if (error instanceof Abandoned) throw error;
    // Counted here, once per operation. Counting each attempt would let two
    // failed searches trip a three-strike breaker and blackout the
    // catalogue for ten minutes.
    consecutiveFailures += 1;
    if (consecutiveFailures >= BREAKER_FAILURES) openedAt = Date.now();
    throw error;
  }
}

class RetryableFailure extends CatalogueUnavailable {}

async function requestJson(url: string, signal?: AbortSignal): Promise<unknown> {
  return queued(async () => {
    // Checked after the wait, not before it: a request that has been sitting
    // behind the throttle while its reader typed something else should give
    // up its slot rather than spend one of the three-per-second on an answer
    // nobody will see.
    if (signal?.aborted) throw new Abandoned();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { "user-agent": userAgent(), accept: "application/json" },
        signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
        cache: "no-store",
      });
      // `.json` on this host answers a miss with ~33 KB of HTML and a 404, so
      // the content type is checked before anything is parsed.
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.includes("json")) {
        const message = `Open Library replied ${response.status}.`;
        throw response.status >= 500 || response.status === 429
          ? new RetryableFailure(message)
          : new CatalogueUnavailable(message);
      }
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw new Abandoned();
      // The client only ever sees one sentence, so the real cause has to land
      // in the server log or an outage is undiagnosable.
      console.error("Open Library request failed", url, error);
      // A thrown TypeError here is the transport giving up, which is exactly
      // the case worth trying again.
      throw error instanceof CatalogueUnavailable ? error : new RetryableFailure();
    } finally {
      clearTimeout(timer);
    }
  });
}

// ── Normalization ────────────────────────────────────────────────────────────

export interface BookCandidate {
  workId: string;
  title: string;
  subtitle: string;
  author: string;
  coverId: number | null;
  publishedYear: number | null;
  /** `number_of_pages_median` — a median across every edition, and wrong often
   *  enough that the UI always lets it be overridden. */
  length: number | null;
  isbn: string;
  /** The only honest popularity signal in the response: the canonical Dune
   *  carries ~100 editions, a mis-ranked namesake carries one. */
  editionCount: number;
}

interface SearchDoc {
  key?: unknown;
  title?: unknown;
  subtitle?: unknown;
  author_name?: unknown;
  cover_i?: unknown;
  first_publish_year?: unknown;
  number_of_pages_median?: unknown;
  edition_count?: unknown;
  isbn?: unknown;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;

function toCandidate(doc: SearchDoc): BookCandidate | null {
  const workId = typeof doc.key === "string" ? doc.key : "";
  const title = typeof doc.title === "string" ? doc.title.trim() : "";
  if (!workId || !title) return null;

  const authors = Array.isArray(doc.author_name)
    ? doc.author_name.filter((name): name is string => typeof name === "string")
    : [];

  // The isbn array is unordered and spans every edition in every language, so
  // picking one is arbitrary. A 13-digit one is kept purely as a dedupe key.
  const isbnList = Array.isArray(doc.isbn)
    ? doc.isbn.filter((value): value is string => typeof value === "string")
    : [];
  const isbn = isbnList.find((value) => value.length === 13) ?? "";

  // A length under 20 is an artefact of the median — omnibus editions report
  // things like 3 pages — not a real book.
  const length = num(doc.number_of_pages_median);

  return {
    workId,
    title,
    subtitle: typeof doc.subtitle === "string" ? doc.subtitle.trim() : "",
    author: authors.slice(0, 2).join(" & ") + (authors.length > 2 ? " and others" : ""),
    coverId: num(doc.cover_i),
    publishedYear: num(doc.first_publish_year),
    length: length != null && length >= 20 ? length : null,
    isbn,
    editionCount: num(doc.edition_count) ?? 0,
  };
}

function readDocs(payload: unknown): BookCandidate[] {
  const docs = (payload as { docs?: unknown })?.docs;
  if (!Array.isArray(docs)) return [];
  const seen = new Set<string>();
  const out: BookCandidate[] = [];
  for (const doc of docs) {
    const candidate = toCandidate(doc as SearchDoc);
    if (!candidate || seen.has(candidate.workId)) continue;
    seen.add(candidate.workId);
    out.push(candidate);
  }
  return out;
}

const ISBN_PATTERN = /^(?:97[89])?\d{9}[\dXx]$/;

function isbnOf(query: string): string | null {
  const flat = query.replace(/[\s-]/g, "");
  return ISBN_PATTERN.test(flat) ? flat : null;
}

// ── Search ───────────────────────────────────────────────────────────────────

/** Search, with a ladder underneath it.
 *
 *  `q` is a strict AND across every token, so one stray subtitle word, one
 *  misspelled surname, or — verifiably — one hyphen can collapse a perfectly
 *  good query to zero results. Rather than show "no matches" for a query that
 *  was merely over-specified, a miss is retried as a structured title search
 *  and then as title + author, which is reliable where free text is not. */
export async function searchBooks(
  query: string,
  limit = 14,
  signal?: AbortSignal,
): Promise<BookCandidate[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = (params: Record<string, string>) => {
    const search = new URLSearchParams({ ...params, fields: FIELDS, limit: String(limit) });
    return `${SEARCH_URL}?${search.toString()}`;
  };

  const isbn = isbnOf(trimmed);
  if (isbn) {
    const byIsbn = readDocs(await getJson(url({ q: isbn }), signal));
    if (byIsbn.length > 0) return byIsbn;
  }

  // Hyphens tokenize badly: "Data-Intensive Kleppmann" finds nothing while
  // "Data Intensive Kleppmann" finds exactly the right book.
  const relaxed = trimmed.replace(/[-–—]/g, " ").replace(/\s+/g, " ");
  const first = readDocs(await getJson(url({ q: relaxed }), signal));
  if (first.length > 0) return first;

  const byTitle = readDocs(await getJson(url({ title: trimmed }), signal));
  if (byTitle.length > 0) return byTitle;

  // Last rung: assume the tail of the query is an author.
  const words = relaxed.split(" ");
  if (words.length < 2) return [];
  const author = words.slice(-1).join(" ");
  const title = words.slice(0, -1).join(" ");
  return readDocs(await getJson(url({ title, author }), signal));
}

// ── Descriptions ─────────────────────────────────────────────────────────────

/** Catalogue blurbs are markdown with \r\n, a `----------` rule, and a trailing
 *  dump of links to related works. Rendered raw they are a wall of noise, and
 *  they are frequently publisher copy shouting in capitals — so they are
 *  cleaned hard and clamped before they are ever allowed on screen. */
function cleanDescription(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n?-{6,}\n?/)[0]
    .replace(/\[([^\]]+)\]\((?:[^)]*)\)/g, "$1")
    .replace(/^\s*(?:Also contained in|Contains|Source|Containing works).*$/gim, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function unwrapDescription(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { value?: unknown }).value === "string") {
    return (value as { value: string }).value;
  }
  return "";
}

/** A work record's blurb.
 *
 *  Fetched lazily — one book at a time, after it has already been added —
 *  because coverage on the long tail is under a fifth and each call costs
 *  about a second. Eager-fetching a page of results would be twenty requests
 *  for three descriptions and an instant rate limit.
 *
 *  Some work records are redirect stubs that answer 200 with no title and no
 *  description, so one hop is followed before giving up. */
const WORK_KEY = /^\/works\/OL\d+W$/;

export async function fetchDescription(workId: string): Promise<string> {
  if (!WORK_KEY.test(workId)) return "";

  let key = workId;
  for (let hop = 0; hop < 2; hop += 1) {
    // Rebuilt through the URL parser and origin-checked every hop. Open
    // Library is a public wiki, so a redirect's `location` is attacker-
    // controllable: a value like "@example.com/x" interpolated into a
    // template string parses "openlibrary.org" as userinfo and sends the
    // request somewhere else entirely.
    const url = new URL(`${key}.json`, "https://openlibrary.org");
    if (url.origin !== "https://openlibrary.org") return "";

    const payload = (await getJson(url.toString())) as {
      type?: { key?: string };
      location?: string;
      description?: unknown;
    };
    if (
      payload?.type?.key === "/type/redirect" &&
      typeof payload.location === "string" &&
      WORK_KEY.test(payload.location)
    ) {
      key = payload.location;
      continue;
    }
    return cleanDescription(unwrapDescription(payload?.description)).slice(0, 800);
  }
  return "";
}
