"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { cancelBookingAction } from "@/features/bookings/actions";
import type { UpcomingBooking } from "@/features/bookings/queries";
import { checkInAction } from "@/features/checkins/actions";
import { Button } from "@/components/ui/button";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MyBookingsList({
  bookings,
  showCheckIn = false,
}: {
  bookings: UpcomingBooking[];
  /** Only meaningful when the viewer IS the booking's own student — student_checkin() rejects staff. */
  showCheckIn?: boolean;
}) {
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

  function checkIn(bookingId: string) {
    startTransition(async () => {
      const result = await checkInAction(bookingId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Check-in realizado!");
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
          <div className="flex items-center gap-1">
            {showCheckIn && booking.date === todayISO() ? (
              <Button size="sm" disabled={isPending} onClick={() => checkIn(booking.id)}>
                Check-in
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => cancel(booking.id)}
            >
              Cancelar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
