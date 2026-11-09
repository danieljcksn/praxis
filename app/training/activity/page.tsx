import type { Metadata } from "next";
import { TrainingScreen } from "@/components/training/TrainingScreen";

export const metadata: Metadata = { title: "Atividade" };

export default function TrainingActivityPage() {
  return <TrainingScreen />;
}
