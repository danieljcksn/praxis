import type { Metadata, Viewport } from "next";
import "./globals.css";
import { instrumentSans, instrumentSerif } from "./fonts";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastViewport } from "@/components/ui/Toast";

// Runs before first paint so the correct palette is on the document from the
// very first frame — no flash of the wrong theme, ever.
const themeInitializer = `
  (() => {
    try {
      const saved = window.localStorage.getItem("praxis-theme");
      const theme = saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    }
  })();
`;

export const metadata: Metadata = {
  title: {
    default: "praxis — your rhythm, made visible",
    template: "%s · praxis",
  },
  description:
    "A private dashboard for practice, habits, training, and GitHub activity.",
  applicationName: "praxis",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <ToastViewport />
        </ThemeProvider>
      </body>
    </html>
  );
}
