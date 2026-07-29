import { cn } from "@/lib/cn";

/** A ghosted block that matches the footprint of the content it stands in for.
 *  Compose these into layout-accurate loading previews — never a lone spinner.
 *
 *  `delay` staggers sibling groups by 40–80ms so a loading screen assembles
 *  organically instead of flashing in as one mechanical block. */
export function Skeleton({
  className,
  delay = 0,
  style,
}: {
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cn("skeleton", className)}
      style={{ ...style, "--enter-delay": `${delay}ms` } as React.CSSProperties}
    />
  );
}

/** Wraps a whole loading view so assistive tech announces the wait once,
 *  instead of nothing at all. */
export function SkeletonScreen({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-label={label} aria-busy className={className}>
      {children}
    </div>
  );
}
