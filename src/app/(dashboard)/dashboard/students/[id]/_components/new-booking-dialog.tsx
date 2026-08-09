"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { bookForStudent, fetchAvailableSlotsForStudent } from "@/features/bookings/actions";
import type { AvailableSlot } from "@/features/bookings/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function NewBookingDialog({
  organizationId,
  studentId,
  trigger,
}: {
  organizationId: string;
  studentId: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isBooking, startBooking] = useTransition();

  function loadSlots(nextDate: string) {
    setDate(nextDate);
    startLoading(async () => {
      const result = await fetchAvailableSlotsForStudent(organizationId, studentId, nextDate);
      setSlots(result.hasActivePlan ? result.slots : []);
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && slots === null) {
      loadSlots(date);
    }
  }

  function reserve(scheduleSlotId: string) {
    startBooking(async () => {
      const result = await bookForStudent(organizationId, studentId, scheduleSlotId, date);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Reserva criada.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova reserva</DialogTitle>
          <DialogDescription>
            Apenas horários compatíveis com o plano ativo do aluno podem
            ser reservados.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="booking-date">Data</Label>
            <Input
              id="booking-date"
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => loadSlots(e.target.value)}
            />
          </div>

          {isLoading || slots === null ? (
            <p className="text-sm text-muted-foreground">Carregando horários...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum horário ativo nesta data.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {slots.map((slot) => {
                const isFull = slot.reserved >= slot.capacity;
                const canBook = slot.compatible && !isFull;
                return (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                      </p>
                      <p className="text-muted-foreground">{slot.category_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!slot.compatible ? (
                        <Badge variant="secondary">Fora do plano</Badge>
                      ) : isFull ? (
                        <Badge variant="secondary">Lotado</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {slot.capacity - slot.reserved} vaga(s)
                        </span>
                      )}
                      <Button
                        size="sm"
                        disabled={!canBook || isBooking}
                        onClick={() => reserve(slot.id)}
                      >
                        Reservar
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
