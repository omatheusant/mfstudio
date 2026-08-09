"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { changeStudentPlan, type ActionState } from "@/features/students/actions";
import type { PlanRow } from "@/features/plans/queries";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ChangePlanDialog({
  organizationId,
  studentId,
  plans,
  hasActiveSubscription,
  trigger,
}: {
  organizationId: string;
  studentId: string;
  plans: PlanRow[];
  hasActiveSubscription: boolean;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = changeStudentPlan.bind(null, organizationId, studentId);

  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result?.success) {
        toast.success("Plano atualizado.");
        setOpen(false);
      }
      return result;
    },
    undefined as ActionState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{hasActiveSubscription ? "Trocar plano" : "Vincular plano"}</DialogTitle>
          <DialogDescription>
            {hasActiveSubscription
              ? "O plano atual será encerrado e um novo será iniciado na data escolhida."
              : "Escolha o plano deste aluno."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="change-plan-id">Plano</Label>
            <Select name="plan_id">
              <SelectTrigger id="change-plan-id" className="w-full">
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} — {formatCurrency(plan.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="change-plan-start">Início</Label>
            <Input
              id="change-plan-start"
              name="start_date"
              type="date"
              defaultValue={todayISO()}
              required
            />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
