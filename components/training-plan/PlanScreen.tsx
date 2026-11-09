"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Beef, Droplets, Flame, Wheat } from "lucide-react";
import { useBodyProfile } from "@/lib/hooks/useBodyProfile";
import {
  addDaysKey,
  computePlan,
  formatDay,
  sanitizeProfile,
  todayKey,
  type BodyProfile,
  type EngineConfig,
} from "@/lib/training-plan/engine";
import type { Checkin, TimelineItem } from "@/lib/training-plan/plan";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardLink } from "@/components/ui/Card";
import { Field, TextField } from "@/components/ui/Field";
import { Metric } from "@/components/ui/Metric";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { BulletList, Labeled, TextCard } from "./parts";

const kcal = (value: number) => value.toLocaleString("pt-BR");
const signed = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;

const FIELDS = [
  ["heightCm", "Altura (cm)", "185"],
  ["weightKg", "Peso (kg)", "em jejum"],
  ["ageYears", "Idade", ""],
  ["waistCm", "Cintura no umbigo (cm)", "em jejum, relaxado"],
  ["neckCm", "Pescoço (cm)", "abaixo da laringe"],
  ["stepsPerDay", "Passos por dia", "média real"],
  ["liftSessionsPerWeek", "Sessões por semana", ""],
  ["liftSessionMinutes", "Minutos por sessão", ""],
  ["runKmPerWeek", "Km corridos por semana", "só o que acontece"],
  ["measuredMaintenanceKcal", "Manutenção medida (kcal)", "vazio até medir"],
] as const;

type FieldKey = (typeof FIELDS)[number][0];
type FormState = Record<FieldKey | "startDay" | "targetDay" | "targetLabel", string>;

function toForm(profile: BodyProfile | null): FormState {
  const text = (value: number | null | undefined, fallback = "") =>
    value == null ? fallback : String(value);
  return {
    heightCm: text(profile?.heightCm),
    weightKg: text(profile?.weightKg),
    ageYears: text(profile?.ageYears),
    waistCm: text(profile?.waistCm),
    neckCm: text(profile?.neckCm),
    stepsPerDay: text(profile?.stepsPerDay, "10000"),
    liftSessionsPerWeek: text(profile?.liftSessionsPerWeek, "5"),
    liftSessionMinutes: text(profile?.liftSessionMinutes, "75"),
    runKmPerWeek: text(profile?.runKmPerWeek, "10"),
    measuredMaintenanceKcal: text(profile?.measuredMaintenanceKcal),
    startDay: profile?.startDay ?? todayKey(),
    targetDay: profile?.targetDay ?? "",
    targetLabel: profile?.targetLabel ?? "",
  };
}

function ProfileForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: BodyProfile | null;
  onSave: (profile: BodyProfile) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(() => toForm(initial));
  const [absVisible, setAbsVisible] = useState(initial?.absVisible ?? false);
  const [maxMode, setMaxMode] = useState(initial?.maxMode ?? true);
  const [error, setError] = useState<string | null>(null);

  const number = (key: FieldKey) => {
    const value = Number(form[key].replace(",", "."));
    return form[key].trim() && Number.isFinite(value) ? value : null;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const profile = sanitizeProfile({
      heightCm: number("heightCm"),
      weightKg: number("weightKg"),
      ageYears: number("ageYears"),
      waistCm: number("waistCm"),
      neckCm: number("neckCm"),
      absVisible,
      maxMode,
      startDay: form.startDay,
      targetDay: form.targetDay,
      targetLabel: form.targetLabel.trim(),
      stepsPerDay: number("stepsPerDay"),
      liftSessionsPerWeek: number("liftSessionsPerWeek"),
      liftSessionMinutes: number("liftSessionMinutes"),
      runKmPerWeek: number("runKmPerWeek"),
      measuredMaintenanceKcal: number("measuredMaintenanceKcal"),
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
      setError("Confira altura, peso e idade, e se a data-alvo vem depois do início.");
      return;
    }
    setError(null);
    onSave(profile);
  };

  return (
    <Card className="mb-4">
      <h2 className="text-title text-text">Suas medidas</h2>
      <p className="mt-1 text-sm text-sub">
        Ficam só neste navegador. Tudo no plano é calculado a partir delas.
      </p>
      <form onSubmit={submit} className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Início" htmlFor="startDay">
            <TextField
              id="startDay"
              type="date"
              required
              value={form.startDay}
              onChange={(event) => setForm({ ...form, startDay: event.target.value })}
            />
          </Field>
          <Field label="Data-alvo" htmlFor="targetDay">
            <TextField
              id="targetDay"
              type="date"
              required
              value={form.targetDay}
              onChange={(event) => setForm({ ...form, targetDay: event.target.value })}
            />
          </Field>
          <Field label="Nome da data" hint="opcional" htmlFor="targetLabel">
            <TextField
              id="targetLabel"
              maxLength={40}
              value={form.targetLabel}
              onChange={(event) => setForm({ ...form, targetLabel: event.target.value })}
            />
          </Field>
          {FIELDS.map(([key, label, hint]) => (
            <Field key={key} label={label} hint={hint || undefined} htmlFor={key}>
              <TextField
                id={key}
                inputMode="decimal"
                autoComplete="off"
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </Field>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-sub-strong">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-hevy)]"
            checked={absVisible}
            onChange={(event) => setAbsVisible(event.target.checked)}
          />
          Foto matinal, relaxado, mostra contorno abdominal
        </label>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-sub-strong">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-hevy)]"
            checked={maxMode}
            onChange={(event) => setMaxMode(event.target.checked)}
          />
          Modo extremo: corta cedo e treina no limite
        </label>
        {error && (
          <Alert className="mt-4" tone="error">
            {error}
          </Alert>
        )}
        <div className="mt-5 flex gap-2">
          <Button type="submit" variant="primary">
            Calcular meu plano
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

export function PlanScreen({
  defaultProfile,
  config,
  checkin,
  timeline,
  levers,
}: {
  defaultProfile: BodyProfile | null;
  config: EngineConfig;
  checkin: Checkin;
  timeline: TimelineItem[];
  levers: { rank: number; name: string; why: string }[];
}) {
  const { profile, ready, save } = useBodyProfile(defaultProfile);
  const [editing, setEditing] = useState(false);
  const today = todayKey();
  const snapshot = useMemo(
    () => (profile ? computePlan(profile, config, today) : null),
    [profile, config, today],
  );

  if (!ready) {
    return (
      <SkeletonScreen label="Carregando seu plano">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="mt-6 h-72 rounded-lg" delay={60} />
      </SkeletonScreen>
    );
  }

  const events = timeline
    .map((item) => ({
      ...item,
      date: !profile
        ? null
        : item.daysFromStart != null
          ? addDaysKey(profile.startDay, item.daysFromStart)
          : addDaysKey(profile.targetDay, -(item.daysBeforeTarget ?? 0)),
    }))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  const ignored = checkin.ignoreScaleWindows.map((window) => {
    if (!profile) return window.reason;
    const [first, last] =
      window.anchor === "startDate"
        ? [addDaysKey(profile.startDay, window.firstDay ?? 0), addDaysKey(profile.startDay, window.lastDay ?? 0)]
        : [addDaysKey(profile.targetDay, -(window.firstDaysBefore ?? 0)), addDaysKey(profile.targetDay, -(window.lastDaysBefore ?? 0))];
    return `${formatDay(first)} a ${formatDay(last)}: ${window.reason}`;
  });

  const { anchors, ...protocol } = checkin.protocol;
  const protocolLines = Object.entries(protocol)
    .filter(([, value]) => typeof value === "string")
    .map(([, value]) => value as string);

  return (
    <div lang="pt-BR">
      <PageHeader
        eyebrow="Físico"
        tone="hevy"
        title="Plano"
        subtitle={
          snapshot && profile
            ? `${snapshot.daysLeft} dias até ${profile.targetLabel || "a data"} · ${formatDay(profile.targetDay, true)}`
            : "Calorias, fases e regras calculadas para o seu corpo"
        }
        action={
          profile && !editing ? (
            <Button variant="subtle" onClick={() => setEditing(true)}>
              Ajustar números
            </Button>
          ) : undefined
        }
      />

      {(!profile || editing) && (
        <ProfileForm
          initial={profile}
          onSave={(next) => {
            save(next);
            setEditing(false);
          }}
          onCancel={profile ? () => setEditing(false) : undefined}
        />
      )}

      {snapshot && profile && (
        <>
          {!snapshot.started && (
            <Alert tone="warning" className="mb-4">
              O plano começa em {formatDay(profile.startDay, true)}. Estes são os números do primeiro dia.
            </Alert>
          )}
          {snapshot.branchPending && (
            <Alert tone="warning" className="mb-4">
              Sem cintura e pescoço, o ramo é provisório. As primeiras 4 semanas são iguais em todos os ramos.
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={Flame} tone="hevy" label="Calorias" value={kcal(snapshot.today.kcal)} detail={snapshot.today.deficit ? "kcal hoje, em déficit" : "kcal hoje"} />
            <Metric icon={Beef} tone="hevy" label="Proteína" value={`${snapshot.today.proteinG} g`} detail="4 refeições" />
            <Metric icon={Wheat} tone="hevy" label="Carboidrato" value={`${snapshot.today.carbsG} g`} detail="o que sobra" />
            <Metric icon={Droplets} tone="hevy" label="Gordura" value={`${snapshot.today.fatG} g`} detail={`piso geral: ${kcal(snapshot.floorKcal)} kcal`} />
          </div>

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="eyebrow text-hevy">
                  {snapshot.started ? `Semana ${snapshot.weekNumber} de ${snapshot.totalWeeks}` : "Primeira fase"}
                </p>
                <Badge tone="hevy">
                  {formatDay(snapshot.current.first)} a {formatDay(snapshot.current.last)}
                </Badge>
              </div>
              <h2 className="mt-2 font-display text-title-lg text-text">{snapshot.current.phase.name}</h2>
              <div className="mt-4 space-y-4">
                <Labeled label="Treino">{snapshot.current.phase.training}</Labeled>
                <Labeled label="Cardio">{snapshot.current.phase.cardio}</Labeled>
                <Labeled label="Por quê">{snapshot.current.phase.why}</Labeled>
                {snapshot.current.phase.recompositionClause && (
                  <Labeled label="Exceção">{snapshot.current.phase.recompositionClause}</Labeled>
                )}
                {snapshot.current.phase.gate && (
                  <Labeled label="Portão">{snapshot.current.phase.gate.rule}</Labeled>
                )}
              </div>
            </Card>

            <Card>
              <p className="eyebrow text-hevy">Seu ponto de partida</p>
              <h2 className="mt-2 text-title text-text">{snapshot.branch.label}</h2>
              <p className="mt-1 text-sm text-sub">{snapshot.branch.summary}</p>
              <dl className="mt-4 divide-y divide-border text-sm">
                {snapshot.bodyFatPct != null && (
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-sub">Gordura estimada</dt>
                    <dd className="tabnum text-text">
                      {snapshot.bodyFatPct.toFixed(1).replace(".", ",")}%
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-sub">Manutenção estimada</dt>
                  <dd className="tabnum text-text">{kcal(snapshot.maintenance.mid)} kcal</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-sub">Faixa plausível</dt>
                  <dd className="tabnum text-text">
                    {kcal(snapshot.maintenance.low)} a {kcal(snapshot.maintenance.high)}
                  </dd>
                </div>
              </dl>
              {snapshot.bodyFatPct != null && (
                <p className="mt-3 text-mini text-sub">
                  A fita erra cerca de 7 pontos para cada lado. Refaça em 4 semanas antes de confiar no ramo.
                </p>
              )}
            </Card>
          </div>

          {profile.maxMode && (
            <CardLink href="/training/workouts#modo-extremo" tone="hevy" className="mt-4">
              <p className="eyebrow text-hevy">Ligado</p>
              <h2 className="mt-2 text-title text-text">Modo extremo</h2>
              <p className="mt-1 text-sm text-sub">
                Déficit cedo, sexta sessão semanal e regras sem folga. Veja tudo o que ele exige.
              </p>
            </CardLink>
          )}

          <TextCard eyebrow="Calendário" title="Fases até a data" description="As calorias usam sua manutenção medida quando você preencher esse campo.">
            <ul className="divide-y divide-border">
              {snapshot.rows.map((row) => (
                <li
                  key={row.phase.id}
                  aria-current={row.status === "now" ? "true" : undefined}
                  className={cn(
                    "-mx-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-sm px-2 py-3",
                    row.status === "now" && "bg-hevy/8",
                    row.status === "past" && "opacity-55",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm text-text">{row.phase.name}</p>
                    <p className="text-micro tabnum text-sub">
                      {formatDay(row.first)} a {formatDay(row.last)}
                      {row.rateKgMin != null && row.rateKgMax != null
                        ? ` · ${signed(row.rateKgMin)} a ${signed(row.rateKgMax)} kg por semana`
                        : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabnum text-hevy">
                    {row.kcalMin === row.kcalMax ? kcal(row.kcalMin) : `${kcal(row.kcalMin)} a ${kcal(row.kcalMax)}`} kcal
                  </p>
                </li>
              ))}
            </ul>
          </TextCard>
        </>
      )}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <TextCard eyebrow="Rotina" title="O que medir">
          <BulletList items={protocolLines} />
          {Array.isArray(anchors) && (
            <div className="mt-4">
              <Labeled label="Exercícios âncora">{anchors.join(" · ")}</Labeled>
            </div>
          )}
          <div className="mt-4 space-y-4">
            <Labeled label="Como medir sua manutenção">{checkin.maintenanceEstimate.note}</Labeled>
            <Labeled label="Como escolher o ramo">
              {checkin.branchDecision.text} {checkin.branchDecision.reTape.text}{" "}
              {checkin.branchDecision.exits.text}
            </Labeled>
          </div>
        </TextCard>

        <TextCard eyebrow="Ignorar a balança" title="Quando o peso não vale">
          <BulletList items={ignored} />
          <p className="mt-3 text-sm text-sub">
            {checkin.firstTwoWeeks.creatineLoad} {checkin.firstTwoWeeks.noLoad} {checkin.firstTwoWeeks.rule}
          </p>
        </TextCard>

        <TextCard eyebrow="Domingo" title="Uma decisão por semana" description={checkin.ruleOrder.split(":")[0]}>
          <ol className="space-y-3">
            {checkin.rules.map((rule, index) => (
              <li key={rule.id} className="flex gap-3 text-sm">
                <span className="w-4 shrink-0 tabnum text-sub">{index + 1}</span>
                <div>
                  <p className="text-text">{rule.ifLabel}</p>
                  <p className="mt-0.5 text-sub-strong">{rule.then}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm font-medium text-text">{checkin.neverChaseTheDate}</p>
        </TextCard>

        <div className="grid gap-4">
          <TextCard eyebrow="Antes de cortar" title="Licença para o déficit" description={checkin.deficitLicence.text}>
            <BulletList items={[...checkin.deficitLicence.requires, checkin.deficitLicence.branchBAlsoRequires]} />
          </TextCard>
          <TextCard eyebrow="Semana ruim" title="O que cortar, nesta ordem">
            <BulletList items={checkin.badWeekOrder} />
          </TextCard>
          <TextCard eyebrow="Revisão" title="O que invalida o plano">
            <ul className="space-y-3 text-sm">
              {checkin.reviewTriggers.map((trigger) => (
                <li key={trigger.if}>
                  <p className="text-text">{trigger.if}</p>
                  <p className="mt-0.5 text-sub-strong">{trigger.then}</p>
                </li>
              ))}
            </ul>
          </TextCard>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <TextCard eyebrow="Prioridades" title="O que mais importa, em ordem">
          <ol className="space-y-3">
            {levers.map((lever) => (
              <li key={lever.rank} className="flex gap-3 text-sm">
                <span className="w-5 shrink-0 tabnum text-hevy">{lever.rank}</span>
                <div>
                  <p className="text-text">{lever.name}</p>
                  <p className="mt-0.5 text-sub-strong">{lever.why}</p>
                </div>
              </li>
            ))}
          </ol>
        </TextCard>

        <TextCard eyebrow="Linha do tempo" title="Marcos até a data">
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className={cn("flex gap-3 text-sm", event.date && event.date < today && "opacity-55")}>
                <span className="w-11 shrink-0 tabnum text-hevy">
                  {event.date
                    ? formatDay(event.date)
                    : event.daysFromStart != null
                      ? `D${event.daysFromStart}`
                      : `-${event.daysBeforeTarget}d`}
                </span>
                <div className="min-w-0">
                  <p className="text-text">{event.title}</p>
                  <p className="mt-0.5 text-sub-strong">{event.detail}</p>
                  {event.protocol && (
                    <div className="mt-2">
                      <BulletList items={event.protocol} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </TextCard>
      </div>

      <Link href="/training/guide" className="mt-6 inline-block text-sm text-hevy underline underline-offset-2">
        Entender o porquê de tudo isso no guia
      </Link>
    </div>
  );
}
