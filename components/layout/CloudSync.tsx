"use client";

import { useEffect, useRef } from "react";
import { getCloudSnapshot, useStore, type CloudStatus } from "@/lib/store";

const SAVE_DELAY_MS = 650;
const CLOUD_LINKED_KEY = "praxis-cloud-linked";
/** The server timestamp of the last write this device actually landed. It is
 *  what lets a reload tell "the cloud has news from another device" apart
 *  from "the cloud is stale because my own last save failed". */
const SYNCED_AT_KEY = "praxis-cloud-synced-at";
/** The server rejects a body over 2 MB outright. Refusing a little earlier,
 *  on this side, turns a silent failure into one we can explain. */
const MAX_PAYLOAD_BYTES = 1_850_000;

function recordCount(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const data = value as Record<string, unknown>;
  return ["sessions", "pieces", "habits", "habitEntries", "books", "readingEvents"].reduce(
    (total, key) => total + (Array.isArray(data[key]) ? data[key].length : 0),
    0,
  );
}

class PayloadTooLarge extends Error {}

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // A blocked storage quota must not break syncing.
  }
}

async function saveSnapshot(serialized: string): Promise<void> {
  if (serialized.length > MAX_PAYLOAD_BYTES) throw new PayloadTooLarge();
  const response = await fetch("/api/data", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: serialized,
  });
  if (response.status === 413) throw new PayloadTooLarge();
  if (!response.ok) throw new Error("Cloud save failed");
  const body = (await response.json().catch(() => null)) as { updatedAt?: string } | null;
  if (body?.updatedAt) writeLocal(SYNCED_AT_KEY, body.updatedAt);
}

/** Mirrors durable state to Supabase, and — more importantly — never lets a
 *  failed write turn into lost work.
 *
 *  Two rules hold that line. The store subscription is registered before any
 *  network call, so a Supabase outage at start-up can never leave the session
 *  silently unsubscribed with every later edit stranded in localStorage. And
 *  the initial pull only replaces local state when the cloud row is genuinely
 *  newer than this device's last successful write: if our own last save
 *  failed, the row we would pull is our own stale copy, and taking it would
 *  erase everything logged since — practice and habits included, not just
 *  whichever feature caused the failure. */
export function CloudSync() {
  const hydrated = useStore((state) => state.hasHydrated);
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;

    let active = true;
    let saveTimer: number | null = null;
    let lastSerialized = "";
    /** Set while we apply a pull, so applying it doesn't queue a save of what
     *  we just received. */
    let applyingRemote = false;

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
        } catch (error) {
          if (error instanceof PayloadTooLarge) setStatus("too-large");
          else setStatus(navigator.onLine ? "error" : "offline");
        }
      }, SAVE_DELAY_MS);
    };

    // Registered first, unconditionally. Everything below it may fail.
    // Every persisted array has to be listed here: a missing one syncs
    // nothing, silently, while the status pill goes on reading "saved".
    const unsubscribe = useStore.subscribe((state, previous) => {
      if (
        applyingRemote ||
        (state.sessions === previous.sessions &&
          state.pieces === previous.pieces &&
          state.settings === previous.settings &&
          state.habits === previous.habits &&
          state.habitEntries === previous.habitEntries &&
          state.books === previous.books &&
          state.readingEvents === previous.readingEvents)
      ) {
        return;
      }
      const serialized = JSON.stringify(getCloudSnapshot(state));
      if (serialized !== lastSerialized) scheduleSave(serialized);
    });

    const start = async () => {
      setStatus("syncing");
      try {
        const response = await fetch("/api/data", { cache: "no-store" });
        if (!response.ok) throw new Error("Cloud load failed");
        const payload = (await response.json()) as {
          data: unknown | null;
          updatedAt: string | null;
        };
        if (!active) return;

        if (payload.data) {
          const localSnapshot = getCloudSnapshot();
          const firstCloudLink = readLocal(CLOUD_LINKED_KEY) !== "1";
          // The cloud row is only authoritative when it was written after
          // this device's last landed save — otherwise it is our own stale
          // copy and local is ahead of it.
          const syncedAt = readLocal(SYNCED_AT_KEY);
          const remoteIsNewer =
            !syncedAt ||
            !payload.updatedAt ||
            new Date(payload.updatedAt).getTime() > new Date(syncedAt).getTime();

          if (
            (firstCloudLink && recordCount(payload.data) === 0 && recordCount(localSnapshot) > 0) ||
            !remoteIsNewer
          ) {
            await saveSnapshot(JSON.stringify(localSnapshot));
          } else {
            applyingRemote = true;
            try {
              useStore.getState().replaceCloudSnapshot(payload.data);
            } finally {
              applyingRemote = false;
            }
            if (payload.updatedAt) writeLocal(SYNCED_AT_KEY, payload.updatedAt);
          }
        } else {
          await saveSnapshot(JSON.stringify(getCloudSnapshot()));
        }

        writeLocal(CLOUD_LINKED_KEY, "1");
        lastSerialized = JSON.stringify(getCloudSnapshot());
        setStatus("synced");
      } catch (error) {
        if (error instanceof PayloadTooLarge) setStatus("too-large");
        else setStatus(navigator.onLine ? "error" : "offline");
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
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [hydrated]);

  return null;
}
