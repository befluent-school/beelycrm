import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { HAS_GOOGLE_LOGIN, IS_DEMO } from "@/lib/env";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return <SignupForm showGoogle={IS_DEMO || HAS_GOOGLE_LOGIN} />;
}
