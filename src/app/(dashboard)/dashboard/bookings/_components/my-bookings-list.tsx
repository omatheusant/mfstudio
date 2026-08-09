"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { cancelBookingAction } from "@/features/bookings/actions";
import type { UpcomingBooking } from "@/features/bookings/queries";
import { Button } from "@/components/ui/button";

export function MyBookingsList({ bookings }: { bookings: UpcomingBooking[] }) {
  const [isPending, startTransition] = useTransition();

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

  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">Você não tem reservas futuras.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {bookings.map((booking) => (
        <li
          key={booking.id}
          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">
              {new Date(`${booking.date}T12:00:00Z`).toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              })}{" "}
              · {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}
            </p>
            <p className="text-muted-foreground">{booking.category_name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => cancel(booking.id)}
          >
            Cancelar
          </Button>
        </li>
      ))}
    </ul>
  );
}
