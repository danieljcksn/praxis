"use client";

import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { cn } from "@/lib/cn";

/** The 6 practice-kind chips. Shown on the timer and in the finish dialog.
 *  Keycap numbers hint the 1–6 hotkeys on wide screens. */
export function CategoryChips({
  value,
  onChange,
  showKeys = false,
}: {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
  showKeys?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {CATEGORIES.map((cat, i) => {
        const active = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(cat.id)}
            className={cn(
              "group flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-[background-color,border-color,color,transform] duration-150",
              active
                ? "border-transparent bg-accent/12 text-text"
                : "border-border text-sub hover:border-border-strong hover:text-text",
            )}
          >
            {showKeys && (
              <span className="hidden text-[10px] tabnum text-sub lg:inline">{i + 1}</span>
            )}
            <span
              className="h-2 w-2 rounded-full transition-transform duration-150 group-hover:scale-110"
              style={{ backgroundColor: active ? cat.color : "currentColor", opacity: active ? 1 : 0.55 }}
            />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
