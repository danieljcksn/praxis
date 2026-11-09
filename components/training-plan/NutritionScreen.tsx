import type { TrainingPlan } from "@/lib/training-plan/plan";
import { PageHeader, SectionHeading } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { DailyMeals } from "./DailyMeals";
import { BulletList, Labeled, TextCard } from "./parts";

const SWAP_TITLES: Record<string, string> = {
  protein40g: "40 g de proteína",
  carbs100g: "100 g de carboidrato",
  fat20g: "20 g de gordura",
};

export function NutritionScreen({ plan }: { plan: TrainingPlan }) {
  const { macros, meals, supplements, faq } = plan;
  const config = {
    energy: plan.energy,
    macros: plan.macros,
    bodyFat: plan.bodyFat,
    branches: plan.branches,
  };

  return (
    <div lang="pt-BR">
      <PageHeader
        eyebrow="Físico"
        tone="hevy"
        title="Nutrição"
        subtitle="Quanto comer, o que comer e o que comprar"
      />

      <DailyMeals
        config={config}
        feedings={meals.dayTemplate.feedings}
        examples={meals.dayExamples}
        foods={meals.foodsPer100g.map(({ id, name }) => ({ id, name }))}
      />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <TextCard eyebrow="Macros" title="As regras">
          <div className="space-y-4">
            <Labeled label="Proteína">
              {macros.proteinGPerKg.note} {macros.proteinGPerKgLeanMassHighBodyFat.note}
            </Labeled>
            <Labeled label="Distribuição">{macros.perMeal.note}</Labeled>
            <Labeled label="Carboidrato">
              {macros.carbsRule.rule} {macros.carbsRule.preTraining} {macros.carbsRule.hardRule}
            </Labeled>
            <Labeled label="Fibra">{macros.fibreG.note}</Labeled>
            <Labeled label="Whey">{macros.wheyLogging}</Labeled>
          </div>
        </TextCard>

        <div className="grid gap-4">
          <TextCard eyebrow="Apetite" title="Como comer tudo isso">
            <BulletList items={meals.highCalorieTactics} />
          </TextCard>
          <TextCard eyebrow="Fora de casa" title="Restaurante e festas">
            <div className="space-y-4">
              <Labeled label="Restaurante">
                <BulletList items={meals.eatingOut.restaurant} />
              </Labeled>
              <Labeled label="Natal e Ano-Novo">
                <BulletList items={meals.eatingOut.christmas} />
              </Labeled>
              <Labeled label="Carnaval">
                <BulletList items={meals.eatingOut.carnival} />
              </Labeled>
            </div>
          </TextCard>
        </div>
      </div>

      <SectionHeading className="mt-8" eyebrow="Trocas" tone="hevy" title="Equivalências" subtitle={meals.rawVersusCookedWarning} />
      <div className="grid items-start gap-4 md:grid-cols-3">
        {Object.entries(meals.swapTables).map(([key, rows]) => (
          <Card key={key}>
            <h3 className="text-title text-text">{SWAP_TITLES[key] ?? key}</h3>
            <ul className="mt-3 divide-y divide-border text-sm">
              {rows.map((row) => (
                <li key={row.food} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 text-sub-strong">{row.food}</span>
                  <span className="shrink-0 tabnum text-hevy">{row.grams} g</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader eyebrow="Tabela" tone="hevy" title="Alimentos por 100 g" />
        <div className="mt-4 max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-mini">
            <thead className="sticky top-0 bg-panel text-sub">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Alimento</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">kcal</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Prot</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Carb</th>
                <th scope="col" className="pl-2 py-2 text-right font-medium">Gord</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabnum text-sub-strong">
              {meals.foodsPer100g.map((food) => (
                <tr key={food.id}>
                  <td className="py-2 pr-3 text-text">{food.name}</td>
                  <td className="px-2 py-2 text-right">{food.kcal}</td>
                  <td className="px-2 py-2 text-right">{food.protein}</td>
                  <td className="px-2 py-2 text-right">{food.carbs}</td>
                  <td className="pl-2 py-2 text-right">{food.fat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SectionHeading className="mt-8" eyebrow="Suplementos" tone="hevy" title="O que comprar" />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {supplements.ranked.map((item, index) => (
          <Card key={item.name}>
            <h3 className="text-title text-text">
              <span className="tabnum text-hevy">{index + 1}. </span>
              {item.name}
            </h3>
            <div className="mt-3 space-y-3">
              <Labeled label="Dose">{item.dose}</Labeled>
              <Labeled label="Quando">{item.timing}</Labeled>
              <Labeled label="Evidência">{item.evidence}</Labeled>
              <Labeled label="Atenção">{item.note}</Labeled>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <TextCard eyebrow="Não compre" title="Dinheiro jogado fora, ou pior">
          <ul className="space-y-3 text-sm">
            {supplements.doNotBuy.map((item) => (
              <li key={item.name}>
                <p className="text-text">{item.name}</p>
                <p className="mt-0.5 text-sub-strong">{item.reason}</p>
              </li>
            ))}
          </ul>
        </TextCard>
        <TextCard eyebrow="Brasil" title="Como escolher marca e lote">
          <BulletList items={supplements.brazilChecklist} />
        </TextCard>
      </div>

      <SectionHeading className="mt-8" eyebrow="Dúvidas" tone="hevy" title="Perguntas e mitos" />
      <Card padded={false} className="divide-y divide-border">
        {faq.map((item) => (
          <details key={item.q} className="group px-5 py-3.5 sm:px-6">
            <summary className="cursor-pointer text-sm text-text">{item.q}</summary>
            <p className="mt-2 text-sm text-sub-strong">
              {item.a}
              {item.sourceUrl && /^https?:\/\//.test(item.sourceUrl) && (
                <>
                  {" "}
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-hevy underline underline-offset-2">
                    Fonte
                  </a>
                </>
              )}
            </p>
          </details>
        ))}
      </Card>
    </div>
  );
}
