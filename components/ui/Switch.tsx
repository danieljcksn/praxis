"use client";

import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /** Accessible name when there's no visible `label` next to the switch. */
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-md text-sm",
        "transition-colors duration-[130ms] ease-out",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "text-text" : "text-sub hover:text-sub-strong",
      )}
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-[130ms] ease-out",
          checked ? "border-accent bg-accent" : "border-border-strong bg-inset",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full",
            "transition-[transform,background-color] duration-[190ms] ease-out",
            checked
              ? "translate-x-[1.125rem] bg-on-accent"
              : "translate-x-[0.1875rem] bg-sub group-hover:bg-sub-strong",
          )}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}
