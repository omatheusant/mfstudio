"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { cancelPayment } from "@/features/payments/actions";
import type { PaymentRow } from "@/features/payments/queries";
import {
  PAYMENT_STATUS_BADGE_VARIANT,
  PAYMENT_STATUS_LABEL,
} from "@/lib/constants/payments";
import { formatCurrency } from "@/lib/utils";
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

import { MarkPaidDialog } from "./mark-paid-dialog";

export function PaymentsTable({
  organizationId,
  payments,
  showStudent = true,
  showActions = true,
}: {
  organizationId: string;
  payments: PaymentRow[];
  showStudent?: boolean;
  showActions?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function cancel(paymentId: string, studentId: string) {
    startTransition(async () => {
      try {
        await cancelPayment(organizationId, paymentId, studentId);
        toast.success("Pagamento cancelado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao cancelar.");
      }
    });
  }

  if (payments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum pagamento encontrado.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showStudent ? <TableHead>Aluno</TableHead> : null}
          <TableHead>Plano</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
          {showActions ? <TableHead className="text-right">Ações</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            {showStudent ? <TableCell>{payment.student_name ?? "—"}</TableCell> : null}
            <TableCell className="text-muted-foreground">{payment.plan_name ?? "—"}</TableCell>
            <TableCell>{formatCurrency(payment.amount)}</TableCell>
            <TableCell>{new Date(`${payment.due_date}T12:00:00Z`).toLocaleDateString("pt-BR")}</TableCell>
            <TableCell>
              <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[payment.effective_status]}>
                {PAYMENT_STATUS_LABEL[payment.effective_status]}
              </Badge>
            </TableCell>
            {showActions ? (
              <TableCell className="flex justify-end gap-1">
                {payment.effective_status === "PENDING" || payment.effective_status === "OVERDUE" ? (
                  <>
                    <MarkPaidDialog
                      organizationId={organizationId}
                      paymentId={payment.id}
                      studentId={payment.student_id}
                      trigger={
                        <Button size="sm" variant="outline">
                          Marcar como pago
                        </Button>
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => cancel(payment.id, payment.student_id)}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : null}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
