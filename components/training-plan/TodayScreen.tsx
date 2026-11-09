"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useBodyProfile } from "@/lib/hooks/useBodyProfile";
import { useHevy } from "@/lib/hooks/useHevy";
import {
  addDaysKey,
  calendarAnchors,
  computePlan,
  diffDays,
  formatDay,
  todayKey,
  type BodyProfile,
  type EngineConfig,
  type PlanSnapshot,
} from "@/lib/training-plan/engine";
import { buildDayMenu } from "@/lib/training-plan/meals";
import type { Cardio, Checkin, Program, TimelineItem } from "@/lib/training-plan/plan";
import {
  WEEKDAY_SHORT,
  coachMessage,
  mondayOf,
  planForDay,
  type DayPlan,
} from "@/lib/training-plan/today";
import { cn } from "@/lib/cn";
import { MealList } from "./MealList";
import { ProfileForm } from "./ProfileForm";
import { Disclosure, ExerciseList, IfThen, PageIntro, PlainList, SectionTitle } from "./ui";

const CHECKS_KEY = "praxis-training-checks";
const CHECKS_KEPT_DAYS = 30;
const kcal = (value: number) => value.toLocaleString("pt-BR");

function useDayChecks(day: string) {
  const [all, setAll] = useState<Record<string, string[]>>({});

  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(CHECKS_KEY) ?? "{}");
      if (parsed && typeof parsed === "object") setAll(parsed as Record<string, string[]>);
    } catch {
      setAll({});
    }
  }, []);

  const toggle = (id: string) => {
    setAll((current) => {
      const today = current[day] ?? [];
      const next: Record<string, string[]> = {
        ...current,
        [day]: today.includes(id) ? today.filter((item) => item !== id) : [...today, id],
      };
      const oldest = addDaysKey(day, -CHECKS_KEPT_DAYS);
      for (const key of Object.keys(next)) if (key < oldest) delete next[key];
      try {
        window.localStorage.setItem(CHECKS_KEY, JSON.stringify(next));
      } catch {
        // Still usable for this visit when storage is blocked.
      }
      return next;
    });
  };

  return { checked: all[day] ?? [], toggle };
}

function WeekStrip({
  today,
  labels,
  doneDays,
}: {
  today: string;
  labels: string[];
  doneDays: Set<string>;
}) {
  const monday = mondayOf(today);
  return (
    <ol className="grid grid-cols-7 border-y border-border">
      {labels.map((label, index) => {
        const day = addDaysKey(monday, index);
        const isToday = day === today;
        const done = doneDays.has(day);
        return (
          <li
            key={day}
            aria-current={isToday ? "date" : undefined}
            className={cn("relative py-3", day < today && !done && "opacity-50")}
          >
            <span className={cn("block text-mini sm:text-sm", isToday ? "font-medium text-text" : "text-sub")}>
              {WEEKDAY_SHORT[index]}
            </span>
            <span className={cn("mt-0.5 block whitespace-nowrap text-mini sm:text-sm", isToday ? "text-text" : "text-sub-strong")}>
              {label}
            </span>
            {done && <span className="sr-only">feito</span>}
            {(isToday || done) && (
              <span
                className={cn("absolute inset-x-0 bottom-[-1px] mr-1.5 h-0.5", isToday ? "bg-accent" : "bg-accent/40")}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function hevyLine(
  workouts: { startTime: string }[],
  doneThisWeek: number,
  planned: number,
  today: string,
): string {
  if (workouts.length === 0) return "Nenhum treino no Hevy ainda. O primeiro é o que mais conta.";
  const last = workouts.reduce((latest, item) => (item.startTime > latest ? item.startTime : latest), "");
  const gap = diffDays(today, todayKey(new Date(last)));
  if (gap >= 4) return `Faz ${gap} dias sem treino. Hoje vale até a sessão mínima: você só precisa voltar.`;
  const count = workouts.length === 1 ? "1 treino" : `${workouts.length} treinos`;
  return `${count} no Hevy. Esta semana: ${doneThisWeek} de ${planned}.`;
}

function DayChecks({
  plan,
  proteinG,
  steps,
  doneInHevy,
  checked,
  toggle,
}: {
  plan: DayPlan;
  proteinG: number;
  steps: number;
  doneInHevy: boolean;
  checked: string[];
  toggle: (id: string) => void;
}) {
  const items = [
    plan.kind !== "rest" ? { id: "treino", label: plan.kind === "run" ? "Correr" : "Treinar" } : null,
    { id: "proteina", label: `${proteinG} g de proteína` },
    { id: "passos", label: `${steps.toLocaleString("pt-BR")} passos` },
    { id: "sono", label: "8 horas na cama" },
  ].filter((item): item is { id: string; label: string } => item !== null);

  const isDone = (id: string) => checked.includes(id) || (id === "treino" && doneInHevy);
  const done = items.filter((item) => isDone(item.id)).length;

  return (
    <section aria-label="Checklist do dia">
      <SectionTitle title="O dia" meta={`${done} de ${items.length} feitos`} />
      <ul className="grid gap-x-8 border-t border-border sm:grid-cols-2">
        {items.map((item) => {
          const on = isDone(item.id);
          return (
            <li key={item.id} className="border-b border-border">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item.id)}
                className="flex min-h-13 w-full items-center gap-3 py-3 text-left text-lead text-text"
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-[130ms] ease-out",
                    on ? "border-accent bg-accent text-on-accent" : "border-border-strong",
                  )}
                  aria-hidden
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CalendarList({ snapshot }: { snapshot: PlanSnapshot }) {
  return (
    <section>
      <SectionTitle title="Até o dia" />
      <ul className="border-t border-border">
        {snapshot.rows.map((row) => (
          <li
            key={row.phase.id}
            aria-current={row.status === "now" ? "true" : undefined}
            className={cn(
              "flex items-baseline justify-between gap-4 border-b border-border py-3",
              row.status === "past" && "opacity-50",
            )}
          >
            <span className="min-w-0">
              <span className={cn("block text-lead", row.status === "now" ? "font-medium text-text" : "text-sub-strong")}>
                {row.phase.name}
              </span>
              <span className="mt-0.5 block text-sm tabnum text-sub">
                {formatDay(row.first)} a {formatDay(row.last)}
              </span>
            </span>
            <span className={cn("shrink-0 text-lead tabnum", row.status === "now" ? "font-medium text-text" : "text-sub-strong")}>
              {row.kcalMin === row.kcalMax ? kcal(row.kcalMin) : `${kcal(row.kcalMin)} a ${kcal(row.kcalMax)}`} kcal
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TodayScreen({
  defaultProfile,
  config,
  program,
  cardio,
  checkin,
  timeline,
  levers,
}: {
  defaultProfile: BodyProfile | null;
  config: EngineConfig;
  program: Program;
  cardio: Cardio;
  checkin: Checkin;
  timeline: TimelineItem[];
  levers: { rank: number; name: string; why: string }[];
}) {
  const { profile, ready, save } = useBodyProfile(defaultProfile);
  const { workouts, loading, error } = useHevy();
  const today = todayKey();
  const { checked, toggle } = useDayChecks(today);

  const snapshot = useMemo(
    () => (profile ? computePlan(profile, config, today) : null),
    [profile, config, today],
  );
  const doneDays = useMemo(
    () => new Set(workouts.map((workout) => todayKey(new Date(workout.startTime)))),
    [workouts],
  );

  if (!ready) return <div className="min-h-dvh" />;

  if (!profile || !snapshot) {
    return (
      <div lang="pt-BR" className="max-w-[40rem]">
        <PageIntro title="Vamos montar seu plano." />
        <div className="mt-8">
          <ProfileForm initial={null} onSave={save} />
        </div>
      </div>
    );
  }

  // Before the start date the screen previews day one rather than an unplanned week.
  const planDay = today < profile.startDay ? profile.startDay : today;
  const plan = planForDay(planDay, program, cardio, profile, snapshot);
  const coach = coachMessage(today, plan, profile, snapshot);
  const monday = mondayOf(planDay);
  const weekPlans = Array.from({ length: 7 }, (_, index) =>
    planForDay(addDaysKey(monday, index), program, cardio, profile, snapshot),
  );
  const planned = weekPlans.filter((item) => item.kind === "lift").length;
  const doneThisWeek = weekPlans.filter((_, index) => doneDays.has(addDaysKey(monday, index))).length;
  const { today: targets } = snapshot;
  const menu = buildDayMenu(targets);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${today}T12:00:00Z`));
  const weekLabel =
    snapshot.started && today <= profile.targetDay ? `, semana ${snapshot.weekNumber} de ${snapshot.totalWeeks}` : "";
  const remaining =
    snapshot.daysLeft > 1 ? ` Faltam ${snapshot.daysLeft} dias.` : snapshot.daysLeft === 1 ? " Falta 1 dia." : "";

  const anchors = calendarAnchors(profile);
  const events = timeline
    .map((item) => ({
      ...item,
      date:
        item.daysFromStart != null
          ? addDaysKey(profile.startDay, item.daysFromStart)
          : item.anchor
            ? addDaysKey(anchors[item.anchor], item.daysFromAnchor ?? 0)
            : addDaysKey(profile.targetDay, -(item.daysBeforeTarget ?? 0)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const { anchors: anchorExercises, ...protocol } = checkin.protocol;
  const protocolLines = Object.values(protocol).filter((value): value is string => typeof value === "string");

  return (
    <div lang="pt-BR" className="max-w-[66rem]">
      <PageIntro
        kicker={`${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)}${weekLabel}.${remaining}`}
        title={coach.headline}
      >
        <p>{coach.body}</p>
      </PageIntro>

      <div className="mt-8">
        <WeekStrip today={planDay} labels={weekPlans.map((item) => item.label)} doneDays={doneDays} />
        <p className="mt-3 min-h-[1lh] text-base text-sub">
          {!loading && !error ? hevyLine(workouts, doneThisWeek, planned, today) : ""}
        </p>
      </div>

      <div className="mt-10 grid items-start gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-12">
          <section aria-label="Treino de hoje">
            {plan.kind === "lift" ? (
              <>
                <SectionTitle
                  title={`Treino: ${plan.label}`}
                  meta={`${plan.focus}${plan.minutes ? `, cerca de ${plan.minutes} minutos` : ""}`}
                />
                {plan.note && <p className="mb-3 text-base font-medium text-text">{plan.note}</p>}
                <ExerciseList exercises={plan.exercises} />
                <p className="mt-3 text-base text-sub">
                  A série termina no esforço indicado, nunca em um número escolhido antes. Toque no exercício para ver a execução.
                </p>
              </>
            ) : plan.kind === "run" ? (
              <>
                <SectionTitle title="Corrida leve" />
                <p className="text-lead leading-[1.6] text-sub-strong">{plan.detail ?? "Ritmo em que você consegue conversar."}</p>
              </>
            ) : (
              <>
                <SectionTitle title="Descanso" />
                <p className="text-lead leading-[1.6] text-sub-strong">
                  {plan.message}
                </p>
              </>
            )}
          </section>

          <DayChecks
            plan={plan}
            proteinG={targets.proteinG}
            steps={profile.stepsPerDay}
            doneInHevy={doneDays.has(today)}
            checked={checked}
            toggle={toggle}
          />
        </div>

        <section aria-label="Comida de hoje">
          <SectionTitle
            title={`${kcal(targets.kcal)} kcal`}
            meta={`${targets.proteinG} g de proteína, ${targets.carbsG} g de carboidrato, ${targets.fatG} g de gordura`}
          />
          <MealList meals={menu} />
        </section>
      </div>

      <div className="mt-14 grid items-start gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <CalendarList snapshot={snapshot} />

        <section>
        <SectionTitle title="Quando precisar" />
        <div className="border-t border-border">
          <Disclosure title="Como decidir no domingo">
            <p className="mb-4">{checkin.ruleOrder.split(":")[0]}.</p>
            <IfThen items={checkin.rules.map((rule) => ({ condition: rule.ifLabel, result: rule.then }))} />
            <p className="mt-5 font-medium text-text">{checkin.neverChaseTheDate}</p>
          </Disclosure>
          <Disclosure title="O que medir">
            <PlainList items={protocolLines} />
            {Array.isArray(anchorExercises) && (
              <p className="mt-4">Exercícios que mostram seu progresso: {anchorExercises.join(", ")}.</p>
            )}
            <p className="mt-4">{checkin.maintenanceEstimate.note}</p>
          </Disclosure>
          <Disclosure title="Quando ignorar a balança">
            <PlainList
              items={checkin.ignoreScaleWindows.map(
                (window) =>
                  `${formatDay(addDaysKey(anchors[window.anchor], window.firstDay))} a ${formatDay(addDaysKey(anchors[window.anchor], window.lastDay))}: ${window.reason}`,
              )}
            />
            <p className="mt-4">{checkin.firstTwoWeeks.creatineLoad}</p>
          </Disclosure>
          <Disclosure title="Antes de começar a cortar">
            <p className="mb-4">{checkin.deficitLicence.text}</p>
            <PlainList items={checkin.deficitLicence.requires} />
          </Disclosure>
          <Disclosure title="Semana ruim">
            <PlainList items={checkin.badWeekOrder} />
          </Disclosure>
          <Disclosure title="O que mudaria o plano">
            <IfThen items={checkin.reviewTriggers.map((item) => ({ condition: item.if, result: item.then }))} />
          </Disclosure>
          <Disclosure title="O que mais importa">
            <IfThen items={levers.map((lever) => ({ condition: `${lever.rank}. ${lever.name}`, result: lever.why }))} />
          </Disclosure>
          <Disclosure title="Marcos até a data">
            <ul className="space-y-4">
              {events.map((event) => (
                <li key={event.id}>
                  <p className="text-text">
                    <span className="tabnum">{formatDay(event.date)}</span>: {event.title}
                  </p>
                  <p className="mt-0.5">{event.detail}</p>
                  {event.protocol && (
                    <div className="mt-2">
                      <PlainList items={event.protocol} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Disclosure>
          <Disclosure title="Ajustar meus números">
            <ProfileForm initial={profile} onSave={save} />
          </Disclosure>
        </div>
        </section>
      </div>
    </div>
  );
}
