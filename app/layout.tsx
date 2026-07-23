import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { TimerLifecycle } from "@/components/layout/TimerLifecycle";
import { ToastViewport } from "@/components/ui/Toast";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: {
    default: "praxis — classical guitar practice",
    template: "%s · praxis",
  },
  description:
    "Track your classical guitar practice: time your sessions, keep your repertoire, and check your stats.",
  applicationName: "praxis",
};

export const viewport: Viewport = {
  themeColor: "#323437",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="min-h-dvh antialiased">
        <TimerLifecycle />
        <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 sm:px-8">
          <TopNav />
          <main className="flex-1 pb-24">{children}</main>
        </div>
        <ToastViewport />
      </body>
    </html>
  );
}
