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
  { id: "backlog", label: "Backlog", color: "#646669", blurb: "Want to learn, not started" },
  { id: "learning", label: "Learning", color: "#7eb8da", blurb: "Decoding notes & fingering" },
  { id: "polishing", label: "Polishing", color: "#d68c6a", blurb: "Refining tempo & musicality" },
  { id: "performance", label: "Performance", color: "#5fb99c", blurb: "Ready to play for others" },
  { id: "maintenance", label: "Maintenance", color: "#9d8cd6", blurb: "Learned, kept alive" },
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
