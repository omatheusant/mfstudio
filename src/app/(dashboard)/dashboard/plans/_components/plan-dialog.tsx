"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { createPlan, updatePlan, type ActionState } from "@/features/plans/actions";
import type { PlanWithCategories } from "@/features/plans/queries";
import {
  BILLING_CYCLE_OPTIONS,
  SESSION_PERIOD_OPTIONS,
} from "@/lib/constants/plans";
import type { ScheduleCategoryRow } from "@/features/schedules/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function PlanDialog({
  organizationId,
  categories,
  plan,
  trigger,
}: {
  organizationId: string;
  categories: ScheduleCategoryRow[];
  plan?: PlanWithCategories;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const selectedCategoryIds = new Set(
    plan?.plan_schedule_categories
      .map((pc) => pc.schedule_category?.id)
      .filter((id): id is string => Boolean(id)),
  );

  const boundAction = plan
    ? updatePlan.bind(null, organizationId, plan.id)
    : createPlan.bind(null, organizationId);

  // See settings/_components/schedule-category-dialog.tsx for why this
  // isn't a useEffect watching `state`.
  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result?.success) {
        toast.success(plan ? "Plano atualizado." : "Plano criado.");
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
          <DialogTitle>{plan ? "Editar plano" : "Novo plano"}</DialogTitle>
          <DialogDescription>
            Preço, ciclo e limite de sessões definem o plano — nada disso é
            fixo no sistema.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-name">Nome</Label>
            <Input id="plan-name" name="name" defaultValue={plan?.name} placeholder="Ouro" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-description">Descrição (opcional)</Label>
            <Textarea
              id="plan-description"
              name="description"
              defaultValue={plan?.description ?? ""}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-price">Preço (R$)</Label>
              <Input
                id="plan-price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={plan?.price}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-billing-cycle">Ciclo de cobrança</Label>
              <Select
                name="billing_cycle"
                defaultValue={plan?.billing_cycle ?? "MONTHLY"}
                items={BILLING_CYCLE_OPTIONS}
              >
                <SelectTrigger id="plan-billing-cycle" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-session-limit">Sessões</Label>
              <Input
                id="plan-session-limit"
                name="session_limit"
                type="number"
                min={1}
                defaultValue={plan?.session_limit}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-session-period">Período</Label>
              <Select
                name="session_period"
                defaultValue={plan?.session_period ?? "WEEK"}
                items={SESSION_PERIOD_OPTIONS}
              >
                <SelectTrigger id="plan-session-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Categorias de horário permitidas</Label>
            {categories.length === 0 ? (
              <p className="text-xs text-destructive">
                Crie uma categoria de horário em Configurações antes de
                criar planos.
              </p>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 text-sm font-normal"
                  >
                    <Checkbox
                      name="schedule_category_ids"
                      value={category.id}
                      defaultChecked={selectedCategoryIds.has(category.id)}
                    />
                    {category.name}
                    {!category.active ? (
                      <span className="text-xs text-muted-foreground">(inativa)</span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
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
            <Button type="submit" disabled={pending || categories.length === 0}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
