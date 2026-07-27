import type { Metadata } from "next";
import { HabitsScreen } from "@/components/habits/HabitsScreen";

export const metadata: Metadata = { title: "Habits" };

export default function HabitsPage() {
  return <HabitsScreen />;
}
