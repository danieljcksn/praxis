import type { Metadata } from "next";
import { PlanScreen } from "@/components/training-plan/PlanScreen";
import { defaultProfile } from "@/lib/training-plan/default-profile";
import { plan } from "@/lib/training-plan/plan";

export const metadata: Metadata = { title: "Plano" };

export default function TrainingPlanPage() {
  return (
    <PlanScreen
      defaultProfile={defaultProfile()}
      config={{
        energy: plan.energy,
        macros: plan.macros,
        bodyFat: plan.bodyFat,
        branches: plan.branches,
      }}
      checkin={plan.checkin}
      timeline={plan.timeline}
      levers={plan.levers}
    />
  );
}
