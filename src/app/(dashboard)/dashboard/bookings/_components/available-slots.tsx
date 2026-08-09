"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { bookForSelf } from "@/features/bookings/actions";
import type { AvailableSlot } from "@/features/bookings/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          return (
            <TableRow key={slot.id}>
              <TableCell className="font-medium">
                {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
              </TableCell>
              <TableCell className="text-muted-foreground">{slot.category_name}</TableCell>
              <TableCell>
                {isFull ? (
                  <Badge variant="secondary">Lotado</Badge>
                ) : (
                  <span className="text-sm tabular-nums">
                    {slot.capacity - slot.reserved} de {slot.capacity}
                  </span>
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
