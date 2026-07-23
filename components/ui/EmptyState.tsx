import { cn } from "@/lib/cn";

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
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong",
        "bg-panel/40 px-6 py-16 text-center",
        "animate-[praxis-fade-in_0.3s_cubic-bezier(0.22,1,0.36,1)_both]",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-inset text-sub">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-medium text-text">{title}</h3>
      <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-sub">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
