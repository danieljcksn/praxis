import type { Metadata } from "next";
import { TimerScreen } from "@/components/timer/TimerScreen";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  return <TimerScreen />;
}
