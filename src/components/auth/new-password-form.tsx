"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthMessage } from "./auth-message";

export function NewPasswordForm({ resetToken }: { resetToken?: string }) {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Defina sua nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha uma senha nova para sua conta Beely
        </p>
      </div>

      <form action={action} className="space-y-4">
        <AuthMessage state={state} />
        {resetToken && <input type="hidden" name="token" value={resetToken} />}
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirme a nova senha</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
