import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";

export const metadata: Metadata = { title: "Unlock" };

export default function LoginPage() {
  return <LoginScreen />;
}
