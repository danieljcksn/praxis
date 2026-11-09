import type { Cardio, Exercise, Program, StageOverride } from "@/lib/training-plan/plan";
import { EXTREME_MODE } from "@/lib/training-plan/extreme";
import { PageHeader, SectionHeading } from "@/components/layout/PageHeader";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import { BulletList, Labeled, TextCard } from "./parts";

function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (!minutes) return `${rest}s`;
  return rest ? `${minutes}min${rest}` : `${minutes}min`;
}

function stageLine(stage: StageOverride): string {
  const reps =
    stage.repsMin != null
      ? ` de ${stage.repsMin} a ${stage.repsMax}`
      : stage.reps != null
        ? ` de ${stage.reps}`
        : "";
  const parts = [
    stage.name,
    stage.sets != null ? `${stage.sets} séries${reps}` : null,
    stage.rir != null ? `sobram ${stage.rir}` : null,
    stage.eccentricSeconds != null ? `descida em ${stage.eccentricSeconds} s` : null,
  ].filter(Boolean);
  return `${stage.weeks ? `Semana ${stage.weeks}` : `Ao chegar a ${stage.when}`}: ${parts.join(", ")}`;
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-text">
          {exercise.name}
          {exercise.isAnchor && (
            <Badge tone="hevy" className="ml-2 align-middle">
              Âncora
            </Badge>
          )}
        </p>
        <p className="shrink-0 text-sm tabnum text-hevy">
          {exercise.sets} × {exercise.repsMin}-{exercise.repsMax}
        </p>
      </div>
      <p className="mt-1 text-micro tabnum text-sub">
        Sobram {exercise.rir} reps{exercise.lastSetToFailure ? ", última série à falha" : ""} · descanso{" "}
        {formatRest(exercise.restSeconds)}
        {exercise.rampSets ? ` · aquecer em ${exercise.rampSets} séries` : ""} · Hevy: {exercise.hevyName}
      </p>
      <p className="mt-1.5 text-mini text-sub-strong">{exercise.cue}</p>
      {exercise.stageOverride?.map((stage) => (
        <p key={stageLine(stage)} className="mt-1 text-micro text-hevy">
          {stageLine(stage)}
        </p>
      ))}
      <p className="mt-1 text-micro text-sub">Troca: {exercise.substitution}</p>
    </li>
  );
}

const RUN_LABELS: Record<string, string> = {
  weeks1to4: "Semanas 1 a 4",
  weeks5to6: "Semanas 5 e 6",
  holidays: "Festas",
  mainBlock: "Bloco principal",
  carnival: "Carnaval",
  closingBlock: "Bloco final",
  finalBlock: "Últimos dias",
};

export function WorkoutsScreen({ program, cardio }: { program: Program; cardio: Cardio }) {
  const names = new Map(
    program.sessions.flatMap((session) =>
      session.exercises.map((exercise) => [exercise.hevyName, exercise.name] as const),
    ),
  );
  const sessionName = new Map(program.sessions.map((session) => [session.id, session.name]));

  return (
    <div lang="pt-BR">
      <PageHeader eyebrow="Físico" tone="hevy" title="Treinos" subtitle={program.split.description} />

      <Card>
        <CardHeader eyebrow="Semana" tone="hevy" title={program.split.name} />
        <ul className="mt-4 divide-y divide-border">
          {program.split.weekTemplate.map((day) => (
            <li key={day.day} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
              <span className="capitalize text-sub">{day.day}</span>
              {day.sessionId ? (
                <a href={`#${day.sessionId}`} className="text-right text-text underline decoration-border-strong underline-offset-2 hover:decoration-hevy">
                  {sessionName.get(day.sessionId)}
                </a>
              ) : day.day === "domingo" ? (
                <a href="#modo-extremo" className="text-right text-text underline decoration-border-strong underline-offset-2 hover:decoration-hevy">
                  {EXTREME_MODE.session.name}
                </a>
              ) : (
                <span className="text-right text-sub-strong">{day.note}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <TextCard eyebrow="A regra central" title={program.progression.name} description={program.progression.replaces}>
        <BulletList items={program.progression.rules} />
        <p className="mt-4 text-sm text-text">{program.progression.firstWeek}</p>
      </TextCard>

      <SectionHeading className="mt-8" eyebrow="Sessões" tone="hevy" title="O que fazer em cada dia" subtitle={program.sessionLengthNote} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {program.sessions.map((session) => (
          <Card key={session.id} id={session.id} className="scroll-mt-20">
            <CardHeader
              eyebrow={session.dayHint}
              tone="hevy"
              title={session.name}
              description={session.estimatedMinutes ? `Cerca de ${session.estimatedMinutes} minutos` : undefined}
            />
            <ul className="mt-4 divide-y divide-border">
              {session.exercises.map((exercise) => (
                <ExerciseRow key={exercise.hevyName} exercise={exercise} />
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="mt-3 text-mini text-sub">{program.hevyNote}</p>

      <TextCard eyebrow="Antes da primeira série" title="Aquecimento" description={program.warmup.general}>
        <ul className="divide-y divide-border text-sm">
          {program.warmup.ramp.map((step) => (
            <li key={step.pctLoad} className="flex justify-between gap-3 py-2">
              <span className="tabnum text-sub-strong">{step.pctLoad}% da carga</span>
              <span className="shrink-0 tabnum text-hevy">{step.reps} reps</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-text">{program.warmup.firstRepRule}</p>
      </TextCard>

      <Card id="modo-extremo" className="mt-4 scroll-mt-20 border-hevy/25">
        <CardHeader eyebrow="Tudo no limite" tone="hevy" title={EXTREME_MODE.title} description={EXTREME_MODE.intro} />
        <p className="mt-4 text-sm text-text">{EXTREME_MODE.ceiling}</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Labeled label="Para entrar">
              <BulletList items={EXTREME_MODE.entry} />
            </Labeled>
            <Labeled label="As regras">
              <BulletList items={EXTREME_MODE.rules} />
            </Labeled>
            <Labeled label="Quando recuar">
              <BulletList items={EXTREME_MODE.stop} />
            </Labeled>
          </div>
          <div>
            <p className="text-sm font-medium text-text">{EXTREME_MODE.session.name}</p>
            <p className="mt-0.5 text-mini text-sub">
              Cerca de {EXTREME_MODE.session.minutes} minutos. {EXTREME_MODE.session.note}
            </p>
            <ul className="mt-3 divide-y divide-border">
              {EXTREME_MODE.session.exercises.map((exercise) => (
                <li key={exercise.name} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 text-text">{exercise.name}</span>
                    <span className="shrink-0 tabnum text-hevy">
                      {exercise.sets} × {exercise.reps}
                    </span>
                  </div>
                  <p className="mt-0.5 text-micro tabnum text-sub">
                    Sobram {exercise.rir} reps · descanso {formatRest(exercise.rest)} · Hevy: {exercise.hevyName}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <TextCard eyebrow="Volume" title="Séries por semana" description={program.setCountingRule}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-mini">
              <thead className="text-sub">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Músculo</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Sem. 1-4</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Sem. 5-6</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Sem. 9-13</th>
                  <th scope="col" className="pl-2 py-2 text-right font-medium">Teto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabnum text-sub-strong">
                {program.weeklySetTargets.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3 text-text">{row.muscle}</td>
                    <td className="px-2 py-2 text-right">{row.weeks1to4}</td>
                    <td className="px-2 py-2 text-right">{row.weeks5to6}</td>
                    <td className="px-2 py-2 text-right">{row.weeks9to13}</td>
                    <td className="pl-2 py-2 text-right">{row.ceilingPerWeek}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TextCard>

        <TextCard eyebrow="Blocos" title="Como o treino evolui" description="No modo extremo, siga o que cada bloco diz para o ramo C.">
          <ul className="space-y-4">
            {program.mesocycles.map((block) => (
              <li key={block.id} className="text-sm">
                <p className="text-text">
                  {block.name}
                  <span className="tabnum text-sub">
                    {block.weeks.from != null ? ` · semanas ${block.weeks.from} a ${block.weeks.to}` : ""}
                    {block.branches.includes("c") ? ` · ${block.setsPerWeek.min} a ${block.setsPerWeek.max} séries` : ""}
                  </span>
                </p>
                <p className="mt-0.5 text-sub-strong">{block.focus}</p>
                {block.branches.includes("c") && block.changes.length > 0 && (
                  <p className="mt-1 text-mini text-sub">
                    {block.changes
                      .map((change) => `${change.deltaSets > 0 ? "+" : ""}${change.deltaSets} ${names.get(change.hevyName) ?? change.hevyName}`)
                      .join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </TextCard>

        <TextCard eyebrow="Dobradiça de quadril" title="Entrada em estágios" description={program.hingeStaging.evidence}>
          <ul className="divide-y divide-border text-sm">
            {program.hingeStaging.stages.map((stage) => (
              <li key={stage.weeks} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 text-sub-strong">
                  <span className="tabnum text-sub">Sem. {stage.weeks}: </span>
                  {stage.exercise}
                </span>
                <span className="shrink-0 tabnum text-hevy">
                  {stage.sets} séries · sobram {stage.rir}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-text">{program.hingeStaging.stopRule}</p>
        </TextCard>

        <div className="grid gap-4">
          <TextCard eyebrow="Recuperação" title="Semanas leves">
            <BulletList items={[program.deload.planned, program.deload.unplanned, program.deload.rule]} />
          </TextCard>
          <TextCard eyebrow="Dia ruim" title="Versão de pouca energia" description={program.lowEnergyVersion.when}>
            <BulletList items={program.lowEnergyVersion.rules} />
          </TextCard>
          <TextCard eyebrow="Depois de parar" title="Como voltar" description={program.returnProtocol.when}>
            <BulletList items={program.returnProtocol.rules} />
          </TextCard>
          <TextCard eyebrow="Pior caso" title={`Sessão mínima, ${program.minimumViableSession.minutes} minutos`} description={program.minimumViableSession.rule}>
            <ul className="divide-y divide-border text-sm">
              {program.minimumViableSession.exercises.map((exercise) => (
                <li key={exercise.hevyName} className="flex justify-between gap-3 py-2">
                  <span className="text-sub-strong">{exercise.name}</span>
                  <span className="shrink-0 tabnum text-hevy">
                    {exercise.sets} séries · sobram {exercise.rir}
                  </span>
                </li>
              ))}
            </ul>
          </TextCard>
        </div>
      </div>

      <TextCard eyebrow="Cardio" title="Passos e corrida" description={cardio.intensity}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Labeled label={`Passos: ${cardio.steps.target.toLocaleString("pt-BR")} por dia`}>
              {cardio.steps.rule} {cardio.steps.cost}
            </Labeled>
            <Labeled label="Onde encaixar">
              <BulletList items={cardio.placement.rules} />
            </Labeled>
          </div>
          <div className="space-y-4">
            <Labeled label={`Corridas: ${cardio.runs.frequency} por semana`}>
              <ul className="divide-y divide-border">
                {Object.entries(RUN_LABELS)
                  .filter(([key]) => typeof cardio.runs[key] === "string")
                  .map(([key, label]) => (
                    <li key={key} className="flex justify-between gap-3 py-2">
                      <span className="shrink-0 text-sub">{label}</span>
                      <span className="text-right">{cardio.runs[key]}</span>
                    </li>
                  ))}
              </ul>
            </Labeled>
            <Labeled label="Em déficit">{cardio.fatLossChanges}</Labeled>
            <Labeled label="Quando parar">{cardio.stopRule}</Labeled>
          </div>
        </div>
      </TextCard>
    </div>
  );
}
