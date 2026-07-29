"use client";

import { usePathname } from "next/navigation";
import { CloudSync } from "@/components/layout/CloudSync";
import { TimerLifecycle } from "@/components/layout/TimerLifecycle";
import { TopNav } from "@/components/layout/TopNav";
import { SectionNav } from "@/components/layout/SectionNav";
import { PRACTICE_NAV, inPracticeSection } from "@/lib/nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  const practice = inPracticeSection(pathname);

  return (
    <>
      <CloudSync />
      <TimerLifecycle />
      <div className="flex min-h-dvh w-full flex-col">
        <TopNav />
        {/* Bottom padding clears the mobile tab bar plus its safe area. */}
        <main
          id="main"
          className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-16 lg:px-8"
        >
          {practice && (
            <div className="mb-7">
              <SectionNav items={PRACTICE_NAV} label="Practice views" />
            </div>
          )}
          {/* Keyed on the route so each view plays its entrance once, giving
              navigation a sense of arrival instead of a hard swap. */}
          <div key={pathname} className="enter">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
