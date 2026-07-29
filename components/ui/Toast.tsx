"use client";

import { useEffect } from "react";
import { Check, Info, TriangleAlert } from "lucide-react";
import { useToasts, type Toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

const TONE = {
  default: { icon: Info, color: "text-sub-strong" },
  success: { icon: Check, color: "text-accent" },
  error: { icon: TriangleAlert, color: "text-error" },
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), 3800);
    return () => window.clearTimeout(id);
  }, [toast.id, dismiss]);

  const { icon: Icon, color } = TONE[toast.tone];
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex max-w-[min(24rem,calc(100vw-2rem))] items-center gap-2.5",
        "rounded-md border border-border-strong bg-elevated px-3.5 py-2.5 text-sm text-text shadow-card",
        "animate-[praxis-enter_var(--dur-control)_var(--ease-out)_both]",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", color)} aria-hidden />
      <span className="min-w-0">{toast.message}</span>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4",
        // Clears the mobile tab bar and its safe area; sits at the base of the
        // window once that bar is gone.
        "bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] md:bottom-6",
      )}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
