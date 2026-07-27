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
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <TopNav />
        <main className="flex-1 pb-28 md:pb-16">{children}</main>
      </div>
    </>
  );
}
