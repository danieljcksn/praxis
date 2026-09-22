"use client";

import { useRef, useState } from "react";
import {
  Activity,
  Cloud,
  CloudOff,
  Download,
  Dumbbell,
  LogOut,
  RefreshCw,
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
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/Field";
import { ThemeSelector } from "@/components/theme/ThemeToggle";

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
    <Card>
      <h2 className="text-title text-text">{title}</h2>
      {description && <p className="mt-1 text-sm text-sub">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
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
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm text-text">{label}</p>
        {hint && <p className="mt-0.5 text-mini text-sub">{hint}</p>}
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
  const entryCount = useStore((s) => s.habitEntries.length);
  const bookCount = useStore((s) => s.books.length);
  const readingCount = useStore((s) => s.readingEvents.length);
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

  const CLOUD: Record<typeof cloudStatus, { icon: typeof Cloud; label: string; tone: string }> = {
    idle: { icon: Cloud, label: "Connecting…", tone: "text-sub" },
    syncing: { icon: RefreshCw, label: "Saving…", tone: "text-sub" },
    synced: { icon: Cloud, label: "Saved to Supabase", tone: "text-mint" },
    offline: { icon: CloudOff, label: "Offline — saved locally", tone: "text-error" },
    error: { icon: CloudOff, label: "Sync failed — saved locally", tone: "text-error" },
    "too-large": {
      icon: CloudOff,
      label: "Too large to sync — saved locally",
      tone: "text-error",
    },
  };
  const cloud = CLOUD[cloudStatus];
  const CloudIcon = cloud.icon;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Preferences, integrations, and your data." />

      <div className="space-y-4">
        <Section title="Appearance" description="Choose the canvas that suits the moment.">
          <Row label="Color theme" hint="Remembered on this device.">
            <ThemeSelector />
          </Row>
        </Section>

        <Section title="Practice">
          <div className="divide-y divide-border">
            <Row label="Daily goal" hint="Drives streak targets and the trend lines.">
              <div className="flex items-center gap-2">
                <TextField
                  type="number"
                  min={1}
                  max={1440}
                  inputMode="numeric"
                  aria-label="Daily goal in minutes"
                  value={settings.dailyGoalMinutes}
                  onChange={(e) =>
                    updateSettings({
                      dailyGoalMinutes: Math.min(1440, Math.max(1, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-20 tabnum"
                />
                <span className="text-mini text-sub">min</span>
                <div className="ml-1 hidden gap-1.5 sm:flex">
                  {GOAL_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateSettings({ dailyGoalMinutes: m })}
                      aria-pressed={settings.dailyGoalMinutes === m}
                      className={cn(
                        "h-8 rounded-md border px-2.5 text-mini tabnum",
                        "transition-[background-color,border-color,color] duration-[130ms] ease-out",
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
            <Row label="Week starts on" hint="Used by weekly rollups and the activity grids.">
              <div
                className="inline-flex overflow-hidden rounded-md border border-border"
                role="radiogroup"
                aria-label="Week starts on"
              >
                {(
                  [
                    [0, "Sunday"],
                    [1, "Monday"],
                  ] as const
                ).map(([value, label], i) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={settings.weekStartsOn === value}
                    onClick={() => updateSettings({ weekStartsOn: value })}
                    className={cn(
                      "segment h-9 px-4 text-mini transition-colors duration-[130ms] ease-out",
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

        <Section title="Data" description="Everything durable is mirrored to Supabase.">
          <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
            {[
              ["Sessions", sessionCount],
              ["Pieces", pieceCount],
              ["Habits", habitCount],
              ["Check-ins", entryCount],
              ["Books", bookCount],
              ["Reading days", readingCount],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-panel px-4 py-3">
                <dt className="eyebrow text-sub">{label}</dt>
                <dd className="mt-1.5 text-title tabnum text-text">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button variant="subtle" block onClick={handleExport}>
              <Download className="h-4 w-4" aria-hidden />
              Export backup
            </Button>
            <Button variant="subtle" block onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden />
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
                  body: "This replaces your current practice, habit, and reading data with an example history so you can explore the app. Export a backup first if you want to keep what you have.",
                  confirmLabel: "Load sample",
                  action: () => {
                    useStore.getState().loadSample();
                    toast.success("Sample data loaded");
                  },
                })
              }
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Load sample data
            </Button>
            <Button
              variant="danger"
              block
              onClick={() =>
                setConfirm({
                  title: "Clear all data?",
                  body: "This permanently deletes every session, piece, habit, check-in, book, and reading entry from this app and from Supabase. It cannot be undone. Your settings are kept.",
                  confirmLabel: "Delete everything",
                  danger: true,
                  action: () => {
                    useStore.getState().clearAll();
                    toast.show("All data cleared");
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear all data
            </Button>
          </div>
        </Section>

        <Section
          title="Integrations"
          description="Credentials stay on the server and are never sent to the browser."
        >
          <div className="divide-y divide-border">
            <Row label="Hevy" hint="Workout days, start and end times, duration.">
              <span className="inline-flex h-9 items-center gap-2 rounded-full border border-hevy/20 bg-hevy/8 px-3 text-mini text-hevy">
                <Dumbbell className="h-3.5 w-3.5" aria-hidden />
                Connected
              </span>
            </Row>
            <Row label="Strava" hint="Outdoor activity, distance, and moving time.">
              <ButtonLink href="/api/strava/connect" external variant="subtle" size="sm">
                <Activity className="h-3.5 w-3.5" aria-hidden />
                Reconnect
              </ButtonLink>
            </Row>
          </div>
        </Section>

        <Section title="Security" description="Access is protected by the shared Praxis password.">
          <div className="divide-y divide-border">
            <Row label="Cloud storage" hint="Row-level security blocks public access; the server owns every write.">
              <span className={cn("inline-flex items-center gap-2 text-mini", cloud.tone)}>
                <CloudIcon
                  className={cn("h-3.5 w-3.5", cloudStatus === "syncing" && "animate-spin")}
                  aria-hidden
                />
                {cloud.label}
              </span>
            </Row>
            <Row label="This device" hint="Locking clears the session cookie and returns to the unlock screen.">
              <Button
                variant="subtle"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.assign("/login");
                }}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Lock Praxis
              </Button>
            </Row>
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
        <p className="text-sm text-sub">{confirm?.body}</p>
      </Modal>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <SkeletonScreen label="Loading settings">
      <div className="mb-7 space-y-2.5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" delay={40} />
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 w-full rounded-lg" delay={80 + i * 60} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
