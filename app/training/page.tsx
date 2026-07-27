import type { Metadata } from "next";
import { TrainingScreen } from "@/components/training/TrainingScreen";

export const metadata: Metadata = { title: "Training" };

export default function TrainingPage() {
  return <TrainingScreen />;
}
