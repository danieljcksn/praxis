import { cn } from "@/lib/cn";

/** A ghosted block that matches the footprint of the content it stands in for.
 *  Compose these into layout-accurate loading previews — never a lone spinner. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
