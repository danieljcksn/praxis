"use client";

import { useCallback, useEffect, useState } from "react";
import { sanitizeProfile, type BodyProfile } from "@/lib/training-plan/engine";

const KEY = "praxis-training-profile";

/** Kept per device and out of the cloud snapshot on purpose: body measurements
 *  never leave the browser, and adding them would force a snapshot version bump
 *  across every open device. */
export function useBodyProfile() {
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      setProfile(raw ? sanitizeProfile(JSON.parse(raw)) : null);
    } catch {
      setProfile(null);
    }
    setReady(true);
  }, []);

  const save = useCallback((next: BodyProfile) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Still usable for this visit when storage is blocked.
    }
    setProfile(next);
  }, []);

  return { profile, ready, save };
}
