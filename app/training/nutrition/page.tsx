import type { Metadata } from "next";
import { NutritionScreen } from "@/components/training-plan/NutritionScreen";
import { plan } from "@/lib/training-plan/plan";

export const metadata: Metadata = { title: "Nutrição" };

export default function TrainingNutritionPage() {
  return <NutritionScreen plan={plan} />;
}
