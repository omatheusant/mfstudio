"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteScheduleSlot, setScheduleSlotActive } from "@/features/schedules/actions";
import type { ScheduleCategoryRow, ScheduleSlotRow } from "@/features/schedules/queries";
import { DAY_OF_WEEK_LABEL } from "@/lib/constants/schedule";
import type { DayOfWeek } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ScheduleSlotDialog } from "./schedule-slot-dialog";

export function ScheduleSlotsPanel({
  organizationId,
  slots,
  categories,
  defaultCapacity,
}: {
  organizationId: string;
  slots: ScheduleSlotRow[];
  categories: ScheduleCategoryRow[];
  defaultCapacity: number;
}) {
  const [isPending, startTransition] = useTransition();

  function toggleActive(slot: ScheduleSlotRow, active: boolean) {
    startTransition(async () => {
      try {
        await setScheduleSlotActive(organizationId, slot.id, active);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar.");
      }
    });
  }

  function remove(slot: ScheduleSlotRow) {
    startTransition(async () => {
      try {
        await deleteScheduleSlot(organizationId, slot.id);
        toast.success("Horário removido.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao remover.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Horários</CardTitle>
          <CardDescription>
            Horários recorrentes semanais. A capacidade é definida por
            horário — não existe um valor fixo para todos.
          </CardDescription>
        </div>
        <ScheduleSlotDialog
          organizationId={organizationId}
          categories={categories}
          defaultCapacity={defaultCapacity}
          trigger={
            <Button size="sm" disabled={categories.length === 0}>
              <Plus className="size-4" />
              Novo horário
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Crie uma categoria de horário antes de cadastrar horários.
          </p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum horário cadastrado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dia</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell className="font-medium">
                    {DAY_OF_WEEK_LABEL[slot.day_of_week as DayOfWeek]}
                  </TableCell>
                  <TableCell>
                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {slot.schedule_category?.name ?? "—"}
                  </TableCell>
                  <TableCell>{slot.capacity}</TableCell>
                  <TableCell>
                    <Switch
                      checked={slot.active}
                      disabled={isPending}
                      onCheckedChange={(checked) => toggleActive(slot, checked)}
                    />
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <ScheduleSlotDialog
                      organizationId={organizationId}
                      categories={categories}
                      defaultCapacity={defaultCapacity}
                      slot={slot}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => remove(slot)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
