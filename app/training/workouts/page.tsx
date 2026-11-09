import type { Metadata } from "next";
import { WorkoutsScreen } from "@/components/training-plan/WorkoutsScreen";
import { plan } from "@/lib/training-plan/plan";

export const metadata: Metadata = { title: "Treinos" };

export default function TrainingWorkoutsPage() {
  return <WorkoutsScreen program={plan.program} cardio={plan.cardio} />;
}
