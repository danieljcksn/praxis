"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "default" | "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

// `default` is the signature move: a calm recessed control that floods with
// the accent on hover. `primary` is already-accent and is used once per view.
const VARIANTS: Record<Variant, string> = {
  default: "bg-panel text-sub-strong hover:bg-accent hover:text-on-accent active:bg-accent-dim",
  primary: "bg-accent text-on-accent hover:bg-accent-dim active:bg-accent-dim",
  ghost: "bg-transparent text-sub hover:bg-soft hover:text-text active:bg-soft-strong",
  subtle: "bg-inset text-sub-strong hover:bg-panel-hover hover:text-text active:bg-inset",
  danger: "bg-panel text-error hover:bg-error hover:text-on-color active:bg-error-dim",
};

// One radius for every control in the app. Height steps are 32 / 40 / 48 so
// every size clears the 32px minimum target, and md clears 40.
const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-mini",
  md: "h-10 gap-2 rounded-md px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-md px-6 text-base",
};

const BASE = cn(
  "relative inline-flex select-none items-center justify-center font-medium whitespace-nowrap",
  "transition-[background-color,color,transform,opacity] duration-[130ms] ease-out",
  "active:scale-[0.98]",
  "disabled:pointer-events-none disabled:opacity-40",
  "aria-disabled:pointer-events-none aria-disabled:opacity-40",
);

export function buttonStyles(variant: Variant = "default", size: Size = "md", className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "default",
    size = "md",
    loading = false,
    block = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles(variant, size, cn(block && "w-full", className))}
      {...props}
    >
      {/* The spinner replaces the label in place, so the control never
          changes width mid-action and the row it sits in cannot reflow. */}
      {loading && <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />}
      <span
        className={cn(
          "inline-flex items-center",
          loading && "invisible",
          size === "sm" ? "gap-1.5" : "gap-2",
        )}
      >
        {children}
      </span>
    </button>
  );
});

/** A link that looks like a button. Exists so navigation targets are never
 *  built as `<Link><Button/></Link>` — a `<button>` inside an `<a>` is invalid
 *  and breaks keyboard activation. */
export function ButtonLink({
  href,
  variant = "default",
  size = "md",
  block = false,
  className,
  children,
  external,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  external?: boolean;
}) {
  const classes = buttonStyles(variant, size, cn(block && "w-full", className));
  const inner = (
    <span className={cn("inline-flex items-center", size === "sm" ? "gap-1.5" : "gap-2")}>
      {children}
    </span>
  );

  if (external) {
    return (
      <a href={href} className={classes} {...props}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {inner}
    </Link>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  /** Required: an icon with no text needs both a name and a tooltip. */
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", label, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANTS[variant],
        "rounded-md",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
