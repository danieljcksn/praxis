import { cn } from "@/lib/cn";

/** A dot and a word, tinted from one color.
 *
 *  Repertoire pieces and books both have a lifecycle, and the pill that shows
 *  it is the same object in both places — so it lives here and takes the meta
 *  rather than the enum. Color is never the only channel: the word is always
 *  present, which is what makes the shelf legible to a color-blind reader. */
export function StatusPill({
  label,
  color,
  blurb,
  className,
}: {
  label: string;
  color: string;
  blurb?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5",
        "text-micro font-medium whitespace-nowrap",
        className,
      )}
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`,
      }}
      title={blurb}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}
