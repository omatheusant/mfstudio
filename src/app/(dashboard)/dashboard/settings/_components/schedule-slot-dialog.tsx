"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import {
  createScheduleSlot,
  updateScheduleSlot,
  type ActionState,
} from "@/features/schedules/actions";
import type { ScheduleCategoryRow, ScheduleSlotRow } from "@/features/schedules/queries";
import { DAY_OF_WEEK_OPTIONS } from "@/lib/constants/schedule";
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

export function ScheduleSlotDialog({
  organizationId,
  categories,
  slot,
  defaultCapacity,
  trigger,
}: {
  organizationId: string;
  categories: ScheduleCategoryRow[];
  slot?: ScheduleSlotRow;
  defaultCapacity: number;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = slot
    ? updateScheduleSlot.bind(null, organizationId, slot.id)
    : createScheduleSlot.bind(null, organizationId);

  // See schedule-category-dialog.tsx for why this isn't a useEffect.
  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result?.success) {
        toast.success(slot ? "Horário atualizado." : "Horário criado.");
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
          <DialogTitle>{slot ? "Editar horário" : "Novo horário"}</DialogTitle>
          <DialogDescription>
            Horários se repetem semanalmente no dia escolhido, dentro da
            categoria selecionada.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="slot-day">Dia da semana</Label>
            <Select name="day_of_week" defaultValue={String(slot?.day_of_week ?? 1)}>
              <SelectTrigger id="slot-day" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OF_WEEK_OPTIONS.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="slot-start">Início</Label>
              <Input
                id="slot-start"
                name="start_time"
                type="time"
                defaultValue={slot?.start_time?.slice(0, 5)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slot-end">Fim</Label>
              <Input
                id="slot-end"
                name="end_time"
                type="time"
                defaultValue={slot?.end_time?.slice(0, 5)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="slot-category">Categoria</Label>
            <Select
              name="schedule_category_id"
              defaultValue={slot?.schedule_category_id}
            >
              <SelectTrigger id="slot-category" className="w-full">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categories.length === 0 ? (
              <p className="text-xs text-destructive">
                Crie uma categoria de horário antes de adicionar horários.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="slot-capacity">Capacidade</Label>
            <Input
              id="slot-capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={slot?.capacity ?? defaultCapacity}
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
            <Button type="submit" disabled={pending || categories.length === 0}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
