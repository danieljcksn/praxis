import { cn } from "@/lib/cn";

/** A clock face that cannot jitter.
 *
 *  Instrument Serif has no tabular-figure feature, so at 9rem a `1` ticking
 *  over to a `2` would shift every character to its left. Each digit gets its
 *  own `1ch` cell (the width of a zero in the current font) and is centred in
 *  it; separators keep their natural advance. The result is rock-steady at any
 *  size in any family, with none of the mechanical look of a monospace. */
export function Digits({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline", className)}>
      {value.split("").map((char, index) =>
        char >= "0" && char <= "9" ? (
          <span key={index} className="inline-block w-[1ch] text-center">
            {char}
          </span>
        ) : (
          <span key={index} className="inline-block">
            {char}
          </span>
        ),
      )}
    </span>
  );
}
