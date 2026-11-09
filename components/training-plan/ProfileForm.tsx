"use client";

import { useState } from "react";
import { sanitizeProfile, todayKey, type BodyProfile } from "@/lib/training-plan/engine";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

const FIELDS = [
  ["weightKg", "Peso em jejum (kg)"],
  ["waistCm", "Cintura no umbigo (cm)"],
  ["neckCm", "Pescoço (cm)"],
  ["heightCm", "Altura (cm)"],
  ["ageYears", "Idade"],
  ["stepsPerDay", "Passos por dia"],
  ["liftSessionsPerWeek", "Treinos por semana"],
  ["liftSessionMinutes", "Minutos por treino"],
  ["runKmPerWeek", "Km corridos por semana"],
  ["measuredMaintenanceKcal", "Manutenção medida (kcal)"],
] as const;

type FieldKey = (typeof FIELDS)[number][0];
type FormState = Record<FieldKey | "startDay" | "targetDay" | "targetLabel", string>;

function toForm(profile: BodyProfile | null): FormState {
  const text = (value: number | null | undefined, fallback = "") =>
    value == null ? fallback : String(value);
  return {
    weightKg: text(profile?.weightKg),
    waistCm: text(profile?.waistCm),
    neckCm: text(profile?.neckCm),
    heightCm: text(profile?.heightCm),
    ageYears: text(profile?.ageYears),
    stepsPerDay: text(profile?.stepsPerDay, "10000"),
    liftSessionsPerWeek: text(profile?.liftSessionsPerWeek, "5"),
    liftSessionMinutes: text(profile?.liftSessionMinutes, "75"),
    runKmPerWeek: text(profile?.runKmPerWeek, "0"),
    measuredMaintenanceKcal: text(profile?.measuredMaintenanceKcal),
    startDay: profile?.startDay ?? todayKey(),
    targetDay: profile?.targetDay ?? "",
    targetLabel: profile?.targetLabel ?? "",
  };
}

function Labeled({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-sub-strong">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ProfileForm({
  initial,
  onSave,
}: {
  initial: BodyProfile | null;
  onSave: (profile: BodyProfile) => void;
}) {
  const [form, setForm] = useState(() => toForm(initial));
  const [absVisible, setAbsVisible] = useState(initial?.absVisible ?? false);
  const [maxMode, setMaxMode] = useState(initial?.maxMode ?? true);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  const number = (key: FieldKey) => {
    const value = Number(form[key].replace(",", "."));
    return form[key].trim() && Number.isFinite(value) ? value : null;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const profile = sanitizeProfile({
      weightKg: number("weightKg"),
      waistCm: number("waistCm"),
      neckCm: number("neckCm"),
      heightCm: number("heightCm"),
      ageYears: number("ageYears"),
      stepsPerDay: number("stepsPerDay"),
      liftSessionsPerWeek: number("liftSessionsPerWeek"),
      liftSessionMinutes: number("liftSessionMinutes"),
      runKmPerWeek: number("runKmPerWeek"),
      measuredMaintenanceKcal: number("measuredMaintenanceKcal"),
      absVisible,
      maxMode,
      startDay: form.startDay,
      targetDay: form.targetDay,
      holidayStart: initial?.holidayStart,
      carnivalStart: initial?.carnivalStart,
      targetLabel: form.targetLabel.trim(),
    });
    const plausible =
      profile &&
      profile.heightCm >= 120 &&
      profile.heightCm <= 230 &&
      profile.weightKg >= 35 &&
      profile.weightKg <= 250 &&
      profile.ageYears >= 14 &&
      profile.ageYears <= 90;
    if (!plausible) {
      setError(true);
      setSaved(false);
      return;
    }
    setError(false);
    setSaved(true);
    onSave(profile);
  };

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(([key, label]) => (
          <Labeled key={key} id={key} label={label}>
            <TextField
              id={key}
              inputMode="decimal"
              autoComplete="off"
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          </Labeled>
        ))}
        <Labeled id="startDay" label="Início do plano">
          <TextField
            id="startDay"
            type="date"
            required
            value={form.startDay}
            onChange={(event) => setForm({ ...form, startDay: event.target.value })}
          />
        </Labeled>
        <Labeled id="targetDay" label="Data-alvo">
          <TextField
            id="targetDay"
            type="date"
            required
            value={form.targetDay}
            onChange={(event) => setForm({ ...form, targetDay: event.target.value })}
          />
        </Labeled>
      </div>
      <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-base text-sub-strong">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--color-hevy)]"
          checked={maxMode}
          onChange={(event) => setMaxMode(event.target.checked)}
        />
        Modo extremo
      </label>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-sub-strong">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--color-hevy)]"
          checked={absVisible}
          onChange={(event) => setAbsVisible(event.target.checked)}
        />
        Abdômen aparece em foto de manhã, relaxado
      </label>
      <div className="mt-4 flex min-h-10 flex-wrap items-center gap-4">
        <Button type="submit" variant="primary">
          Salvar números
        </Button>
        <p role="status" className="text-base text-sub">
          {error
            ? "Confira peso, altura e idade, e se a data-alvo vem depois do início."
            : saved
              ? "Plano recalculado."
              : ""}
        </p>
      </div>
    </form>
  );
}
