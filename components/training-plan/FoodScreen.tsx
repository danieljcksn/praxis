"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBodyProfile } from "@/lib/hooks/useBodyProfile";
import { computePlan, todayKey, type BodyProfile, type EngineConfig } from "@/lib/training-plan/engine";
import { CALABRESA_MAX_G, FOODS, buildDayMenu } from "@/lib/training-plan/meals";
import type { Macronotes, Meals, Supplements } from "@/lib/training-plan/plan";
import { MealList } from "./MealList";
import { Disclosure, IfThen, PageIntro, PlainList, SectionTitle } from "./ui";

export function FoodScreen({
  defaultProfile,
  config,
  notes,
  eatingOut,
  supplements,
  faq,
}: {
  defaultProfile: BodyProfile | null;
  config: EngineConfig;
  notes: Macronotes;
  eatingOut: Meals["eatingOut"];
  supplements: Supplements;
  faq: { q: string; a: string; sourceUrl?: string }[];
}) {
  const { profile, ready } = useBodyProfile(defaultProfile);
  const today = todayKey();
  const snapshot = useMemo(
    () => (profile ? computePlan(profile, config, today) : null),
    [profile, config, today],
  );

  if (!ready) return <div className="min-h-dvh" />;

  if (!snapshot) {
    return (
      <div lang="pt-BR">
        <PageIntro title="Seu cardápio aparece aqui." />
        <Link href="/training" className="mt-4 inline-block text-lead text-text underline underline-offset-4">
          Preencher meus números
        </Link>
      </div>
    );
  }

  const targets = snapshot.today;
  const menu = buildDayMenu(targets);

  return (
    <div lang="pt-BR" className="max-w-[44rem]">
      <PageIntro title="Comida">
        <p>
          Comida normal, todo dia igual. Treino ou descanso, o cardápio é o mesmo. Carne, arroz e macarrão são pesados crus.
        </p>
      </PageIntro>

      <section className="mt-10" aria-label="Cardápio de hoje">
        <SectionTitle
          title={`${targets.kcal.toLocaleString("pt-BR")} kcal hoje`}
          meta={`${targets.proteinG} g de proteína, ${targets.carbsG} g de carboidrato, ${targets.fatG} g de gordura`}
        />
        <MealList meals={menu} />
        <p className="mt-4 text-base leading-[1.6] text-sub">
          Troque bife, frango e carne moída à vontade, no mesmo peso. A calabresa fica em até {CALABRESA_MAX_G} g por dia:
          ela é embutido, e acima disso a gordura passa do alvo. Marcas variam muito, então confira o rótulo.
        </p>
      </section>

      <section className="mt-14" aria-label="Suplementos">
        <SectionTitle title="Suplementos" />
        <ul className="border-t border-border">
          {supplements.ranked.slice(0, 3).map((item) => (
            <li key={item.name} className="border-b border-border py-3.5">
              <p className="text-title text-text">{item.name}</p>
              <p className="mt-1 text-base leading-[1.55] text-sub-strong">{item.dose}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <SectionTitle title="Quando precisar" />
        <div className="border-t border-border">
          <Disclosure title="Se não conseguir comer tudo">
            <PlainList
              items={[
                "Corte o volume antes das calorias: menos feijão, mais arroz ou macarrão.",
                "Não pule refeição. Se pular, leve a proteína para as próximas.",
                "Bata o whey com banana quando a fome não vier.",
              ]}
            />
          </Disclosure>
          <Disclosure title="Proteína, carboidrato e gordura">
            <PlainList
              items={[
                notes.proteinGPerKg.note,
                notes.perMeal.note,
                notes.carbsRule.rule,
                notes.carbsRule.preTraining,
                notes.carbsRule.hardRule,
                notes.fibreG.note,
                notes.wheyLogging,
              ]}
            />
          </Disclosure>
          <Disclosure title="Restaurante">
            <PlainList items={eatingOut.restaurant} />
          </Disclosure>
          <Disclosure title="Natal e Ano-Novo">
            <PlainList items={eatingOut.christmas} />
          </Disclosure>
          <Disclosure title="Carnaval">
            <PlainList items={eatingOut.carnival} />
          </Disclosure>
          <Disclosure title="Como escolher whey e creatina">
            <PlainList items={supplements.brazilChecklist} />
          </Disclosure>
          <Disclosure title="O que não comprar">
            <IfThen items={supplements.doNotBuy.map((item) => ({ condition: item.name, result: item.reason }))} />
          </Disclosure>
          <Disclosure title="Tabela dos seus alimentos">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-base">
                <thead className="text-sub">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-normal">Por 100 g</th>
                    <th scope="col" className="px-2 py-2 text-right font-normal">kcal</th>
                    <th scope="col" className="px-2 py-2 text-right font-normal">Prot.</th>
                    <th scope="col" className="px-2 py-2 text-right font-normal">Carb.</th>
                    <th scope="col" className="pl-2 py-2 text-right font-normal">Gord.</th>
                  </tr>
                </thead>
                <tbody className="tabnum">
                  {Object.values(FOODS).map((food) => (
                    <tr key={food.name} className="border-t border-border">
                      <td className="py-2 pr-4 text-text">{food.name}</td>
                      <td className="px-2 py-2 text-right">{food.kcal}</td>
                      <td className="px-2 py-2 text-right">{food.protein}</td>
                      <td className="px-2 py-2 text-right">{food.carbs}</td>
                      <td className="pl-2 py-2 text-right">{food.fat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Disclosure>
          <Disclosure title="Perguntas e mitos">
            <ul className="space-y-4">
              {faq.map((item) => (
                <li key={item.q}>
                  <p className="text-text">{item.q}</p>
                  <p className="mt-0.5">{item.a}</p>
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>
      </section>
    </div>
  );
}
