import Link from "next/link";

import type { RosterEntry, SlotOccupancy } from "@/features/bookings/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { RosterDialog } from "../agenda/_components/roster-dialog";

export function TodayAgenda({
  slots,
  rosters,
}: {
  slots: SlotOccupancy[];
  rosters: RosterEntry[][];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda de hoje</CardTitle>
        <CardDescription>Ocupação dos horários ativos de hoje.</CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/agenda">Ver agenda completa</Link>}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {slots.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum horário ativo hoje.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horário</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead className="text-right">Alunos</TableHead>
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
                      <Progress value={(slot.reserved / slot.capacity) * 100} className="w-24" />
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
  );
}
