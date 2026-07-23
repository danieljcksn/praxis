import type { Metadata } from "next";
import { RepertoireScreen } from "@/components/repertoire/RepertoireScreen";

export const metadata: Metadata = { title: "Repertoire" };

export default function RepertoirePage() {
  return <RepertoireScreen />;
}
