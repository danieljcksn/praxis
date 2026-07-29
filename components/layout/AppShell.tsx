"use client";

import { usePathname } from "next/navigation";
import { CloudSync } from "@/components/layout/CloudSync";
import { TimerLifecycle } from "@/components/layout/TimerLifecycle";
import { TopNav } from "@/components/layout/TopNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  return (
    <>
      <CloudSync />
      <TimerLifecycle />
      <div className="flex min-h-dvh w-full flex-col">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 sm:px-6 md:pb-16 lg:px-8">
          {children}
        </main>
      </div>
    </>
  );
}
