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
            title={cat.hint}
            className={cn(
              "group flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm",
              "transition-[background-color,border-color,color] duration-[130ms] ease-out",
              active
                ? "text-text"
                : "border-border text-sub hover:border-border-strong hover:text-text",
            )}
            /* The selected chip wears its own category hue — the same color it
               has in the donut and in the session log — so the six are
               self-identifying rather than six identical gold pills. */
            style={
              active
                ? {
                    backgroundColor: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
                    borderColor: `color-mix(in srgb, ${cat.color} 32%, transparent)`,
                  }
                : undefined
            }
          >
            {showKeys && (
              <span className="hidden text-micro tabnum text-sub lg:inline">{i + 1}</span>
            )}
            <span
              className="h-2 w-2 rounded-full transition-transform duration-[130ms] group-hover:scale-110"
              style={{
                backgroundColor: active ? cat.color : "currentColor",
                opacity: active ? 1 : 0.55,
              }}
              aria-hidden
            />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
