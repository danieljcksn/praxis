"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBodyProfile } from "@/lib/hooks/useBodyProfile";
import {
  computePlan,
  evalGrams,
  todayKey,
  type BodyProfile,
  type EngineConfig,
} from "@/lib/training-plan/engine";
import type { Food, Meals } from "@/lib/training-plan/plan";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function DailyMeals({
  defaultProfile,
  config,
  feedings,
  examples,
  foods,
}: {
  defaultProfile: BodyProfile | null;
  config: EngineConfig;
  feedings: Meals["dayTemplate"]["feedings"];
  examples: Pick<Meals["dayExamples"], "note" | "trainingDay" | "restDay">;
  foods: Pick<Food, "id" | "name">[];
}) {
  const { profile, ready } = useBodyProfile(defaultProfile);
  const [kind, setKind] = useState<"trainingDay" | "restDay">("trainingDay");
  const today = todayKey();
  const snapshot = useMemo(
    () => (profile ? computePlan(profile, config, today) : null),
    [profile, config, today],
  );
  const names = useMemo(() => new Map(foods.map((food) => [food.id, food.name])), [foods]);

  if (!ready) return <Skeleton className="h-96 rounded-lg" />;
  if (!snapshot) {
    return (
      <Card>
        <CardHeader
          eyebrow="Seu dia"
          tone="hevy"
          title="Preencha suas medidas para ver as porções"
          description="As gramas de cada refeição saem das suas metas diárias."
        />
        <Link href="/training/plan" className="mt-4 inline-block text-sm text-hevy underline underline-offset-2">
          Ir para o plano
        </Link>
      </Card>
    );
  }

  const { kcal, proteinG, carbsG, fatG } = snapshot.today;
  const vars = { proteinTargetG: proteinG, carbsTargetG: carbsG, fatTargetG: fatG };

  return (
    <Card>
      <CardHeader
        eyebrow="Seu dia"
        tone="hevy"
        title={`${kcal.toLocaleString("pt-BR")} kcal hoje`}
        description={examples.note}
      />
      <div role="group" aria-label="Tipo de dia" className="mt-4 inline-flex overflow-hidden rounded-md border border-border">
        {(
          [
            ["trainingDay", "Dia de treino"],
            ["restDay", "Dia de descanso"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={kind === id}
            onClick={() => setKind(id)}
            className={cn(
              "segment h-9 px-3.5 text-mini transition-colors duration-[130ms] ease-out",
              kind === id ? "bg-soft-strong text-text" : "text-sub hover:text-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {examples[kind].map((meal) => {
          const feeding = feedings.find((item) => item.id === meal.feedingId);
          return (
            <div key={meal.feedingId} className="rounded-md border border-border p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-text">{feeding?.name ?? meal.feedingId}</h3>
                {feeding && (
                  <span className="shrink-0 text-micro tabnum text-sub">
                    {Math.round((kcal * feeding.kcalPct) / 100)} kcal ·{" "}
                    {Math.round((proteinG * feeding.proteinPct) / 100)} g prot
                  </span>
                )}
              </div>
              {feeding?.timing && <p className="mt-0.5 text-micro text-sub">{feeding.timing}</p>}
              <ul className="mt-3 space-y-1.5 text-sm">
                {meal.items.map((item) => {
                  const grams = evalGrams(item.gramsExpr, vars);
                  if (grams == null || grams < 1) return null;
                  return (
                    <li key={item.foodId} className="flex justify-between gap-3">
                      <span className="min-w-0 text-sub-strong">{names.get(item.foodId) ?? item.foodId}</span>
                      <span className="shrink-0 tabnum text-hevy">{Math.round(grams / 5) * 5} g</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
