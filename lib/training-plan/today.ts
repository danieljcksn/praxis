import { addDaysKey, diffDays, type BodyProfile, type PlanSnapshot } from "./engine";
import { EXTREME_MODE } from "./extreme";
import type { Cardio, Exercise, Program } from "./plan";

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const WEEKDAY_SHORT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const SESSION_LABELS: Record<string, { label: string; focus: string }> = {
  push_a: { label: "Push", focus: "Peito e ombros" },
  pull_a: { label: "Pull", focus: "Costas e bíceps" },
  legs_a: { label: "Legs", focus: "Quadríceps e posterior" },
  upper_c: { label: "Upper", focus: "Barra, peito alto, ombro e braços" },
  legs_b: { label: "Legs", focus: "Agachamento, posterior e glúteo" },
  sunday: { label: "Ombros", focus: "Ombro, peito alto e braços" },
};

export interface ResolvedExercise {
  key: string;
  name: string;
  sets: number;
  reps: string;
  effort: string;
  rest: string;
  cue: string;
  swap: string;
  hevyName: string;
}

export type DayPlan =
  | {
      kind: "lift";
      id: string;
      label: string;
      focus: string;
      minutes: number | null;
      exercises: ResolvedExercise[];
      note: string | null;
    }
  | { kind: "run"; label: string; detail: string | null }
  | { kind: "rest"; label: string; message: string };

export const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

export function mondayOf(day: string): string {
  return addDaysKey(day, -((weekdayOf(day) + 6) % 7));
}

function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (!minutes) return `${rest}s`;
  return rest ? `${minutes}min${String(rest).padStart(2, "0")}` : `${minutes}min`;
}

function repsLeft(rir: string | number): string {
  const text = String(rir).replace("-", " a ").replace("+", " ou mais");
  if (text === "0 a 1") return "Sobrando no máximo 1 rep";
  return text === "1" ? "Sobrando 1 rep" : `Sobrando ${text} reps`;
}

const weeksMatch = (spec: string, week: number) => {
  if (spec.endsWith("+")) return week >= Number.parseInt(spec, 10);
  const [from, to = from] = spec.split("-").map(Number);
  return week >= from && week <= to;
};

function resolveExercise(exercise: Exercise, week: number, light: boolean): ResolvedExercise {
  const stage = exercise.stageOverride?.find(({ weeks }) => weeks && weeksMatch(weeks, week));
  const rawSets = stage?.sets ?? exercise.sets;
  const failure = stage?.lastSetToFailure ?? exercise.lastSetToFailure;
  const effort = light
    ? repsLeft("3+")
    : `${repsLeft(stage?.rir ?? exercise.rir)}${failure ? ", última série até a falha" : ""}`;
  return {
    key: exercise.hevyName,
    name: stage?.name ?? exercise.name,
    sets: light ? Math.ceil(rawSets / 2) : rawSets,
    reps: stage?.reps != null ? String(stage.reps) : `${exercise.repsMin} a ${exercise.repsMax}`,
    effort,
    rest: formatRest(exercise.restSeconds),
    cue: exercise.cue.replace(/\s*Âncora\.?\s*$/, ""),
    swap: exercise.substitution,
    hevyName: stage?.hevyName ?? exercise.hevyName,
  };
}

function sundayExercises(): Exercise[] {
  return EXTREME_MODE.session.exercises.map((exercise) => {
    const [repsMin, repsMax] = exercise.reps.split("-").map(Number);
    return {
      name: exercise.name,
      hevyName: exercise.hevyName,
      sets: exercise.sets,
      repsMin,
      repsMax,
      rir: exercise.rir,
      restSeconds: exercise.rest,
      cue: "",
      substitution: "",
    };
  });
}

const DEFAULT_REST = "Nada de treino. Faça seus passos, coma tudo e durma.";
/** The final 2 days carry no training at all. */
const NO_TRAINING_DAYS_LEFT = 2;
/** Legs stop here so soreness is gone before the date. */
const NO_LEGS_DAYS_LEFT = 5;
const LAST_RUN_DAYS_LEFT = 4;

function restMessage(daysLeft: number): string {
  if (daysLeft < 0) return "O plano terminou. Nada programado para hoje.";
  if (daysLeft === 0) return "Hoje não tem treino. Seu único trabalho é aproveitar.";
  if (daysLeft === 1) return "Nada de treino. Coma como sempre e durma cedo.";
  return DEFAULT_REST;
}

function lightWeekNote(snapshot: PlanSnapshot, day: string, daysLeft: number): string | null {
  const { phase, first } = snapshot.current;
  if (phase.id === "p3_festas" && diffDays(day, first) < 7) {
    return "Semana leve: metade das séries, a mesma carga e nada perto da falha.";
  }
  if (phase.id === "p5_carnaval") {
    return "Semana leve: metade das séries, ou 2 treinos de corpo inteiro se viajar.";
  }
  if (daysLeft <= NO_LEGS_DAYS_LEFT) {
    return "Última semana: 3 treinos, metade das séries e nenhuma falha.";
  }
  return null;
}

const RUN_KEY_BY_PHASE: Record<string, string> = {
  p2_primeiro_bloco: "weeks5to6",
  p3_festas: "holidays",
  p4_bloco_principal: "mainBlock",
  p5_carnaval: "carnival",
  p6_bloco_final: "closingBlock",
  p7_manutencao_pico: "finalBlock",
};

export function planForDay(
  day: string,
  program: Program,
  cardio: Cardio,
  profile: BodyProfile,
  snapshot: PlanSnapshot,
): DayPlan {
  const name = WEEKDAYS[weekdayOf(day)];
  const slot = program.split.weekTemplate.find((item) => item.day === name);
  const week = Math.max(1, Math.floor(diffDays(day, profile.startDay) / 7) + 1);
  const daysLeft = diffDays(profile.targetDay, day);
  if (daysLeft <= NO_TRAINING_DAYS_LEFT) {
    return { kind: "rest", label: "Descanso", message: restMessage(daysLeft) };
  }
  const note = lightWeekNote(snapshot, day, daysLeft);

  // In the final days a leg session becomes the last upper pump.
  const scheduledId =
    slot?.sessionId?.startsWith("legs") && daysLeft <= NO_LEGS_DAYS_LEFT ? "upper_c" : slot?.sessionId;
  const session = scheduledId ? program.sessions.find((item) => item.id === scheduledId) : undefined;
  if (session) {
    const { label, focus } = SESSION_LABELS[session.id] ?? { label: session.name, focus: "" };
    return {
      kind: "lift",
      id: session.id,
      label,
      focus,
      minutes: session.estimatedMinutes ?? null,
      exercises: session.exercises.map((item) => resolveExercise(item, week, note != null)),
      note,
    };
  }

  if (name === "domingo" && profile.maxMode && daysLeft > NO_LEGS_DAYS_LEFT) {
    const ramping = week <= 2;
    return {
      kind: "lift",
      id: "sunday",
      label: SESSION_LABELS.sunday.label,
      focus: SESSION_LABELS.sunday.focus,
      minutes: ramping ? 20 : EXTREME_MODE.session.minutes,
      exercises: sundayExercises().map((item) => {
        const resolved = resolveExercise(item, week, note != null);
        return ramping ? { ...resolved, sets: Math.ceil(item.sets / 2) } : resolved;
      }),
      note: ramping ? "Semanas 1 e 2: metade das séries." : note,
    };
  }

  if (slot?.note?.startsWith("Corrida") && daysLeft >= LAST_RUN_DAYS_LEFT) {
    const key = week <= 4 ? "weeks1to4" : RUN_KEY_BY_PHASE[snapshot.current.phase.id];
    const detail = key ? cardio.runs[key] : null;
    return { kind: "run", label: "Corrida", detail: typeof detail === "string" ? detail : null };
  }
  return { kind: "rest", label: "Descanso", message: DEFAULT_REST };
}

const pick = (lines: string[], seed: number) => lines[((seed % lines.length) + lines.length) % lines.length];

const LINES = {
  calibrationLift: [
    "Você já sabe aparecer na academia. O que muda agora é o que acontece depois da décima repetição.",
    "Hoje você descobre quanta força estava guardada. Vá até onde o plano manda e escreva o número que sair.",
    "Nada de decidir a repetição antes da série. Você é mais forte do que o número 10.",
    "Estas 4 semanas constroem tudo o que vem depois. Treine duro, coma tudo e durma.",
  ],
  deficitLift: [
    "A cintura está indo embora e a carga fica onde está. Segure cada quilo: é assim que o músculo fica.",
    "Menos comida, mesmo ferro. Você está fazendo a parte que quase ninguém aguenta.",
    "Hoje vai pesar mais do que o normal, e tudo bem. Faça a sessão inteira e vá jantar.",
  ],
  calibrationRest: ["Hoje o músculo cresce, e ele precisa de comida. Bata a proteína e vá dormir cedo."],
  deficitRest: ["A fome de hoje aparece no espelho do dia. Você aguenta. Proteína primeiro, passos depois."],
  calibrationRun: ["Ritmo de conversa. Perna solta, cabeça limpa, e o resto do dia é comida."],
  deficitRun: ["Sem tiro e sem heroísmo. O objetivo é gastar, voltar inteiro e treinar melhor amanhã."],
  holidays: ["Festa não desfaz o que você construiu. Treine, bata a proteína e aproveite a mesa sem culpa."],
  carnival: ["Aproveite sem culpa, mantenha a proteína e volte inteiro."],
  peak: [
    "O trabalho pesado já foi feito. Agora você só protege o que construiu.",
    "Nada novo a partir daqui. Mesma comida, mesmos horários e sono em primeiro lugar.",
  ],
};

export function coachMessage(
  today: string,
  plan: DayPlan,
  profile: BodyProfile,
  snapshot: PlanSnapshot,
): { headline: string; body: string } {
  const untilStart = diffDays(profile.startDay, today);
  if (untilStart > 0) {
    return {
      headline: untilStart === 1 ? "Amanhã começa." : `Faltam ${untilStart} dias para começar.`,
      body: "Hoje você prepara o terreno: balança de cozinha, creatina e carne comprada. Você entra pronto.",
    };
  }
  if (today > profile.targetDay) {
    return {
      headline: "Você chegou.",
      body: "Aproveite. Quando quiser construir mais, o próximo bloco começa com um superávit pequeno.",
    };
  }
  if (snapshot.daysLeft === 0) {
    return { headline: "Hoje é o dia.", body: "Você construiu isso sessão por sessão. Agora é só aproveitar." };
  }
  if (snapshot.daysLeft === 1) {
    return { headline: "Amanhã é o dia.", body: "Nada de treino hoje. Coma como sempre e durma cedo." };
  }

  const seed = diffDays(today, profile.startDay);
  const phase = snapshot.current.phase.id;
  const headline =
    plan.kind === "lift" ? `Hoje é ${plan.label}.` : plan.kind === "run" ? "Hoje é corrida leve." : "Hoje é descanso.";
  if (phase === "p3_festas") return { headline, body: pick(LINES.holidays, seed) };
  if (phase === "p5_carnaval") return { headline, body: pick(LINES.carnival, seed) };
  if (phase === "p7_manutencao_pico") return { headline, body: pick(LINES.peak, seed) };

  const prefix = snapshot.today.deficit ? "deficit" : "calibration";
  const key = `${prefix}${plan.kind === "lift" ? "Lift" : plan.kind === "run" ? "Run" : "Rest"}` as keyof typeof LINES;
  return { headline, body: pick(LINES[key], seed) };
}
