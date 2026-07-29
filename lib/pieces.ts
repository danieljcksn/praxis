import type { PieceStatus } from "./types";

export interface StatusMeta {
  id: PieceStatus;
  label: string;
  color: string;
  blurb: string;
}

// Ordered from "not started" to "settled". Colors are distinct but muted so a
// list of mixed statuses stays calm.
export const PIECE_STATUSES: StatusMeta[] = [
  {
    id: "backlog",
    label: "Backlog",
    color: "var(--color-status-backlog)",
    blurb: "Want to learn, not started",
  },
  {
    id: "learning",
    label: "Learning",
    color: "var(--color-status-learning)",
    blurb: "Decoding notes & fingering",
  },
  {
    id: "polishing",
    label: "Polishing",
    color: "var(--color-status-polishing)",
    blurb: "Refining tempo & musicality",
  },
  {
    id: "performance",
    label: "Performance",
    color: "var(--color-status-performance)",
    blurb: "Ready to play for others",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    color: "var(--color-status-maintenance)",
    blurb: "Learned, kept alive",
  },
];

const MAP = PIECE_STATUSES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<PieceStatus, StatusMeta>,
);

export function getStatusMeta(id: PieceStatus): StatusMeta {
  return MAP[id] ?? PIECE_STATUSES[0];
}
