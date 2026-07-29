"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";

// A deterministic contribution-grid motif — the app's own signature, not
// decoration for its own sake. Fixed pattern so it never shifts on rerender.
const CELLS = Array.from({ length: 98 }, (_, index) => (index * 13 + 7) % 9 > 3);

export function LoginScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not unlock Praxis.");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") ? next : "/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not unlock Praxis.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <ThemeToggle className="absolute right-5 top-5 z-20 border border-border bg-panel/70 shadow-card" />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-mint/[0.05] blur-[110px]" />
      </div>

      <section className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-1.5">
          <span className="font-display text-display-sm text-text">praxis</span>
          <span className="h-4 w-[3px] rounded-full bg-accent" />
        </div>

        <div className="rounded-xl border border-border-strong bg-panel/90 p-6 shadow-login backdrop-blur-xl sm:p-8">
          <div className="mb-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-md border border-accent/15 bg-accent/8 text-accent">
              <LockKeyhole className="h-5 w-5" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-display-sm text-text">Your private rhythm.</h1>
            <p className="mt-2 text-sm text-sub">
              Practice, habits, and training live behind one shared password.
            </p>
          </div>

          <form onSubmit={submit} noValidate>
            <label htmlFor="password" className="eyebrow mb-2 block text-sub-strong">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              placeholder="Enter password"
              className="h-12 w-full rounded-md border border-border-strong bg-inset px-4 text-base text-text outline-none transition-[border-color,box-shadow] duration-[130ms] placeholder:text-sub focus-visible:border-accent/50 focus-visible:shadow-focus"
            />
            {/* Reserved height so an error never shifts the button downward. */}
            <div className="h-7 pt-2">
              {error && (
                <p id="login-error" role="alert" className="text-micro text-error">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!password}>
              Unlock Praxis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        </div>

        <div className="mx-auto mt-8 grid w-[14rem] grid-cols-14 gap-1 opacity-40" aria-hidden>
          {CELLS.map((active, index) => (
            <span
              key={index}
              className="aspect-square rounded-[2px]"
              style={{
                background: active
                  ? index % 5 === 0
                    ? "var(--color-accent)"
                    : "color-mix(in srgb, var(--color-accent) 50%, var(--color-inset))"
                  : "var(--color-inset)",
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
