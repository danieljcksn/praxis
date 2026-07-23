"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const inputClass = cn(
  "w-full rounded-lg border border-border bg-inset px-3 text-sm text-text",
  "placeholder:text-sub transition-colors duration-150",
  "hover:border-border-strong focus:border-accent/60",
  "disabled:opacity-40",
);

const labelClass = "text-[11px] font-medium uppercase tracking-[0.08em] text-sub-strong";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        {/* Only a real <label> when it points at a control; otherwise a plain
            caption, so we never emit a label with no association. */}
        {htmlFor ? (
          <label htmlFor={htmlFor} className={labelClass}>
            {label}
          </label>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        {hint && <span className="text-[11px] text-sub">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, "h-10", className)} {...props} />;
  },
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClass, "min-h-20 resize-none py-2.5 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(inputClass, "h-10 cursor-pointer appearance-none pr-9", className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
      </div>
    );
  },
);
