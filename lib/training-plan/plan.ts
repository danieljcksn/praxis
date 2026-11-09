import raw from "@/content/training/plan.json";
import type { EngineConfig } from "./engine";

export interface Exercise {
  name: string;
  hevyName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: string | number;
  restSeconds: number;
  cue: string;
  substitution: string;
  isAnchor?: boolean;
  lastSetToFailure?: boolean;
}

export interface WorkoutSession {
  id: string;
  name: string;
  dayHint?: string;
  estimatedMinutes?: number;
  exercises: Exercise[];
}

export interface Program {
  split: {
    name: string;
    description: string;
    weekTemplate: { day: string; sessionId: string | null; note?: string }[];
  };
  weeklySetTargets: {
    muscle: string;
    id: string;
    weeks1to4: number;
    weeks5to6: number;
    weeks9to13: number;
    ceilingPerWeek: number;
  }[];
  setCountingRule: string;
  mesocycles: {
    id: string;
    name: string;
    weeks: { from: number; to: number };
    setsPerWeek: { min: number; max: number };
    focus: string;
    changes: { sessionId: string; hevyName: string; deltaSets: number }[];
  }[];
  sessions: WorkoutSession[];
  sessionLengthNote: string;
  hevyNote: string;
  progression: { name: string; replaces: string; rules: string[]; firstWeek: string };
  deload: { planned: string; unplanned: string; rule: string };
  lowEnergyVersion: { when: string; rules: string[] };
  minimumViableSession: {
    minutes: number;
    exercises: { name: string; hevyName: string; sets: number; rir: string | number }[];
    rule: string;
  };
  hingeStaging: {
    evidence: string;
    stages: { weeks: string; exercise: string; sets: number | string; rir: string | number }[];
    stopRule: string;
  };
}

export interface Cardio {
  steps: { target: number; rule: string; cost: string };
  runs: Record<string, string | number>;
  placement: { rules: string[] };
  intensity: string;
  fatLossChanges: string;
  stopRule: string;
  evidence: string;
}

export interface Food {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
}

export interface Feeding {
  id: string;
  name: string;
  kcalPct: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  timing?: string;
}

export interface MealExample {
  feedingId: string;
  items: { foodId: string; gramsExpr: string }[];
}

export interface Meals {
  dayTemplate: { note: string; feedings: Feeding[] };
  foodsPer100g: Food[];
  rawVersusCookedWarning: string;
  swapTables: Record<string, { food: string; grams: number }[]>;
  dayExamples: { note: string; trainingDay: MealExample[]; restDay: MealExample[] };
  highCalorieTactics: string[];
  eatingOut: { restaurant: string[]; christmas: string[]; carnival: string[] };
}

export interface Supplements {
  ranked: { name: string; dose: string; timing: string; evidence: string; note: string }[];
  doNotBuy: { name: string; reason: string }[];
  brazilChecklist: string[];
}

export interface Checkin {
  protocol: Record<string, string | string[]>;
  maintenanceEstimate: {
    formula: string;
    note: string;
    checkpoints: { id: string; dayFromStart: number; rule: string }[];
  };
  firstTwoWeeks: { creatineLoad: string; noLoad: string; rule: string };
  ignoreScaleWindows: {
    anchor: string;
    firstDay?: number;
    lastDay?: number;
    firstDaysBefore?: number;
    lastDaysBefore?: number;
    reason: string;
  }[];
  deficitLicence: { text: string; requires: string[]; branchBAlsoRequires: string };
  branchDecision: { text: string; reTape: { text: string }; exits: { text: string } };
  ruleOrder: string;
  rules: { id: string; ifLabel: string; then: string }[];
  badWeekOrder: string[];
  reviewTriggers: { if: string; then: string }[];
  neverChaseTheDate: string;
}

export interface TimelineItem {
  id: string;
  daysFromStart?: number;
  daysBeforeTarget?: number;
  category: string;
  title: string;
  detail: string;
  protocol?: string[];
}

export interface Macronotes {
  proteinGPerKg: { note: string };
  proteinGPerKgLeanMassHighBodyFat: { note: string };
  perMeal: { note: string };
  fibreG: { note: string };
  carbsRule: { rule: string; preTraining: string; hardRule: string };
  wheyLogging: string;
}

export interface TrainingPlan extends EngineConfig {
  macros: EngineConfig["macros"] & Macronotes;
  program: Program;
  cardio: Cardio;
  supplements: Supplements;
  meals: Meals;
  checkin: Checkin;
  timeline: TimelineItem[];
  levers: { rank: number; name: string; why: string }[];
  faq: { q: string; a: string; sourceUrl?: string }[];
}

export const plan = raw as unknown as TrainingPlan;
