"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { updateOwnProfile, type ActionState } from "@/features/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  fullName,
  email,
  phone,
}: {
  fullName: string | null;
  email: string | null | undefined;
  phone: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await updateOwnProfile(prevState, formData);
      if (result?.success) toast.success("Perfil atualizado.");
      return result;
    },
    undefined as ActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName ?? ""} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" value={email ?? ""} disabled />
        <p className="text-xs text-muted-foreground">
          O e-mail é usado para entrar na plataforma e não pode ser alterado aqui.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={phone ?? ""} />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
