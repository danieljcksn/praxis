"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { activeSectionHref, type NavItem } from "@/lib/nav";

/** Second-level navigation for a cluster of pages that are three or four
 *  views of one subject. Quieter than the header on purpose: no fills, just
 *  an underline
 *  on the active view, so it reads as "where in this section" rather than
 *  competing with "where in the app". */
export function SectionNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  const activeHref = activeSectionHref(pathname, items);

  return (
    <nav aria-label={label} className="border-b border-border">
      <div className="no-scrollbar -mb-px flex gap-1 overflow-x-auto max-sm:edge-fade-x">
        {items.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.hint}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-10 shrink-0 items-center gap-1.5 px-2.5 text-mini",
                "transition-colors duration-[130ms] ease-out",
                active ? "text-text" : "text-sub hover:text-text",
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 transition-colors duration-[130ms] ease-out",
                  active ? "text-accent" : "text-sub group-hover:text-sub-strong",
                )}
                aria-hidden
              />
              {item.label}
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-accent",
                  "transition-opacity duration-[190ms] ease-out",
                  active ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
