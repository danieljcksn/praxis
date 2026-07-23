import { getStatusMeta } from "@/lib/pieces";
import type { PieceStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: PieceStatus }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: meta.color, backgroundColor: `${meta.color}1f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}
