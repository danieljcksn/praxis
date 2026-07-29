import { cn } from "@/lib/cn";
import { TONE_TEXT, type Tone } from "@/components/ui/Card";

/** The top of every page: what section you're in, what this page is, and the
 *  one action that belongs to it. Title is the only serif on most screens,
 *  which is what makes it read as the anchor. */
export function PageHeader({
  eyebrow,
  tone = "accent",
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  tone?: Tone;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className={cn("eyebrow mb-2.5", TONE_TEXT[tone])}>{eyebrow}</p>}
        <h1 className="font-display text-display text-text">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-sub">{subtitle}</p>}
      </div>
      {/* Never shrinks below its content, and drops to its own row on small
          screens rather than crushing the title. */}
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

/** A second-level heading for a major block within a page — one step down from
 *  PageHeader, one step up from CardHeader. Used where a page holds two
 *  genuinely distinct subjects, like Hevy and Strava on Training. */
export function SectionHeading({
  eyebrow,
  tone = "neutral",
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  tone?: Tone;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className={cn("eyebrow mb-2", TONE_TEXT[tone])}>{eyebrow}</p>}
        <h2 className="font-display text-title-lg text-text">{title}</h2>
        {subtitle && <p className="mt-1 text-mini text-sub">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
