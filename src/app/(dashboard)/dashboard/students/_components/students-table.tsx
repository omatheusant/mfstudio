import Link from "next/link";

import type { StudentListRow } from "@/features/students/queries";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function StudentsTable({ students }: { students: StudentListRow[] }) {
  if (students.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum aluno encontrado.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => {
          const activeSubscription = student.subscriptions.find(
            (s) => s.status === "ACTIVE",
          );
          return (
            <TableRow key={student.id} className="cursor-pointer">
              <TableCell className="font-medium">
                <Link href={`/dashboard/students/${student.id}`} className="block">
                  {student.profiles?.full_name ?? "—"}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {student.profiles?.phone || "—"}
              </TableCell>
              <TableCell>
                {activeSubscription ? (
                  <span>
                    {activeSubscription.plan?.name} ·{" "}
                    {formatCurrency(activeSubscription.price)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sem plano ativo</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={student.status === "ACTIVE" ? "default" : "secondary"}>
                  {student.status === "ACTIVE" ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
