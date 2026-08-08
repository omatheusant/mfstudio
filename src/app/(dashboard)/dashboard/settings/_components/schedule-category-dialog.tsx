"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import {
  createScheduleCategory,
  updateScheduleCategory,
  type ActionState,
} from "@/features/schedules/actions";
import type { ScheduleCategoryRow } from "@/features/schedules/queries";
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
import { Textarea } from "@/components/ui/textarea";

export function ScheduleCategoryDialog({
  organizationId,
  category,
  trigger,
}: {
  organizationId: string;
  category?: ScheduleCategoryRow;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = category
    ? updateScheduleCategory.bind(null, organizationId, category.id)
    : createScheduleCategory.bind(null, organizationId);

  // Close the dialog and toast as a direct consequence of the action
  // finishing — inside the transition itself, not via a useEffect watching
  // `state` (which would run one extra render behind and re-fire on every
  // dependency change instead of exactly once per submit).
  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result?.success) {
        toast.success(category ? "Categoria atualizada." : "Categoria criada.");
        setOpen(false);
      }
      return result;
    },
    undefined as ActionState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Editar categoria" : "Nova categoria de horário"}
          </DialogTitle>
          <DialogDescription>
            Categorias agrupam horários (ex.: Premium/Alternativo) e são
            usadas para definir quais horários cada plano permite.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              name="name"
              defaultValue={category?.name}
              placeholder="Premium"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-description">Descrição (opcional)</Label>
            <Textarea
              id="category-description"
              name="description"
              defaultValue={category?.description ?? ""}
              rows={2}
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
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
