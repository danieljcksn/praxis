import { cn } from "@/lib/cn";
import { TONE_TEXT, type Tone } from "./Card";

/** The one stat tile. Training, GitHub, Stats, and Strava each had their own
 *  before; they are the same object and now look like it.
 *
 *  Label reads first (uppercase, small), value carries the weight (display
 *  serif, tabular), detail explains the scope. Long values truncate rather
 *  than wrapping, so a row of tiles never goes ragged. */
export function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  detail?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-panel/70 p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", TONE_TEXT[tone])} />}
        <span className="eyebrow truncate text-sub" title={label}>
          {label}
        </span>
      </div>
      <p className="mt-3 truncate font-display text-display-sm tabnum text-text">{value}</p>
      {detail && (
        <p className="mt-1 truncate text-mini text-sub" title={detail}>
          {detail}
        </p>
      )}
    </div>
  );
}
