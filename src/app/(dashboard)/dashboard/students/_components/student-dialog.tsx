"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { createStudent, type ActionState } from "@/features/students/actions";
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
import { Textarea } from "@/components/ui/textarea";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function StudentDialog({
  organizationId,
  plans,
  trigger,
}: {
  organizationId: string;
  plans: PlanRow[];
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = createStudent.bind(null, organizationId);

  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result?.success) {
        toast.success(
          "Aluno cadastrado. Envie o e-mail e a senha a ele para o primeiro acesso.",
        );
        setOpen(false);
      }
      return result;
    },
    undefined as ActionState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo aluno</DialogTitle>
          <DialogDescription>
            Defina um e-mail e uma senha para o aluno. Nenhum e-mail é
            enviado — você mesmo deve passar esses dados a ele para o
            primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="student-name">Nome completo</Label>
            <Input id="student-name" name="full_name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-email">E-mail</Label>
              <Input id="student-email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-phone">Telefone</Label>
              <Input id="student-phone" name="phone" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="student-password">Senha</Label>
            <Input
              id="student-password"
              name="password"
              type="text"
              minLength={8}
              placeholder="Mínimo de 8 caracteres"
              required
            />
            <p className="text-xs text-muted-foreground">
              Anote essa senha — você vai precisar enviá-la ao aluno
              junto com o e-mail.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-plan">Plano</Label>
              <Select
                name="plan_id"
                items={plans.map((plan) => ({
                  value: plan.id,
                  label: `${plan.name} — ${formatCurrency(plan.price)}`,
                }))}
              >
                <SelectTrigger id="student-plan" className="w-full">
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
              {plans.length === 0 ? (
                <p className="text-xs text-destructive">
                  Crie um plano antes de cadastrar alunos.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-start-date">Início</Label>
              <Input
                id="student-start-date"
                name="start_date"
                type="date"
                defaultValue={todayISO()}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="student-notes">Observações (opcional)</Label>
            <Textarea id="student-notes" name="notes" rows={2} />
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
            <Button type="submit" disabled={pending || plans.length === 0}>
              {pending ? "Cadastrando..." : "Cadastrar aluno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
