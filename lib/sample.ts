import type { Book, BookStatus, CategoryId, Piece, PieceStatus, ReadingEvent, Session } from "./types";
import { createId, createShortId } from "./id";
import { startOfDay } from "./time";

// Deterministic pseudo-random so the sample looks the same-ish each load without
// pulling in a dependency. Seeded LCG.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const SAMPLE_PIECES: Array<Omit<Piece, "id" | "addedAt" | "archived">> = [
  { title: "Prelúdio No. 1", composer: "Heitor Villa-Lobos", status: "polishing", difficulty: 3, notes: "Watch the rubato in the middle section." },
  { title: "Lágrima", composer: "Francisco Tárrega", status: "maintenance", difficulty: 2, notes: "" },
  { title: "Asturias (Leyenda)", composer: "Isaac Albéniz", status: "learning", difficulty: 5, notes: "Tremolo-like ostinato — keep the wrist loose." },
  { title: "Julia Florida", composer: "Agustín Barrios", status: "learning", difficulty: 4, notes: "Barcarola, feel the 6/8 lilt." },
  { title: "Bourrée in E minor", composer: "J. S. Bach", status: "performance", difficulty: 3, notes: "" },
  { title: "Study in B minor, Op. 35 No. 22", composer: "Fernando Sor", status: "maintenance", difficulty: 3, notes: "Good warm-up for legato." },
  { title: "Recuerdos de la Alhambra", composer: "Francisco Tárrega", status: "backlog", difficulty: 5, notes: "After Asturias is solid." },
];

const WEIGHTED_CATEGORIES: CategoryId[] = [
  "repertoire", "repertoire", "repertoire", "repertoire",
  "technique", "technique",
  "scales",
  "sight-reading",
  "free",
  "theory",
];

/** Build ~4 months of believable practice history plus a repertoire list. */
export function sampleData(): { sessions: Session[]; pieces: Piece[] } {
  const now = Date.now();
  const rng = makeRng(20260722);

  const pieces: Piece[] = SAMPLE_PIECES.map((p, i) => ({
    ...p,
    id: createId(),
    status: p.status as PieceStatus,
    addedAt: now - (120 - i * 8) * 86_400_000,
    archived: false,
  }));

  const activePieceIds = pieces
    .filter((p) => p.status === "learning" || p.status === "polishing" || p.status === "maintenance")
    .map((p) => p.id);

  const sessions: Session[] = [];
  const DAYS = 118;

  for (let dayOffset = DAYS; dayOffset >= 0; dayOffset--) {
    // Recent weeks are denser (a habit building). Older days are patchier.
    const recency = 1 - dayOffset / DAYS;
    const practiceChance = 0.42 + recency * 0.4;
    // Guarantee a live streak over the last 6 days so stats look alive.
    const forced = dayOffset <= 5;
    if (!forced && rng() > practiceChance) continue;

    const base = new Date(now - dayOffset * 86_400_000);
    const sessionCount = rng() > 0.82 ? 2 : 1;

    for (let k = 0; k < sessionCount; k++) {
      const hour = 18 + Math.floor(rng() * 4) + k; // evenings
      const minute = Math.floor(rng() * 60);
      const start = new Date(base);
      start.setHours(hour, minute, 0, 0);

      const category = WEIGHTED_CATEGORIES[Math.floor(rng() * WEIGHTED_CATEGORIES.length)];
      const minutes = 15 + Math.floor(rng() * 70);

      let pieceIds: string[] = [];
      if (category === "repertoire" && activePieceIds.length) {
        const count = rng() > 0.6 ? 2 : 1;
        const shuffled = [...activePieceIds].sort(() => rng() - 0.5);
        pieceIds = shuffled.slice(0, count);
      }

      const rating = rng() > 0.3 ? 2 + Math.floor(rng() * 4) : null;

      sessions.push({
        id: createId(),
        startedAt: start.getTime(),
        durationMs: minutes * 60_000,
        category,
        pieceIds,
        notes: "",
        rating,
        createdAt: start.getTime(),
      });
    }
  }

  sessions.sort((a, b) => b.startedAt - a.startedAt);
  return { sessions, pieces };
}


// ── Sample library ───────────────────────────────────────────────────────────
// Real Open Library work keys, cover ids and page counts, so the sample shelf
// renders actual jacket art rather than a wall of placeholders — and so the
// "no cover" fallback is exercised too, which is why one title deliberately
// has none.

interface SampleBook {
  title: string;
  author: string;
  status: BookStatus;
  length: number | null;
  coverId: number | null;
  publishedYear: number;
  workId: string;
  /** Days ago the book was finished, or null while it is still open. */
  finishedDaysAgo: number | null;
  /** Days ago the first page was turned. */
  startedDaysAgo: number | null;
  fraction: number;
  rating: number | null;
  tags: string[];
}

const SAMPLE_BOOKS: SampleBook[] = [
  { title: "Grande sertão: veredas", author: "João Guimarães Rosa", status: "reading", length: 504, coverId: 13909068, publishedYear: 1956, workId: "/works/OL1756937W", finishedDaysAgo: null, startedDaysAgo: 24, fraction: 0.43, rating: null, tags: ["brasil"] },
  { title: "The Rest Is Noise", author: "Alex Ross", status: "reading", length: 624, coverId: 1188468, publishedYear: 2007, workId: "/works/OL265777W", finishedDaysAgo: null, startedDaysAgo: 11, fraction: 0.21, rating: null, tags: ["music"] },
  { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", status: "finished", length: 618, coverId: 8434671, publishedYear: 2017, workId: "/works/OL19293745W", finishedDaysAgo: 19, startedDaysAgo: 68, fraction: 1, rating: 5, tags: ["work"] },
  { title: "The Dispossessed", author: "Ursula K. Le Guin", status: "finished", length: 352, coverId: 6979680, publishedYear: 1974, workId: "/works/OL59863W", finishedDaysAgo: 52, startedDaysAgo: 71, fraction: 1, rating: 5, tags: [] },
  { title: "Memórias póstumas de Brás Cubas", author: "Machado de Assis", status: "finished", length: 242, coverId: 123152, publishedYear: 1881, workId: "/works/OL1003017W", finishedDaysAgo: 96, startedDaysAgo: 110, fraction: 1, rating: 4, tags: ["brasil"] },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", status: "paused", length: 528, coverId: 13290711, publishedYear: 2011, workId: "/works/OL15992072W", finishedDaysAgo: null, startedDaysAgo: 140, fraction: 0.38, rating: null, tags: [] },
  { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", status: "backlog", length: 304, coverId: 10618463, publishedYear: 1969, workId: "/works/OL59800W", finishedDaysAgo: null, startedDaysAgo: null, fraction: 0, rating: null, tags: [] },
  { title: "Caderno de estudos — Villa-Lobos", author: "", status: "backlog", length: null, coverId: null, publishedYear: 1953, workId: "", finishedDaysAgo: null, startedDaysAgo: null, fraction: 0, rating: null, tags: ["music"] },
];

/** A library with a believable reading history behind it: two books open, a
 *  finished shelf spread across the year, one paused, and one with no cover
 *  at all so the typographic fallback is on screen from the first load. */
export function sampleBooks(): { books: Book[]; readingEvents: ReadingEvent[] } {
  const now = Date.now();
  const rng = makeRng(19560501);
  const books: Book[] = [];
  const readingEvents: ReadingEvent[] = [];

  for (const source of SAMPLE_BOOKS) {
    const id = createId();
    const startedAt =
      source.startedDaysAgo != null ? now - source.startedDaysAgo * 86_400_000 : null;
    const finishedAt =
      source.finishedDaysAgo != null ? now - source.finishedDaysAgo * 86_400_000 : null;
    const position = source.length != null ? Math.round(source.length * source.fraction) : 0;

    books.push({
      id,
      title: source.title,
      subtitle: "",
      author: source.author,
      status: source.status,
      format: "paper",
      length: source.length,
      position,
      coverId: source.coverId,
      coverUrl: "",
      isbn: "",
      publishedYear: source.publishedYear,
      workId: source.workId,
      description: "",
      rating: source.rating,
      notes: "",
      tags: source.tags,
      addedAt: (startedAt ?? now) - 3 * 86_400_000,
      startedAt,
      finishedAt,
    });

    if (startedAt == null || position === 0) continue;

    // Walk the position forward across the days the book was open, skipping
    // roughly a third of them, so the contribution grid has real texture.
    const lastDay = source.finishedDaysAgo ?? 0;
    let cursor = 0;
    const days: number[] = [];
    for (let offset = source.startedDaysAgo!; offset >= lastDay; offset -= 1) {
      if (rng() > 0.62) days.push(offset);
    }
    if (days.length === 0) days.push(source.startedDaysAgo!);

    for (let i = 0; i < days.length; i += 1) {
      const isLast = i === days.length - 1;
      const share = isLast ? position - cursor : Math.round((position / days.length) * (0.55 + rng()));
      const to = Math.min(position, cursor + Math.max(1, share));
      if (to <= cursor) continue;
      readingEvents.push({
        id: createShortId(),
        bookId: id,
        at: startOfDay(now - days[i] * 86_400_000) + 20 * 3_600_000,
        from: cursor,
        to,
      });
      cursor = to;
      if (cursor >= position) break;
    }
  }

  return { books, readingEvents };
}
