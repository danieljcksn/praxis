"use client";

import { useRef, useState } from "react";
import {
  Activity,
  Cloud,
  Download,
  Dumbbell,
  LogOut,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { toDayKey } from "@/lib/time";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/Field";

const GOAL_PRESETS = [15, 30, 45, 60, 90];

interface Confirm {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  action: () => void;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-panel/60 p-5">
      <h2 className="text-[13px] font-medium text-text">{title}</h2>
      {description && <p className="mt-0.5 text-[12px] text-sub">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[13px] text-text">{label}</p>
        {hint && <p className="text-[12px] text-sub">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsScreen() {
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const sessionCount = useStore((s) => s.sessions.length);
  const pieceCount = useStore((s) => s.pieces.length);
  const habitCount = useStore((s) => s.habits.length);
  const cloudStatus = useStore((s) => s.cloudStatus);

  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const handleExport = () => {
    const data = useStore.getState().exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `praxis-backup-${toDayKey(Date.now())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const res = useStore.getState().importData(data);
      if (res.ok) toast.success("Backup restored");
      else toast.error(res.error ?? "Import failed");
    } catch {
      toast.error("Couldn't read that file");
    }
  };

  if (!hydrated) return <SettingsSkeleton />;

  return (
    <div className="animate-[praxis-fade-in_0.3s_ease-out]">
      <PageHeader title="Settings" subtitle="Preferences and your data" />

      <div className="space-y-6">
        <Section title="Practice">
          <div className="divide-y divide-border">
            <Row label="Daily goal" hint="Used for streak targets and trend lines.">
              <div className="flex items-center gap-2">
                <TextField
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-label="Daily goal in minutes"
                  value={settings.dailyGoalMinutes}
                  onChange={(e) =>
                    updateSettings({ dailyGoalMinutes: Math.max(1, Number(e.target.value) || 0) })
                  }
                  className="w-20"
                />
                <span className="text-[12px] text-sub">min</span>
                <div className="ml-1 hidden gap-1.5 sm:flex">
                  {GOAL_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateSettings({ dailyGoalMinutes: m })}
                      className={cn(
                        "h-8 rounded-md border px-2.5 text-[12px] tabnum transition-colors duration-150",
                        settings.dailyGoalMinutes === m
                          ? "border-accent/40 bg-accent/12 text-text"
                          : "border-border text-sub hover:border-border-strong hover:text-text",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </Row>
            <Row label="Week starts on">
              <div className="flex overflow-hidden rounded-lg border border-border">
                {([
                  [0, "Sunday"],
                  [1, "Monday"],
                ] as const).map(([value, label], i) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateSettings({ weekStartsOn: value })}
                    className={cn(
                      "h-9 px-4 text-[13px] transition-colors duration-150",
                      i === 1 && "border-l border-border",
                      settings.weekStartsOn === value
                        ? "bg-accent/12 text-text"
                        : "text-sub hover:text-text",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Row>
          </div>
        </Section>

        <Section
          title="Data"
          description={`${sessionCount} sessions, ${pieceCount} pieces, and ${habitCount} habits are mirrored to Supabase. Cloud status: ${cloudStatus}.`}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button variant="subtle" block onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export backup
            </Button>
            <Button variant="subtle" block onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="subtle"
              block
              onClick={() =>
                setConfirm({
                  title: "Load sample data?",
                  body: "This replaces your current practice and habit data with an example history so you can explore the app. Export a backup first if you want to keep your data.",
                  confirmLabel: "Load sample",
                  action: () => {
                    useStore.getState().loadSample();
                    toast.success("Sample data loaded");
                  },
                })
              }
            >
              <Sparkles className="h-4 w-4" />
              Load sample data
            </Button>
            <Button
              variant="danger"
              block
              onClick={() =>
                setConfirm({
                  title: "Clear all data?",
                  body: "This permanently deletes every session, piece, habit, and check-in from this app and Supabase. This cannot be undone. Your settings are kept.",
                  confirmLabel: "Delete everything",
                  danger: true,
                  action: () => {
                    useStore.getState().clearAll();
                    toast.show("All data cleared");
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4" />
              Clear all data
            </Button>
          </div>
        </Section>

        <Section
          title="Integrations"
          description="External credentials stay on the server and are never sent to the browser."
        >
          <div className="divide-y divide-border">
            <Row label="Hevy" hint="Workout days, start/end times, and duration.">
              <span className="inline-flex items-center gap-2 rounded-full border border-hevy/15 bg-hevy/5 px-3 py-1.5 text-[11px] text-hevy">
                <Dumbbell className="h-3.5 w-3.5" />
                Connected
              </span>
            </Row>
            <Row label="Strava" hint="Outdoor activity, distance, and moving time.">
              <a
                href="/api/strava/connect"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-strava/20 bg-strava/5 px-3 text-[11px] text-strava transition-[background-color,transform] duration-150 hover:bg-strava/10 active:scale-[0.97]"
              >
                <Activity className="h-3.5 w-3.5" />
                Reconnect
              </a>
            </Row>
          </div>
        </Section>

        <Section title="Security" description="Access is protected by the shared Praxis password.">
          <Row label="Cloud storage" hint="RLS blocks direct public access; the server owns all writes.">
            <span className="inline-flex items-center gap-2 text-[11px] text-mint">
              <Cloud className="h-3.5 w-3.5" />
              Supabase secured
            </span>
          </Row>
          <div className="mt-3 border-t border-border pt-4">
            <Button
              variant="subtle"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.assign("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Lock Praxis
            </Button>
          </div>
        </Section>
      </div>

      <Modal
        open={confirm != null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button variant="subtle" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.danger ? "danger" : "primary"}
              data-autofocus
              onClick={() => {
                confirm?.action();
                setConfirm(null);
              }}
            >
              {confirm?.confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-sub">{confirm?.body}</p>
      </Modal>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    </div>
  );
}
