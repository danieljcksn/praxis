import type { CategoryId, Piece, PieceStatus, Session } from "./types";
import { createId } from "./id";

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
