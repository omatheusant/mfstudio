"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelBookingAction } from "@/features/bookings/actions";
import type { RosterEntry } from "@/features/bookings/queries";
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

const STATUS_LABEL: Record<string, string> = {
  RESERVED: "Reservado",
  COMPLETED: "Concluído",
  NO_SHOW: "Faltou",
};

export function RosterDialog({
  roster,
  trigger,
}: {
  roster: RosterEntry[];
  trigger: React.ReactElement;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function cancel(bookingId: string) {
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Reserva cancelada.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alunos reservados</DialogTitle>
          <DialogDescription>{roster.length} pessoa(s) nesta aula.</DialogDescription>
        </DialogHeader>
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma reserva ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roster.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span>{entry.student_name ?? "—"}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{STATUS_LABEL[entry.status] ?? entry.status}</Badge>
                  {entry.status === "RESERVED" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => cancel(entry.id)}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
