"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListMusic, Settings, Timer, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useElapsed } from "@/lib/hooks/useElapsed";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "practice", icon: Timer },
  { href: "/repertoire", label: "repertoire", icon: ListMusic },
  { href: "/history", label: "history", icon: CalendarDays },
  { href: "/stats", label: "stats", icon: TrendingUp },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SessionPill() {
  const hydrated = useHydrated();
  const status = useStore((s) => s.timer.status);
  const elapsed = useElapsed();
  if (!hydrated || status === "idle") return null;
  const running = status === "running";
  return (
    <Link
      href="/"
      title={running ? "Session running" : "Session paused"}
      className={cn(
        "ml-1 flex h-8 items-center gap-2 rounded-full border border-border-strong bg-inset pl-2.5 pr-3",
        "animate-[praxis-fade_0.2s_ease-out] transition-colors hover:border-accent/40",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          running ? "bg-accent animate-[praxis-breathe_1.6s_ease-in-out_infinite]" : "bg-sub",
        )}
      />
      <span className="tabnum text-xs text-text">{formatClock(elapsed)}</span>
    </Link>
  );
}

function Logo() {
  const hydrated = useHydrated();
  const running = useStore((s) => s.timer.status === "running") && hydrated;
  return (
    <Link href="/" className="flex items-center gap-1.5 pr-2" aria-label="praxis — home">
      <span className="text-[17px] font-semibold lowercase tracking-tight text-text">praxis</span>
      <span
        className={cn(
          "h-4 w-[3px] rounded-full bg-accent",
          running && "animate-[praxis-breathe_1.6s_ease-in-out_infinite]",
        )}
      />
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 -mx-5 mb-8 border-b border-border bg-bg/80 px-5 backdrop-blur-md sm:-mx-8 sm:px-8">
      <div className="flex h-16 items-center justify-between gap-2">
        <Logo />
        <nav className="flex items-center gap-0.5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] transition-colors duration-150 sm:px-3",
                  active ? "text-accent" : "text-sub hover:text-text",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.4 : 2} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <SessionPill />
          <Link
            href="/settings"
            aria-label="settings"
            aria-current={isActive(pathname, "/settings") ? "page" : undefined}
            className={cn(
              "ml-0.5 flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150",
              isActive(pathname, "/settings") ? "text-accent" : "text-sub hover:text-text",
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
