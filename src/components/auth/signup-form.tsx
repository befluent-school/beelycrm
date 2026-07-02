"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";
import { AuthMessage } from "./auth-message";
import { TRIAL_DAYS } from "@/lib/site";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, undefined);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Criar conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comece grátis por {TRIAL_DAYS} dias — sem cartão
        </p>
      </div>

      <GoogleButton />
      <Divider />

      <form action={action} className="space-y-4">
        <AuthMessage state={state} />
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" name="name" placeholder="Seu nome" autoComplete="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" placeholder="voce@empresa.com" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Criando..." : "Criar conta grátis"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
      <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
    </div>
  );
}
