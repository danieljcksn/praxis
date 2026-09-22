"use client";

import { cn } from "@/lib/cn";

/** A status filter that states what it holds before you commit to it.
 *
 *  The count is the whole point: the number must always match what pressing
 *  the chip will show, which means callers compute it against the set *before*
 *  the status filter is applied. Lives here rather than in one screen because
 *  the repertoire and the library are the same object with different nouns. */
export function FilterChip({
  active,
  color,
  count,
  title,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  count: number;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-mini",
        "transition-[background-color,border-color,color] duration-[130ms] ease-out",
        active
          ? "border-border-strong bg-soft-strong text-text"
          : "border-border text-sub hover:border-border-strong hover:text-text",
      )}
    >
      {color && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: active ? color : "currentColor", opacity: active ? 1 : 0.5 }}
          aria-hidden
        />
      )}
      {children}
      {/* Full `--color-sub`, never diluted: at 70% the count drops to 3.3:1
          on the dark canvas and 2.9:1 on warm paper, which would make the
          most informative part of the chip the least readable. */}
      <span className={cn("tabnum", active ? "text-sub-strong" : "text-sub")}>{count}</span>
    </button>
  );
}
