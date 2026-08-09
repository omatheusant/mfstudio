import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getMemberships, requireUser } from "@/lib/auth/dal";
import { getAvailableSlotsForStudent, getUpcomingBookingsForStudent } from "@/features/bookings/queries";
import { getStudentByProfileId } from "@/features/students/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AvailableSlots } from "./_components/available-slots";
import { MyBookingsList } from "./_components/my-bookings-list";

export const metadata: Metadata = {
  title: "Reservar aula — ELEVO FIT",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const memberships = await getMemberships();
  const primary = memberships[0];

  if (!primary) {
    redirect("/onboarding");
  }

  // Staff manage bookings from the Agenda (roster) view instead.
  if (primary.role !== "STUDENT") {
    redirect("/dashboard/agenda");
  }

  const student = await getStudentByProfileId(primary.organization_id, user.id);
  if (!student) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();

  const [{ slots, hasActivePlan }, upcoming] = await Promise.all([
    getAvailableSlotsForStudent(primary.organization_id, student.id, date),
    getUpcomingBookingsForStudent(student.id),
  ]);

  const dateLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reservar aula</h1>
        <p className="text-muted-foreground">
          Escolha uma data e reserve um horário compatível com o seu plano.
        </p>
      </div>

      {!hasActivePlan ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Você ainda não tem um plano ativo. Fale com a equipe do Studio
            para vincular um plano à sua conta.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="capitalize">{dateLabel}</CardTitle>
              <CardDescription>Horários e vagas disponíveis nesta data.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/dashboard/bookings?date=${addDays(date, -1)}`}>Anterior</Link>}
              />
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/dashboard/bookings?date=${todayISO()}`}>Hoje</Link>}
              />
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/dashboard/bookings?date=${addDays(date, 1)}`}>Próximo</Link>}
              />
            </div>
          </CardHeader>
          <CardContent>
            <AvailableSlots organizationId={primary.organization_id} date={date} slots={slots} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Minhas reservas</CardTitle>
          <CardDescription>Próximas aulas reservadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <MyBookingsList bookings={upcoming} showCheckIn />
        </CardContent>
      </Card>
    </div>
  );
}
