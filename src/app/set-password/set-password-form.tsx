"use client";

import { useActionState } from "react";

import { setPassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Defina sua senha</CardTitle>
        <CardDescription>
          Você foi convidado para um Studio na ELEVO FIT. Escolha uma senha
          para acessar sua conta nas próximas vezes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Salvar e continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
