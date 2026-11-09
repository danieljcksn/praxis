export interface BodyProfile {
  heightCm: number;
  weightKg: number;
  ageYears: number;
  waistCm: number | null;
  neckCm: number | null;
  absVisible: boolean;
  startDay: string;
  targetDay: string;
  holidayStart: string;
  carnivalStart: string;
  targetLabel: string;
  stepsPerDay: number;
  liftSessionsPerWeek: number;
  liftSessionMinutes: number;
  runKmPerWeek: number;
  measuredMaintenanceKcal: number | null;
  maxMode: boolean;
}

/** Trades adherence margin for the earliest fat loss the plan allows, so the
 *  highest-body-fat calendar runs for everyone who is not already lean. */
const MAX_MODE_BRANCH = {
  label: "Modo extremo: corta cedo, treina no limite",
  summary:
    "O maior ganho visual disponível vem de tirar gordura enquanto o músculo cresce. Calibra por 4 semanas, começa o déficit cedo, com licença, e nunca passa de manutenção menos 650 kcal.",
};

export interface Coefficients {
  bmrOffset: number;
  neatKcalPerKg: number;
  walkKcalPerKgKm: number;
  liftKcalPerKgMin: number;
  runKcalPerKgKm: number;
  tef: number;
}

export type PhaseDays =
  | { anchor: "startDate"; first: number; last: number }
  | { anchor: "targetDate"; firstDaysBefore: number; lastDaysBefore: number }
  | {
      anchor: "calendar";
      from: { date: CalendarAnchor; offset: number };
      to: { date: CalendarAnchor; offset: number };
    };

export type CalendarAnchor = "startDate" | "targetDate" | "holidayStart" | "carnivalStart";

export interface Phase {
  id: string;
  name: string;
  days: PhaseDays;
  kcalBase: "estimatedMaintenance" | "M0" | "M1" | "M2" | "M3";
  kcalDeltaPct?: number;
  kcalDeltaAbs?: number;
  kcalDeltaAbsIf?: { if: string; kcalDeltaAbs: number };
  dayRules?: { fromDayOfPhase: number; toDayOfPhase: number; kcalDeltaAbs: number }[];
  ratePctPerWeekMin: number | null;
  ratePctPerWeekMax: number | null;
  training: string;
  cardio: string;
  why: string;
  gate?: { rule: string };
  recompositionClause?: string;
}

export interface Branch {
  id: string;
  label: string;
  condition: { metric: string; min?: number; maxExclusive?: number; alsoRequires?: string };
  summary: string;
  phases: Phase[];
}

export interface EngineConfig {
  energy: { coefficients: { low: Coefficients; mid: Coefficients; high: Coefficients } };
  macros: {
    proteinGPerKg: { maintenanceOrSurplus: number; deficit: number };
    proteinGPerKgLeanMassHighBodyFat: {
      maintenanceOrSurplus: number;
      deficit: number;
      dailyFloorGPerKgBodyweight: number;
    };
    fatGPerKgByPhase: {
      maintenanceOrSurplus: { min: number };
      deficit: { min: number };
    };
    fatGPerKgMin: number;
    carbsRule: { gPerKgFloor: number };
  };
  bodyFat: {
    waistToHeightFallback: {
      bands: { branchId: string; ratioMin?: number; ratioMaxExclusive?: number }[];
    };
    knownError: { meanBiasPoints: number };
  };
  branches: Branch[];
}

export interface Macros {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  deficit: boolean;
}

export interface PhaseRow {
  phase: Phase;
  first: string;
  last: string;
  kcalMin: number;
  kcalMax: number;
  rateKgMin: number | null;
  rateKgMax: number | null;
  status: "past" | "now" | "next";
}

export interface PlanSnapshot {
  bodyFatPct: number | null;
  branch: Branch;
  branchPending: boolean;
  maintenance: { low: number; mid: number; high: number };
  calibrationKcal: number;
  floorKcal: number;
  rows: PhaseRow[];
  current: PhaseRow;
  today: Macros;
  daysLeft: number;
  weekNumber: number;
  totalWeeks: number;
  started: boolean;
}

const round50 = (value: number) => Math.round(value / 50) * 50;
const round5 = (value: number) => Math.round(value / 5) * 5;
const STEP_LENGTH_PER_HEIGHT = 0.415;

const toUtc = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

export const isDayKey = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(toUtc(value));

export function todayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export const addDaysKey = (iso: string, days: number) =>
  new Date(toUtc(iso) + days * 86_400_000).toISOString().slice(0, 10);

export const diffDays = (later: string, earlier: string) =>
  Math.round((toUtc(later) - toUtc(earlier)) / 86_400_000);

export function formatDay(iso: string, withYear = false): string {
  const [year, month, day] = iso.split("-");
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function estimateBodyFat(
  profile: Pick<BodyProfile, "waistCm" | "neckCm" | "heightCm">,
  biasPoints: number,
): number | null {
  const { waistCm, neckCm, heightCm } = profile;
  if (waistCm == null || neckCm == null || waistCm <= neckCm) return null;
  const density =
    1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm);
  return 495 / density - 450 - biasPoints;
}

export function estimateMaintenance(profile: BodyProfile, c: Coefficients): number {
  const { weightKg: kg, heightCm, ageYears } = profile;
  // Ten-Haaf by weight, height and age, less 90 kcal: its sample was far leaner
  // than most people using this. A taped body fat is too noisy to swap in here.
  const bmr =
    11.936 * kg + 587.728 * (heightCm / 100) - 8.129 * ageYears + 220.306 - 90 + c.bmrOffset;
  const stepKm = (profile.stepsPerDay * STEP_LENGTH_PER_HEIGHT * heightCm) / 100 / 1000;
  const subtotal =
    bmr +
    c.neatKcalPerKg * kg +
    stepKm * kg * c.walkKcalPerKgKm +
    (profile.liftSessionsPerWeek * profile.liftSessionMinutes * kg * c.liftKcalPerKgMin) / 7 +
    (profile.runKmPerWeek * kg * c.runKcalPerKgKm) / 7;
  return subtotal / (1 - c.tef);
}

export function macrosFor(
  kcal: number,
  deficit: boolean,
  weightKg: number,
  bodyFatPct: number | null,
  config: EngineConfig["macros"],
): Macros {
  const perKg = deficit
    ? config.proteinGPerKg.deficit
    : config.proteinGPerKg.maintenanceOrSurplus;
  let protein = weightKg * perKg;
  if (bodyFatPct != null && bodyFatPct >= 25) {
    const high = config.proteinGPerKgLeanMassHighBodyFat;
    const lean = weightKg * (1 - bodyFatPct / 100);
    protein = Math.max(
      lean * (deficit ? high.deficit : high.maintenanceOrSurplus),
      weightKg * high.dailyFloorGPerKgBodyweight,
    );
  }
  const fatRate = deficit
    ? config.fatGPerKgByPhase.deficit.min
    : config.fatGPerKgByPhase.maintenanceOrSurplus.min;
  const proteinG = round5(protein);
  let fatG = round5(weightKg * fatRate);
  const carbFloorG = weightKg * config.carbsRule.gPerKgFloor;
  if ((kcal - 4 * proteinG - 9 * fatG) / 4 < carbFloorG) {
    fatG = Math.max(
      round5(weightKg * config.fatGPerKgMin),
      round5((kcal - 4 * proteinG - 4 * carbFloorG) / 9),
    );
  }
  return {
    kcal,
    proteinG,
    fatG,
    carbsG: Math.max(0, Math.round((kcal - 4 * proteinG - 9 * fatG) / 4)),
    deficit,
  };
}

function pickBranch(
  profile: BodyProfile,
  bodyFatPct: number | null,
  config: EngineConfig,
): Branch | null {
  const byId = (id: string) => config.branches.find((branch) => branch.id === id) ?? null;
  if (bodyFatPct != null) {
    for (const branch of config.branches) {
      const { min, maxExclusive, alsoRequires } = branch.condition;
      if (min != null && bodyFatPct < min) continue;
      if (maxExclusive != null && bodyFatPct >= maxExclusive) continue;
      if (alsoRequires && !profile.absVisible) continue;
      return branch;
    }
    // Lean on the tape without the visual check is treated as the next branch up.
    return byId("b");
  }
  if (profile.waistCm == null) return null;
  const ratio = profile.waistCm / profile.heightCm;
  const band = config.bodyFat.waistToHeightFallback.bands.find(
    ({ ratioMin, ratioMaxExclusive }) =>
      (ratioMin == null || ratio >= ratioMin) &&
      (ratioMaxExclusive == null || ratio < ratioMaxExclusive),
  );
  return band ? byId(band.branchId) : null;
}

export function calendarAnchors(profile: BodyProfile): Record<CalendarAnchor, string> {
  return {
    startDate: profile.startDay,
    targetDate: profile.targetDay,
    holidayStart: profile.holidayStart,
    carnivalStart: profile.carnivalStart,
  };
}

export function phaseBounds(
  phase: Phase,
  profile: BodyProfile,
): { first: string; last: string } {
  const { days } = phase;
  if (days.anchor === "startDate") {
    return {
      first: addDaysKey(profile.startDay, days.first),
      last: addDaysKey(profile.startDay, days.last),
    };
  }
  if (days.anchor === "targetDate") {
    return {
      first: addDaysKey(profile.targetDay, -days.firstDaysBefore),
      last: addDaysKey(profile.targetDay, -days.lastDaysBefore),
    };
  }
  const anchors = calendarAnchors(profile);
  return {
    first: addDaysKey(anchors[days.from.date], days.from.offset),
    last: addDaysKey(anchors[days.to.date], days.to.offset),
  };
}

export function computePlan(
  profile: BodyProfile,
  config: EngineConfig,
  today: string,
): PlanSnapshot {
  const bodyFatPct = estimateBodyFat(profile, config.bodyFat.knownError.meanBiasPoints);
  const picked = pickBranch(profile, bodyFatPct, config);
  const fallback = config.branches.find((item) => item.id === "b") ?? config.branches[0];
  const highest = config.branches.find((item) => item.id === "c");
  const useMaxCalendar = profile.maxMode && picked?.id !== "a" && highest != null;
  const branch: Branch = useMaxCalendar
    ? {
        ...highest,
        ...MAX_MODE_BRANCH,
        phases: highest.phases.map((phase) => ({
          ...phase,
          why: phase.why.replace(/O ramo C/g, "Você"),
        })),
      }
    : (picked ?? fallback);

  const { low, mid, high } = config.energy.coefficients;
  const maintenanceMid = estimateMaintenance(profile, mid);
  const calibrationKcal = round50(maintenanceMid * 0.95);
  const floorKcal = round50(27.5 * profile.weightKg);
  const measuredBase = profile.measuredMaintenanceKcal ?? calibrationKcal;

  const resolve = (phase: Phase, dayOfPhase: number) => {
    const base = phase.kcalBase === "estimatedMaintenance" ? maintenanceMid : measuredBase;
    if (phase.kcalDeltaPct != null) {
      return { kcal: Math.max(floorKcal, round50(base * (1 + phase.kcalDeltaPct / 100))), deficit: false };
    }
    let delta = phase.kcalDeltaAbs ?? 0;
    const conditional = phase.kcalDeltaAbsIf?.if.match(/^estimatedBodyFatPct < ([\d.]+)$/);
    if (conditional && bodyFatPct != null && bodyFatPct < Number(conditional[1])) {
      delta = phase.kcalDeltaAbsIf?.kcalDeltaAbs ?? delta;
    }
    const dayRule = phase.dayRules?.find(
      (rule) => dayOfPhase >= rule.fromDayOfPhase && dayOfPhase <= rule.toDayOfPhase,
    );
    if (dayRule) delta = dayRule.kcalDeltaAbs;
    return { kcal: Math.max(floorKcal, round50(base + delta)), deficit: delta < 0 };
  };

  const rows: PhaseRow[] = branch.phases.map((phase) => {
    const { first, last } = phaseBounds(phase, profile);
    const span = Math.max(0, diffDays(last, first));
    const values = Array.from({ length: span + 1 }, (_, day) => resolve(phase, day).kcal);
    const toKg = (rate: number | null) =>
      rate == null ? null : (rate / 100) * profile.weightKg;
    return {
      phase,
      first,
      last,
      kcalMin: Math.min(...values),
      kcalMax: Math.max(...values),
      rateKgMin: toKg(phase.ratePctPerWeekMin),
      rateKgMax: toKg(phase.ratePctPerWeekMax),
      status: today > last ? "past" : today < first ? "next" : "now",
    };
  });

  const current =
    rows.find((row) => row.status === "now") ??
    (today < rows[0].first ? rows[0] : rows[rows.length - 1]);
  const dayOfPhase = Math.max(0, diffDays(today, current.first));
  const resolved = resolve(current.phase, dayOfPhase);
  const started = today >= profile.startDay;

  return {
    bodyFatPct,
    branch,
    branchPending: picked == null && !useMaxCalendar,
    maintenance: {
      low: round50(estimateMaintenance(profile, low)),
      mid: round50(maintenanceMid),
      high: round50(estimateMaintenance(profile, high)),
    },
    calibrationKcal,
    floorKcal,
    rows,
    current,
    today: macrosFor(resolved.kcal, resolved.deficit, profile.weightKg, bodyFatPct, config.macros),
    daysLeft: Math.max(0, diffDays(profile.targetDay, today)),
    weekNumber: started ? Math.floor(diffDays(today, profile.startDay) / 7) + 1 : 0,
    totalWeeks: Math.ceil(diffDays(profile.targetDay, profile.startDay) / 7),
    started,
  };
}

/** Plan quantities are stored as `name * a / b` chains; anything else is refused. */
export function evalGrams(expr: string, vars: Record<string, number>): number | null {
  const tokens = expr.trim().split(/\s+/);
  const read = (token: string) => (token in vars ? vars[token] : Number(token));
  let value = read(tokens[0]);
  for (let index = 1; index + 1 < tokens.length; index += 2) {
    const operand = read(tokens[index + 1]);
    if (tokens[index] === "*") value *= operand;
    else if (tokens[index] === "/") value /= operand;
    else return null;
  }
  return Number.isFinite(value) ? value : null;
}

export function sanitizeProfile(value: unknown): BodyProfile | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const num = (key: string) =>
    typeof o[key] === "number" && Number.isFinite(o[key]) && (o[key] as number) > 0
      ? (o[key] as number)
      : null;
  const heightCm = num("heightCm");
  const weightKg = num("weightKg");
  const ageYears = num("ageYears");
  if (!heightCm || !weightKg || !ageYears) return null;
  if (!isDayKey(o.startDay) || !isDayKey(o.targetDay) || o.targetDay <= o.startDay) return null;
  return {
    heightCm,
    weightKg,
    ageYears,
    waistCm: num("waistCm"),
    neckCm: num("neckCm"),
    absVisible: o.absVisible === true,
    startDay: o.startDay,
    targetDay: o.targetDay,
    holidayStart: isDayKey(o.holidayStart) ? o.holidayStart : `${o.startDay.slice(0, 4)}-12-21`,
    carnivalStart: isDayKey(o.carnivalStart) ? o.carnivalStart : addDaysKey(o.targetDay, -49),
    targetLabel: typeof o.targetLabel === "string" ? o.targetLabel.slice(0, 40) : "",
    stepsPerDay: num("stepsPerDay") ?? 10_000,
    liftSessionsPerWeek: num("liftSessionsPerWeek") ?? 5,
    liftSessionMinutes: num("liftSessionMinutes") ?? 75,
    runKmPerWeek: typeof o.runKmPerWeek === "number" && o.runKmPerWeek >= 0 ? o.runKmPerWeek : 0,
    measuredMaintenanceKcal: num("measuredMaintenanceKcal"),
    maxMode: o.maxMode !== false,
  };
}
