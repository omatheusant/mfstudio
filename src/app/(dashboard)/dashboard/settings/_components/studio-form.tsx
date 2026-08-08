"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { updateOrganization } from "@/features/organizations/actions";
import { TIMEZONE_OPTIONS } from "@/lib/constants/timezones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrganizationRow } from "@/features/organizations/queries";

export function StudioForm({ organization }: { organization: OrganizationRow }) {
  const action = updateOrganization.bind(null, organization.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) toast.success("Dados do Studio atualizados.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome do Studio</Label>
        <Input id="name" name="name" defaultValue={organization.name} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={organization.phone ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={organization.email ?? ""}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Endereço</Label>
        <Input id="address" name="address" defaultValue={organization.address ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Fuso horário</Label>
        <Select name="timezone" defaultValue={organization.timezone}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue placeholder="Selecione o fuso horário" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONE_OPTIONS.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Usado para interpretar horários, reservas e vencimentos deste Studio.
        </p>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
