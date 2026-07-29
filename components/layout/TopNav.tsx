"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Cloud,
  CloudOff,
  Dumbbell,
  GitGraph,
  Home,
  Library,
  Settings,
  Shapes,
  Timer,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useElapsed } from "@/lib/hooks/useElapsed";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const PRIMARY_NAV = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/habits", label: "Habits", icon: Shapes },
  { href: "/practice", label: "Practice", icon: Timer },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/github", label: "GitHub", icon: GitGraph },
  { href: "/repertoire", label: "Library", icon: Library },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 pr-3" aria-label="praxis — overview">
      <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-text">
        praxis
      </span>
      <span className="h-4 w-[3px] rounded-full bg-accent" />
    </Link>
  );
}

function SyncStatus() {
  const status = useStore((state) => state.cloudStatus);
  const offline = status === "offline" || status === "error";
  const Icon = offline ? CloudOff : Cloud;
  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 text-[10px] lg:flex",
        offline ? "text-error" : status === "syncing" ? "text-sub" : "text-sub/70",
      )}
      title={
        status === "synced"
          ? "Saved to Supabase"
          : status === "syncing"
            ? "Saving to Supabase"
            : "Cloud sync unavailable"
      }
    >
      <Icon className={cn("h-3 w-3", status === "syncing" && "animate-pulse")} />
      {status === "syncing" ? "saving" : offline ? "offline" : "saved"}
    </span>
  );
}

function SessionPill() {
  const hydrated = useHydrated();
  const status = useStore((state) => state.timer.status);
  const elapsed = useElapsed();
  if (!hydrated || status === "idle") return null;
  return (
    <Link
      href="/practice"
      className="hidden h-8 items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 text-[11px] tabnum text-accent sm:flex"
      title={status === "running" ? "Practice session running" : "Practice session paused"}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-accent",
          status === "running" && "animate-[praxis-breathe_1.6s_ease-in-out_infinite]",
        )}
      />
      {formatClock(elapsed)}
    </Link>
  );
}

function NavItem({
  item,
  pathname,
  mobile,
}: {
  item: (typeof PRIMARY_NAV)[number];
  pathname: string;
  mobile?: boolean;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        mobile
          ? "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px]"
          : "flex h-9 items-center gap-0 rounded-lg px-3 text-[12px] lg:gap-2",
        "transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
        active
          ? mobile
            ? "text-accent"
            : "bg-soft text-text"
          : "text-sub hover:text-text",
      )}
    >
      <Icon className={cn(mobile ? "h-[18px] w-[18px]" : "h-4 w-4", active && "text-accent")} />
      <span className={mobile ? undefined : "hidden lg:inline"}>{item.label}</span>
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 mb-8 w-full border-b border-border bg-bg/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex h-16 w-full items-center justify-between gap-3">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {PRIMARY_NAV.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <SyncStatus />
            <SessionPill />
            <ThemeToggle />
            <Link
              href="/history"
              aria-label="History"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150",
                isActive(pathname, "/history") ? "bg-soft text-accent" : "text-sub hover:text-text",
              )}
            >
              <BookOpen className="h-4 w-4" />
            </Link>
            <Link
              href="/stats"
              aria-label="Stats"
              className={cn(
                "hidden h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 sm:flex",
                isActive(pathname, "/stats") ? "bg-soft text-accent" : "text-sub hover:text-text",
              )}
            >
              <BarChart3 className="h-4 w-4" />
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150",
                isActive(pathname, "/settings") ? "bg-soft text-accent" : "text-sub hover:text-text",
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-hidden border-x-0 border-t border-border-strong bg-elevated/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-xl md:hidden">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} mobile />
        ))}
      </nav>
    </>
  );
}
