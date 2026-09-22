import { getStatusMeta } from "@/lib/pieces";
import type { PieceStatus } from "@/lib/types";
import { StatusPill } from "./StatusPill";

export function StatusBadge({ status }: { status: PieceStatus }) {
  const meta = getStatusMeta(status);
  return <StatusPill label={meta.label} color={meta.color} blurb={meta.blurb} />;
}
