import { cn } from "@/lib/cn";

/** An empty state should be useful, not apologetic: name the thing that isn't
 *  here yet, say what it would give you, and offer the one action that starts
 *  it. Always dashed — a solid border reads as content that failed to load. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong",
        "bg-panel/40 px-6 py-16 text-center",
        "animate-[praxis-enter_var(--dur-page)_var(--ease-out)_both]",
        className,
      )}
    >
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-inset text-sub">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-title text-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-sub">{description}</p>
      {action && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
