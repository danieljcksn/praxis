"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { useElapsed } from "@/lib/hooks/useElapsed";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV, isActive, isPrimaryActive } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function Logo() {
  return (
    <Link
      href="/"
      aria-label="praxis — go to overview"
      className="group flex shrink-0 items-center gap-1.5 rounded-sm"
    >
      <span className="font-display text-title-lg text-text">praxis</span>
      <span className="h-3.5 w-[3px] rounded-full bg-accent transition-transform duration-[130ms] ease-out group-hover:scale-y-125" />
    </Link>
  );
}

/** Silent when everything is fine. A permanent "saved" badge is noise — this
 *  only speaks up while a write is genuinely in flight or has failed, and it
 *  waits out sub-second saves so it never flickers. */
function SyncStatus() {
  const status = useStore((state) => state.cloudStatus);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "synced") {
      setVisible(false);
      return;
    }
    if (status === "syncing") {
      const id = window.setTimeout(() => setVisible(true), 400);
      return () => window.clearTimeout(id);
    }
    setVisible(true);
  }, [status]);

  if (!visible) return null;
  const broken = status === "offline" || status === "error";
  const message = broken
    ? status === "offline"
      ? "Offline — changes are saved locally and will sync when you reconnect"
      : "Could not reach Supabase — changes are saved locally"
    : "Saving to Supabase";

  return (
    <span
      role="status"
      title={message}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md px-2 text-micro",
        "animate-[praxis-fade_var(--dur-control)_var(--ease-out)_both]",
        broken ? "bg-error/8 text-error" : "text-sub",
      )}
    >
      {broken ? (
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <RefreshCw className="h-3.5 w-3.5 animate-spin [animation-duration:1.4s]" aria-hidden />
      )}
      <span className="hidden sm:inline">
        {status === "offline" ? "Offline" : broken ? "Sync failed" : "Saving"}
      </span>
    </span>
  );
}

/** A running session is the app's most important transient state, so it stays
 *  visible at every breakpoint — including the ones where space is tightest. */
function SessionPill() {
  const hydrated = useHydrated();
  const status = useStore((state) => state.timer.status);
  const elapsed = useElapsed();
  if (!hydrated || status === "idle") return null;

  const running = status === "running";
  return (
    <Link
      href="/practice"
      title={running ? "Session running — go to the timer" : "Session paused — go to the timer"}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 rounded-full border px-2.5 text-mini tabnum",
        "transition-colors duration-[130ms] ease-out",
        "animate-[praxis-pop_var(--dur-control)_var(--ease-out)_both]",
        running
          ? "border-accent/20 bg-accent/8 text-accent hover:bg-accent/12"
          : "border-border-strong bg-soft text-sub-strong hover:text-text",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          running
            ? "bg-accent animate-[praxis-breathe_1.8s_ease-in-out_infinite]"
            : "bg-sub",
        )}
        aria-hidden
      />
      {formatClock(elapsed)}
      <span className="sr-only">{running ? "session running" : "session paused"}</span>
    </Link>
  );
}

/** Border and lift appear only once content has scrolled under the bar, so a
 *  page at rest reads as one uninterrupted surface. */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

export function TopNav() {
  const pathname = usePathname();
  const scrolled = useScrolled();

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:flex focus:h-10 focus:items-center focus:rounded-md focus:bg-accent focus:px-4 focus:text-sm focus:font-medium focus:text-on-accent"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "sticky top-0 z-30 w-full bg-bg/85 backdrop-blur-xl",
          "border-b transition-[border-color,box-shadow] duration-[190ms] ease-out",
          scrolled ? "border-border shadow-card" : "border-transparent",
        )}
      >
        {/* Matches the main container exactly, so the wordmark lines up with
            page content instead of drifting to the viewport edge on wide screens. */}
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Logo />

          {/* Labels only. Five words read faster than five icons, and it keeps
              the bar free of the icon soup that made it hard to scan. */}
          <nav aria-label="Primary" className="ml-5 hidden items-center gap-0.5 md:flex">
            {PRIMARY_NAV.map((item) => {
              const active = isPrimaryActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center rounded-md px-2.5 text-mini",
                    "transition-[background-color,color] duration-[130ms] ease-out",
                    active
                      ? "bg-soft-strong text-text"
                      : "text-sub hover:bg-soft hover:text-text",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <SessionPill />
            <SyncStatus />
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="Settings"
              title="Settings"
              aria-current={isActive(pathname, "/settings") ? "page" : undefined}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md",
                "transition-[background-color,color,transform] duration-[130ms] ease-out active:scale-95",
                isActive(pathname, "/settings")
                  ? "bg-soft-strong text-text"
                  : "text-sub hover:bg-soft hover:text-text",
              )}
            >
              <Settings className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      {/* Below md the same five destinations move to the thumb. Icons carry
          the meaning here, with the label under each one — never bare. Its
          accessible name differs from the bar above so the two nav landmarks
          are distinguishable in a landmark list. */}
      <nav
        aria-label="Primary, bottom bar"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-strong bg-elevated/95 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-xl md:hidden"
      >
        {PRIMARY_NAV.map((item) => {
          const active = isPrimaryActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2.5",
                "text-[0.625rem] leading-none transition-colors duration-[130ms] ease-out",
                active ? "text-accent" : "text-sub active:text-text",
              )}
            >
              <span
                className={cn(
                  "absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-accent transition-opacity duration-[190ms] ease-out",
                  active ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
