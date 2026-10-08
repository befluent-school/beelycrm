import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { HAS_GOOGLE_LOGIN, IS_DEMO } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return <LoginForm showGoogle={IS_DEMO || HAS_GOOGLE_LOGIN} />;
}
