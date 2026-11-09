import { ChevronDown } from "lucide-react";
import type { ResolvedExercise } from "@/lib/training-plan/today";

export function PageIntro({
  kicker,
  title,
  children,
}: {
  kicker?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="max-w-[40rem]">
      {kicker && <p className="text-sm text-sub">{kicker}</p>}
      <h1 className="mt-2 text-display font-semibold text-text">{title}</h1>
      {children && <div className="mt-3 text-title font-normal leading-[1.5] text-sub-strong">{children}</div>}
    </header>
  );
}

export function SectionTitle({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-title-lg font-semibold text-text">{title}</h2>
      {meta && <p className="mt-1 text-base text-sub">{meta}</p>}
    </div>
  );
}

export function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lead text-text [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-sub transition-transform duration-[190ms] ease-out group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="max-w-[40rem] pb-7 text-base leading-[1.65] text-sub-strong">{children}</div>
    </details>
  );
}

export function PlainList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function IfThen({ items }: { items: { condition: string; result: string }[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.condition}>
          <p className="text-text">{item.condition}</p>
          <p className="mt-0.5">{item.result}</p>
        </li>
      ))}
    </ul>
  );
}

export function KeyValueList({ rows }: { rows: { key: string; label: string; value: React.ReactNode }[] }) {
  return (
    <ul className="border-t border-border">
      {rows.map((row) => (
        <li key={row.key} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5">
          <span className="min-w-0">{row.label}</span>
          <span className="shrink-0 tabnum text-text">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExerciseList({ exercises }: { exercises: ResolvedExercise[] }) {
  return (
    <ul className="border-t border-border">
      {exercises.map((exercise) => (
        <li key={exercise.key} className="border-b border-border">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block text-title text-text">{exercise.name}</span>
                <span className="mt-1 block text-sm text-sub">
                  {exercise.effort}. Descanso de {exercise.rest}.
                </span>
              </span>
              <span className="shrink-0 text-title tabnum text-text">
                {exercise.sets} × {exercise.reps}
              </span>
            </summary>
            <div className="max-w-[34rem] space-y-1.5 pb-4 text-base leading-[1.6] text-sub-strong">
              {exercise.cue && <p>{exercise.cue}</p>}
              {exercise.swap && <p className="text-sub">Se estiver ocupado: {exercise.swap}</p>}
              <p className="text-sub">No Hevy: {exercise.hevyName}</p>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
