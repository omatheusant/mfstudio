"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { updateOrganizationSettings } from "@/features/organizations/actions";
import type { OrganizationSettingsRow } from "@/features/organizations/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function AgendaFinanceiroForm({
  organizationId,
  settings,
}: {
  organizationId: string;
  settings: OrganizationSettingsRow;
}) {
  const action = updateOrganizationSettings.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) toast.success("Configurações atualizadas.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="default_capacity">Capacidade padrão por horário</Label>
        <Input
          id="default_capacity"
          name="default_capacity"
          type="number"
          min={1}
          defaultValue={settings.default_capacity}
          required
        />
        <p className="text-xs text-muted-foreground">
          Sugerida ao criar um novo horário — cada horário pode ter sua
          própria capacidade.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cancellation_window_minutes">
          Janela de cancelamento (minutos)
        </Label>
        <Input
          id="cancellation_window_minutes"
          name="cancellation_window_minutes"
          type="number"
          min={0}
          defaultValue={settings.cancellation_window_minutes}
          required
        />
        <p className="text-xs text-muted-foreground">
          Cancelamentos feitos com menos antecedência que isso contam como
          sessão utilizada.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkin_open_minutes_before">
            Check-in abre (min. antes)
          </Label>
          <Input
            id="checkin_open_minutes_before"
            name="checkin_open_minutes_before"
            type="number"
            min={0}
            defaultValue={settings.checkin_open_minutes_before}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkin_close_minutes_after">
            Check-in fecha (min. depois)
          </Label>
          <Input
            id="checkin_close_minutes_after"
            name="checkin_close_minutes_after"
            type="number"
            min={0}
            defaultValue={settings.checkin_close_minutes_after}
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="block_booking_when_overdue">
            Bloquear reservas de alunos inadimplentes
          </Label>
          <p className="text-xs text-muted-foreground">
            Quando ativo, alunos com pagamento em atraso não conseguem
            fazer novas reservas.
          </p>
        </div>
        <Switch
          id="block_booking_when_overdue"
          name="block_booking_when_overdue"
          defaultChecked={settings.block_booking_when_overdue}
        />
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
