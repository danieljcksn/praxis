import { getStatusMeta } from "@/lib/pieces";
import type { PieceStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: PieceStatus }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-micro font-medium whitespace-nowrap"
      style={{
        color: meta.color,
        backgroundColor: `color-mix(in srgb, ${meta.color} 13%, transparent)`,
      }}
      title={meta.blurb}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}
