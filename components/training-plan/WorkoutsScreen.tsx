"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBodyProfile } from "@/lib/hooks/useBodyProfile";
import {
  addDaysKey,
  computePlan,
  todayKey,
  type BodyProfile,
  type EngineConfig,
} from "@/lib/training-plan/engine";
import { EXTREME_MODE } from "@/lib/training-plan/extreme";
import type { Cardio, Program } from "@/lib/training-plan/plan";
import { WEEKDAY_SHORT, mondayOf, planForDay, type DayPlan } from "@/lib/training-plan/today";
import { cn } from "@/lib/cn";
import { Disclosure, ExerciseList, KeyValueList, PageIntro, PlainList, SectionTitle } from "./ui";

type LiftDay = { weekday: string; plan: Extract<DayPlan, { kind: "lift" }> };

export function WorkoutsScreen({
  defaultProfile,
  config,
  program,
  cardio,
}: {
  defaultProfile: BodyProfile | null;
  config: EngineConfig;
  program: Program;
  cardio: Cardio;
}) {
  const { profile, ready } = useBodyProfile(defaultProfile);
  const today = todayKey();
  const [picked, setPicked] = useState<string | null>(null);

  const week = useMemo(() => {
    if (!profile) return null;
    const reference = today < profile.startDay ? profile.startDay : today;
    const snapshot = computePlan(profile, config, reference);
    const monday = mondayOf(reference);
    const lifts: LiftDay[] = [];
    let todayId: string | null = null;
    for (let index = 0; index < 7; index += 1) {
      const day = addDaysKey(monday, index);
      const plan = planForDay(day, program, cardio, profile, snapshot);
      if (plan.kind !== "lift") continue;
      lifts.push({ weekday: WEEKDAY_SHORT[index], plan });
      if (day === reference) todayId = plan.id;
    }
    return { lifts, todayId, weekNumber: Math.max(1, snapshot.weekNumber) };
  }, [profile, config, program, cardio, today]);

  if (!ready) return <div className="min-h-dvh" />;

  if (!week) {
    return (
      <div lang="pt-BR">
        <PageIntro title="Seus treinos aparecem aqui." />
        <Link href="/training" className="mt-4 inline-block text-lead text-text underline underline-offset-4">
          Preencher meus números
        </Link>
      </div>
    );
  }

  const activeId = picked ?? week.todayId ?? week.lifts[0]?.plan.id;
  const active = week.lifts.find((item) => item.plan.id === activeId)?.plan ?? week.lifts[0]?.plan;
  const exerciseNames = new Map(
    program.sessions.flatMap((session) =>
      session.exercises.map((exercise) => [exercise.hevyName, exercise.name] as const),
    ),
  );

  return (
    <div lang="pt-BR" className="max-w-[44rem]">
      <PageIntro title="Treinos" kicker={`Semana ${week.weekNumber}`}>
        <p>A série termina no esforço, nunca em um número escolhido antes. Bateu o topo da faixa em todas as séries? Na próxima, suba a carga.</p>
      </PageIntro>

      <div
        role="group"
        aria-label="Escolher treino"
        className="mt-8 grid border-y border-border"
        style={{ gridTemplateColumns: `repeat(${week.lifts.length}, minmax(0, 1fr))` }}
      >
        {week.lifts.map(({ weekday, plan }) => {
          const selected = plan.id === active?.id;
          return (
            <button
              key={plan.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setPicked(plan.id)}
              className="relative min-h-16 py-3 pr-1 text-left"
            >
              <span className={cn("block text-sm", selected ? "font-medium text-text" : "text-sub")}>{weekday}</span>
              <span className={cn("mt-0.5 block truncate text-sm", selected ? "text-text" : "text-sub-strong")}>
                {plan.label}
              </span>
              {selected && <span className="absolute inset-x-0 bottom-[-1px] mr-1.5 h-0.5 bg-accent" aria-hidden />}
            </button>
          );
        })}
      </div>

      {active && (
        <section className="mt-8" aria-label={`Treino ${active.label}`}>
          <SectionTitle
            title={active.label}
            meta={`${active.focus}${active.minutes ? `, cerca de ${active.minutes} minutos` : ""}`}
          />
          {active.note && <p className="mb-3 text-base font-medium text-text">{active.note}</p>}
          <ExerciseList exercises={active.exercises} />
          <p className="mt-3 text-base text-sub">Toque no exercício para ver a execução.</p>
        </section>
      )}

      <section className="mt-14">
        <SectionTitle title="Quando precisar" />
        <div className="border-t border-border">
          <Disclosure title="Como progredir">
            <PlainList items={program.progression.rules} />
            <p className="mt-4 text-text">{program.progression.firstWeek}</p>
          </Disclosure>
          <Disclosure title="Aquecimento">
            <p className="mb-3">{program.warmup.general}</p>
            <KeyValueList
              rows={program.warmup.ramp.map((step) => ({
                key: String(step.pctLoad),
                label: `${step.pctLoad}% da carga`,
                value: `${step.reps} reps`,
              }))}
            />
            <p className="mt-3">{program.warmup.firstRepRule}</p>
          </Disclosure>
          <Disclosure title="Modo extremo">
            <p className="text-text">{EXTREME_MODE.intro}</p>
            <p className="mt-3">{EXTREME_MODE.ceiling}</p>
            <h3 className="mt-5 mb-2 text-lead font-medium text-text">Para valer</h3>
            <PlainList items={[...EXTREME_MODE.entry, ...EXTREME_MODE.rules]} />
            <h3 className="mt-5 mb-2 text-lead font-medium text-text">Quando recuar</h3>
            <PlainList items={EXTREME_MODE.stop} />
          </Disclosure>
          <Disclosure title="Dia com pouca energia">
            <p className="mb-3">{program.lowEnergyVersion.when}</p>
            <PlainList items={program.lowEnergyVersion.rules} />
          </Disclosure>
          <Disclosure title={`Sessão mínima de ${program.minimumViableSession.minutes} minutos`}>
            <p className="mb-3">{program.minimumViableSession.rule}</p>
            <KeyValueList
              rows={program.minimumViableSession.exercises.map((exercise) => ({
                key: exercise.hevyName,
                label: exercise.name,
                value: `${exercise.sets} séries`,
              }))}
            />
          </Disclosure>
          <Disclosure title="Voltar depois de parar">
            <p className="mb-3">{program.returnProtocol.when}</p>
            <PlainList items={program.returnProtocol.rules} />
          </Disclosure>
          <Disclosure title="Semanas leves">
            <PlainList items={[program.deload.planned, program.deload.unplanned, program.deload.rule]} />
          </Disclosure>
          <Disclosure title="Dobradiça de quadril">
            <p className="mb-3">{program.hingeStaging.evidence}</p>
            <KeyValueList
              rows={program.hingeStaging.stages.map((stage) => ({
                key: stage.weeks,
                label: `Semana ${stage.weeks}: ${stage.exercise}`,
                value: `${stage.sets} séries`,
              }))}
            />
            <p className="mt-3 text-text">{program.hingeStaging.stopRule}</p>
          </Disclosure>
          <Disclosure title="Séries por músculo">
            <p className="mb-3">{program.setCountingRule}</p>
            <KeyValueList
              rows={program.weeklySetTargets.map((row) => ({
                key: row.id,
                label: row.muscle,
                value: `${row.weeks1to4} a ${row.weeks9to13}, teto ${row.ceilingPerWeek}`,
              }))}
            />
          </Disclosure>
          <Disclosure title="Como o treino evolui">
            <p className="mb-3">No modo extremo, siga o que cada bloco diz para o ramo C.</p>
            <ul className="space-y-4">
              {program.mesocycles.map((block) => (
                <li key={block.id}>
                  <p className="text-text">{block.name}</p>
                  <p className="mt-0.5">{block.focus}</p>
                  {block.branches.includes("c") && block.changes.length > 0 && (
                    <p className="mt-1 text-sub">
                      {block.changes
                        .map((change) => `${change.deltaSets > 0 ? "+" : ""}${change.deltaSets} ${exerciseNames.get(change.hevyName) ?? change.hevyName}`)
                        .join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Disclosure>
          <Disclosure title="Passos e corrida">
            <p>{cardio.steps.rule} {cardio.steps.cost}</p>
            <p className="mt-3">{cardio.intensity}</p>
            <div className="mt-3">
              <PlainList items={cardio.placement.rules} />
            </div>
            <p className="mt-3">{cardio.fatLossChanges}</p>
            <p className="mt-3 text-text">{cardio.stopRule}</p>
          </Disclosure>
        </div>
      </section>
    </div>
  );
}
