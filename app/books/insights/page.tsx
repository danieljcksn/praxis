import type { Metadata } from "next";
import { InsightsScreen } from "@/components/books/InsightsScreen";

export const metadata: Metadata = { title: "Reading insights" };

export default function BookInsightsPage() {
  return <InsightsScreen />;
}
