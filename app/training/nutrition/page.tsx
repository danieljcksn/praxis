import type { Metadata } from "next";
import { FoodScreen } from "@/components/training-plan/FoodScreen";
import { defaultProfile } from "@/lib/training-plan/default-profile";
import { plan } from "@/lib/training-plan/plan";

export const metadata: Metadata = { title: "Comida" };

export default function TrainingNutritionPage() {
  return (
    <FoodScreen
      defaultProfile={defaultProfile()}
      config={{
        energy: plan.energy,
        macros: plan.macros,
        bodyFat: plan.bodyFat,
        branches: plan.branches,
      }}
      notes={plan.macros}
      eatingOut={plan.meals.eatingOut}
      supplements={plan.supplements}
      faq={plan.faq}
    />
  );
}
