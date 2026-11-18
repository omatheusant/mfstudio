"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { bookForSelf } from "@/features/bookings/actions";
import type { AvailableSlot } from "@/features/bookings/queries";
import { getOccupancyTone, OCCUPANCY_INDICATOR_CLASS, OCCUPANCY_TEXT_CLASS } from "@/lib/occupancy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AvailableSlots({
  organizationId,
  date,
  slots,
}: {
  organizationId: string;
  date: string;
  slots: AvailableSlot[];
}) {
  const [isPending, startTransition] = useTransition();

  function reserve(slotId: string) {
    startTransition(async () => {
      const result = await bookForSelf(organizationId, slotId, date);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Reserva confirmada!");
      }
    });
  }

  if (slots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum horário disponível nesta data.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Horário</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Vagas</TableHead>
          <TableHead className="text-right">Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {slots.map((slot) => {
          const isFull = slot.reserved >= slot.capacity;
          const canBook = slot.compatible && !isFull;
          const tone = getOccupancyTone(slot.reserved, slot.capacity);
          return (
            <TableRow key={slot.id} className={!slot.compatible ? "opacity-60" : undefined}>
              <TableCell className="font-medium">
                {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
              </TableCell>
              <TableCell className="text-muted-foreground">{slot.category_name}</TableCell>
              <TableCell>
                {isFull ? (
                  <Badge variant="destructive">Lotado</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(slot.reserved / slot.capacity) * 100}
                      className="w-16 sm:w-24"
                      indicatorClassName={OCCUPANCY_INDICATOR_CLASS[tone]}
                    />
                    <span className={`text-sm tabular-nums ${OCCUPANCY_TEXT_CLASS[tone]}`}>
                      {slot.capacity - slot.reserved} vaga{slot.capacity - slot.reserved === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                {!slot.compatible ? (
                  <span className="text-xs text-muted-foreground">Fora do seu plano</span>
                ) : (
                  <Button
                    size="sm"
                    disabled={!canBook || isPending}
                    onClick={() => reserve(slot.id)}
                  >
                    {isFull ? "Lotado" : "Reservar"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
