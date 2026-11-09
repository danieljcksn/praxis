import type { Metadata } from "next";
import { TodayScreen } from "@/components/training-plan/TodayScreen";
import { defaultProfile } from "@/lib/training-plan/default-profile";
import { plan } from "@/lib/training-plan/plan";

export const metadata: Metadata = { title: "Hoje" };

export default function TrainingPage() {
  return (
    <TodayScreen
      defaultProfile={defaultProfile()}
      config={{
        energy: plan.energy,
        macros: plan.macros,
        bodyFat: plan.bodyFat,
        branches: plan.branches,
      }}
      program={plan.program}
      cardio={plan.cardio}
      checkin={plan.checkin}
      timeline={plan.timeline}
      levers={plan.levers}
    />
  );
}
