import type { Metadata } from "next";
import { GitHubScreen } from "@/components/github/GitHubScreen";

export const metadata: Metadata = { title: "GitHub activity" };

export default function GitHubPage() {
  return <GitHubScreen />;
}
