import Link from "next/link";
import { cn } from "@/lib/cn";

/** Domain hues. Every eyebrow, badge, and metric icon in the app draws its
 *  color from this one map, so a surface's subject is always the same color
 *  wherever it appears. */
export type Tone = "accent" | "mint" | "hevy" | "strava" | "github" | "neutral";

const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  mint: "text-mint",
  hevy: "text-hevy",
  strava: "text-strava",
  github: "text-github",
  neutral: "text-sub",
};

const TONE_BADGE: Record<Tone, string> = {
  accent: "border-accent/15 bg-accent/8 text-accent",
  mint: "border-mint/15 bg-mint/8 text-mint",
  hevy: "border-hevy/15 bg-hevy/8 text-hevy",
  strava: "border-strava/15 bg-strava/8 text-strava",
  github: "border-github/15 bg-github/8 text-github",
  neutral: "border-border bg-soft text-sub",
};

/** The single card surface used across every page. One radius, one border,
 *  one elevation — the app had four variants of this before. */
export function Card({
  className,
  children,
  padded = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-panel/70 shadow-card",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const CARD_HOVER_BORDER: Record<Tone, string> = {
  accent: "hover:border-accent/25",
  mint: "hover:border-mint/25",
  hevy: "hover:border-hevy/25",
  strava: "hover:border-strava/25",
  github: "hover:border-github/25",
  neutral: "hover:border-border-strong",
};

/** Same surface, but the whole card is a target. Routes through next/link so
 *  in-app navigation stays client-side; pass `external` for anything that
 *  genuinely leaves the app. */
export function CardLink({
  href,
  className,
  children,
  tone = "accent",
  external,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  tone?: Tone;
  external?: boolean;
}) {
  const classes = cn(
    "group block rounded-lg border border-border bg-panel/70 p-5 shadow-card sm:p-6",
    "transition-[border-color,background-color,transform] duration-[130ms] ease-out",
    "hover:bg-panel active:scale-[0.995]",
    CARD_HOVER_BORDER[tone],
    className,
  );

  if (external) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}

/** Eyebrow → title → description, in that order, at every call site. The
 *  eyebrow names the subject; the title says what you're looking at. */
export function CardHeader({
  eyebrow,
  tone = "neutral",
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className={cn("eyebrow mb-2", TONE_TEXT[tone])}>{eyebrow}</p>}
        <h2 className="text-title text-text">{title}</h2>
        {description && <p className="mt-1 text-sm text-sub">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Small stated fact attached to a card — a unit, a scope, a mode. Never a
 *  control; controls are Buttons. */
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-micro whitespace-nowrap",
        TONE_BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export { TONE_TEXT };
