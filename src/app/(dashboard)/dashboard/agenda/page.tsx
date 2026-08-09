import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getMemberships, requireRole } from "@/lib/auth/dal";
import { getRoster, getSlotsForDate } from "@/features/bookings/queries";
import { DAY_OF_WEEK_LABEL } from "@/lib/constants/schedule";
import type { DayOfWeek } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { RosterDialog } from "./_components/roster-dialog";

export const metadata: Metadata = {
  title: "Agenda — ELEVO FIT",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const memberships = await getMemberships();
  const primary = memberships[0];

  if (!primary) {
    redirect("/onboarding");
  }

  await requireRole(primary.organization_id, ["OWNER", "ADMIN", "PROFESSOR"]);

  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();

  const slots = await getSlotsForDate(primary.organization_id, date);
  const rosters = await Promise.all(
    slots.map((slot) => getRoster(primary.organization_id, slot.id, date)),
  );

  const dateLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/dashboard/agenda?date=${addDays(date, -1)}`}>Anterior</Link>}
          />
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/dashboard/agenda?date=${todayISO()}`}>Hoje</Link>}
          />
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/dashboard/agenda?date=${addDays(date, 1)}`}>Próximo</Link>}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {slots.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum horário ativo em {DAY_OF_WEEK_LABEL[new Date(`${date}T12:00:00Z`).getUTCDay() as DayOfWeek]}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ocupação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot, index) => (
                  <TableRow key={slot.id}>
                    <TableCell className="font-medium">
                      {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{slot.category_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(slot.reserved / slot.capacity) * 100}
                          className="w-24"
                        />
                        <span className="text-sm tabular-nums">
                          {slot.reserved}/{slot.capacity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <RosterDialog
                        roster={rosters[index]}
                        trigger={
                          <Button variant="outline" size="sm">
                            Ver alunos
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
