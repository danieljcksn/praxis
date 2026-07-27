"use client";

import { useStore } from "@/lib/store";

/** True after Zustand has restored its persisted state. Using the store's
 *  hydration signal keeps every screen aligned with cloud sync and avoids a
 *  second, component-local loading lifecycle. */
export function useHydrated(): boolean {
  return useStore((state) => state.hasHydrated);
}
