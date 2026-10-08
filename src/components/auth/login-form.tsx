"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";
import { AuthMessage } from "./auth-message";

export function LoginForm({ showGoogle }: { showGoogle: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [showEmail, setShowEmail] = useState(!showGoogle);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Acessar o Beely</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {showGoogle ? "Entre com sua Conta Google para continuar" : "Entre com seu e-mail e senha"}
        </p>
      </div>

      {showGoogle && <GoogleButton />}

      {showGoogle && !showEmail ? (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="mx-auto block text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Entrar com e-mail e senha
        </button>
      ) : (
        <>
          {showGoogle && <Divider />}
          <form action={action} className="space-y-4">
            <AuthMessage state={state} />
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="voce@empresa.com" autoComplete="email" required />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </>
      )}
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
