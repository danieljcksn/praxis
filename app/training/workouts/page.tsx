import type { Metadata } from "next";
import { WorkoutsScreen } from "@/components/training-plan/WorkoutsScreen";
import { defaultProfile } from "@/lib/training-plan/default-profile";
import { plan } from "@/lib/training-plan/plan";

export const metadata: Metadata = { title: "Treinos" };

export default function TrainingWorkoutsPage() {
  return (
    <WorkoutsScreen
      defaultProfile={defaultProfile()}
      config={{
        energy: plan.energy,
        macros: plan.macros,
        bodyFat: plan.bodyFat,
        branches: plan.branches,
      }}
      program={plan.program}
      cardio={plan.cardio}
    />
  );
}
