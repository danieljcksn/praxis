"use client";

import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /** Accessible name when there's no visible `label` next to the switch. */
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-[13px] text-sub-strong"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors duration-150",
          checked ? "bg-accent" : "border border-border-strong bg-inset",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-150",
            checked ? "translate-x-4 bg-bg" : "translate-x-0.5 bg-sub",
          )}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}
