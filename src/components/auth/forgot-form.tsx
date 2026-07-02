"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthMessage } from "./auth-message";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviaremos uma senha temporária para o seu e-mail
        </p>
      </div>

      <form action={action} className="space-y-4">
        <AuthMessage state={state} />
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail da conta</Label>
          <Input id="email" name="email" type="email" placeholder="voce@empresa.com" autoComplete="email" required />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Enviando..." : "Enviar senha temporária"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
