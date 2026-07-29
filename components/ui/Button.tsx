"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "default" | "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

// The signature Monkeytype move lives in `default`: a calm recessed button that
// floods with the accent (and dark text) on hover. `primary` is already-accent.
const VARIANTS: Record<Variant, string> = {
  default:
    "bg-panel text-sub-strong hover:bg-accent hover:text-bg active:bg-accent-dim",
  primary:
    "bg-accent text-bg hover:bg-accent-dim active:bg-accent-dim",
  ghost:
    "bg-transparent text-sub hover:bg-panel hover:text-text active:bg-panel",
  subtle:
    "bg-inset text-sub-strong hover:bg-panel-hover hover:text-text active:bg-inset",
  danger:
    "bg-panel text-error hover:bg-error hover:text-bg active:bg-error-dim",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-13 px-6 text-[15px] gap-2.5 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", loading = false, block = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex select-none items-center justify-center font-medium",
        "transition-[background-color,color,transform,opacity] duration-[130ms] ease-out",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />}
      <span className={cn("inline-flex items-center", loading && "invisible", size === "sm" ? "gap-1.5" : "gap-2")}>
        {children}
      </span>
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
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
        "inline-flex items-center justify-center rounded-lg",
        "transition-[background-color,color,transform] duration-[130ms] ease-out active:scale-95",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
