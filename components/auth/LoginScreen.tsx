"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-mint/[0.05] blur-[110px]" />
      </div>

      <section className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="font-display text-xl font-semibold tracking-[-0.035em] text-text">
            praxis
          </span>
          <span className="h-5 w-1 rounded-full bg-accent" />
        </div>

        <div className="rounded-3xl border border-border-strong bg-panel/90 p-6 shadow-login backdrop-blur-xl sm:p-8">
          <div className="mb-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/15 bg-accent/8 text-accent">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.035em] text-text">
              Your private rhythm.
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-sub">
              Practice, habits, and training live behind one shared password.
            </p>
          </div>

          <form onSubmit={submit}>
            <label
              htmlFor="password"
              className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-sub"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              className="h-12 w-full rounded-xl border border-border-strong bg-inset px-4 text-[14px] text-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-sub focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(240,196,88,0.08)]"
              placeholder="Enter password"
              aria-describedby={error ? "login-error" : undefined}
            />
            <div className="h-7 pt-2">
              {error && (
                <p id="login-error" className="text-[11px] text-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!password}>
              Unlock Praxis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="mx-auto mt-8 grid w-[14rem] grid-cols-14 gap-1 opacity-45" aria-hidden>
          {CELLS.map((active, index) => (
            <span
              key={index}
              className="aspect-square rounded-[2px]"
              style={{
                background:
                  active
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
