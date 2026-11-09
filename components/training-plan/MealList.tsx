import type { Meal } from "@/lib/training-plan/meals";

export function MealList({ meals }: { meals: Meal[] }) {
  return (
    <div className="border-t border-border">
      {meals.map((meal) => (
        <div key={meal.id} className="border-b border-border py-3.5">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-title text-text">{meal.name}</h3>
            <p className="shrink-0 text-sm tabnum text-sub">
              {meal.kcal} kcal, {meal.proteinG} g de proteína
            </p>
          </div>
          {meal.timing && <p className="mt-0.5 text-sm text-sub">{meal.timing}</p>}
          <ul className="mt-2 space-y-1">
            {meal.items.map((item) => (
              <li key={item.food} className="flex items-baseline justify-between gap-4 text-lead">
                <span className="min-w-0 text-sub-strong">{item.food}</span>
                <span className="shrink-0 tabnum text-text">{item.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
