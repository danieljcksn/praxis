"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Use ${nextTheme} mode`}
      title={`Use ${nextTheme} mode`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sub",
        "transition-[background-color,color,transform] duration-150 hover:bg-soft hover:text-text active:scale-[0.95]",
        className,
      )}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" aria-hidden />
      ) : (
        <Sun className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex rounded-lg border border-border bg-inset p-1"
      role="radiogroup"
      aria-label="Color theme"
    >
      {([
        ["light", "Light", Sun],
        ["dark", "Dark", Moon],
      ] as const).map(([value, label, Icon]) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md px-3 text-[12px]",
              "transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97]",
              active ? "bg-panel text-text shadow-control" : "text-sub hover:text-text",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
