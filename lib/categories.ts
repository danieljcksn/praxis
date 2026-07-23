import type { CategoryId } from "./types";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  /** One-word gloss shown under the label in the picker. */
  hint: string;
  /** Hue used for chips, the category donut, and session accents. */
  color: string;
}

// A fixed, deliberately small palette. Colors are muted (the accent gold is
// reserved for the timer + primary actions) but each is distinct enough to read
// at a glance in the stats donut and session list.
export const CATEGORIES: CategoryDef[] = [
  { id: "repertoire", label: "Repertoire", hint: "working on pieces", color: "#e2b714" },
  { id: "technique", label: "Technique", hint: "arpeggios, slurs, tremolo", color: "#7eb8da" },
  { id: "scales", label: "Scales", hint: "scales & shifts", color: "#9d8cd6" },
  { id: "sight-reading", label: "Sight-reading", hint: "reading cold", color: "#5fb99c" },
  { id: "theory", label: "Theory & ear", hint: "harmony, ear training", color: "#d68c6a" },
  { id: "free", label: "Free play", hint: "just play", color: "#a9a196" },
];

const CATEGORY_MAP: Record<CategoryId, CategoryDef> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, CategoryDef>,
);

export function getCategory(id: CategoryId): CategoryDef {
  return CATEGORY_MAP[id] ?? CATEGORIES[CATEGORIES.length - 1];
}
