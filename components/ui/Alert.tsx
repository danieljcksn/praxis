import { CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/** A calm, in-place failure notice with room for a recovery action.
 *
 *  `warning` means the data on screen is real but stale; `error` means the
 *  request failed outright. Both keep whatever was last loaded visible — a
 *  failed refresh should never blank out a working page. */
export function Alert({
  tone = "error",
  title,
  children,
  action,
  className,
}: {
  tone?: "error" | "warning";
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "error" ? TriangleAlert : CircleAlert;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-4 py-3.5 sm:flex-row sm:items-center",
        tone === "error"
          ? "border-error/20 bg-error/5 text-error"
          : "border-accent/20 bg-accent/5 text-accent",
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <p className={cn("text-mini", title ? "mt-0.5 opacity-90" : undefined)}>{children}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
