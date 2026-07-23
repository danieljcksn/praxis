"use client";

import { useEffect, useState } from "react";

/** True only after the component has mounted on the client. Gates any UI that
 *  reads persisted (localStorage) state so the server render and the first
 *  client render agree — no hydration mismatch, honest loading states. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
