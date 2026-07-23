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
        "pointer-events-auto flex items-center gap-2.5 rounded-lg border border-border-strong",
        "bg-elevated px-3.5 py-2.5 text-[13px] text-text",
        "animate-[praxis-fade-in_0.24s_cubic-bezier(0.22,1,0.36,1)_both]",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", color)} />
      <span className="min-w-0">{toast.message}</span>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
