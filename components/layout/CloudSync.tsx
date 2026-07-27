"use client";

import { useEffect, useRef } from "react";
import { getCloudSnapshot, useStore, type CloudStatus } from "@/lib/store";

const SAVE_DELAY_MS = 650;
const CLOUD_LINKED_KEY = "praxis-cloud-linked";

function recordCount(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const data = value as Record<string, unknown>;
  return ["sessions", "pieces", "habits", "habitEntries"].reduce(
    (total, key) => total + (Array.isArray(data[key]) ? data[key].length : 0),
    0,
  );
}

async function saveSnapshot(serialized: string): Promise<void> {
  const response = await fetch("/api/data", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: serialized,
  });
  if (!response.ok) throw new Error("Cloud save failed");
}

export function CloudSync() {
  const hydrated = useStore((state) => state.hasHydrated);
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;

    let active = true;
    let saveTimer: number | null = null;
    let lastSerialized = "";
    let unsubscribe: (() => void) | null = null;

    const setStatus = (status: CloudStatus) => {
      if (active) useStore.getState().setCloudStatus(status);
    };

    const scheduleSave = (serialized: string) => {
      if (saveTimer) window.clearTimeout(saveTimer);
      setStatus(navigator.onLine ? "syncing" : "offline");
      saveTimer = window.setTimeout(async () => {
        try {
          await saveSnapshot(serialized);
          lastSerialized = serialized;
          setStatus("synced");
        } catch {
          setStatus(navigator.onLine ? "error" : "offline");
        }
      }, SAVE_DELAY_MS);
    };

    const start = async () => {
      setStatus("syncing");
      try {
        const response = await fetch("/api/data", { cache: "no-store" });
        if (!response.ok) throw new Error("Cloud load failed");
        const payload = (await response.json()) as { data: unknown | null };
        if (!active) return;

        if (payload.data) {
          const localSnapshot = getCloudSnapshot();
          const firstCloudLink = window.localStorage.getItem(CLOUD_LINKED_KEY) !== "1";
          if (
            firstCloudLink &&
            recordCount(payload.data) === 0 &&
            recordCount(localSnapshot) > 0
          ) {
            await saveSnapshot(JSON.stringify(localSnapshot));
          } else {
            useStore.getState().replaceCloudSnapshot(payload.data);
          }
        } else {
          await saveSnapshot(JSON.stringify(getCloudSnapshot()));
        }

        window.localStorage.setItem(CLOUD_LINKED_KEY, "1");
        lastSerialized = JSON.stringify(getCloudSnapshot());
        setStatus("synced");
        unsubscribe = useStore.subscribe((state, previous) => {
          if (
            state.sessions === previous.sessions &&
            state.pieces === previous.pieces &&
            state.settings === previous.settings &&
            state.habits === previous.habits &&
            state.habitEntries === previous.habitEntries
          ) {
            return;
          }
          const serialized = JSON.stringify(getCloudSnapshot(state));
          if (serialized !== lastSerialized) scheduleSave(serialized);
        });
      } catch {
        setStatus(navigator.onLine ? "error" : "offline");
      }
    };

    const handleOnline = () => {
      const serialized = JSON.stringify(getCloudSnapshot());
      if (serialized !== lastSerialized) scheduleSave(serialized);
    };
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void start();

    return () => {
      active = false;
      if (saveTimer) window.clearTimeout(saveTimer);
      unsubscribe?.();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [hydrated]);

  return null;
}
