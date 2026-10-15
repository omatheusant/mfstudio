import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getMemberships, requireUser } from "@/lib/auth/dal";
import { getFinancialSummary, getPayments, getPaymentsForStudent } from "@/features/payments/queries";
import { getStudentByProfileId } from "@/features/students/queries";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentEffectiveStatus } from "@/types/database";

import { PaymentsTable } from "./_components/payments-table";

export const metadata: Metadata = {
  title: "Pagamentos — MF Studio",
};

const PAGE_SIZE = 20;
const STATUS_VALUES: PaymentEffectiveStatus[] = ["PENDING", "OVERDUE", "PAID", "CANCELLED"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await requireUser();
  const memberships = await getMemberships();
  const primary = memberships[0];

  if (!primary) {
    redirect("/onboarding");
  }

  if (primary.role === "PROFESSOR") {
    redirect("/dashboard");
  }

  // STUDENT sees only their own payments — no filters, no actions.
  if (primary.role === "STUDENT") {
    const student = await getStudentByProfileId(primary.organization_id, user.id);
    const payments = student ? await getPaymentsForStudent(student.id) : [];

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meus pagamentos</h1>
          <p className="text-muted-foreground">Histórico de mensalidades e vencimentos.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <PaymentsTable
              organizationId={primary.organization_id}
              payments={payments}
              showStudent={false}
              showActions={false}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const status = STATUS_VALUES.includes(params.status as PaymentEffectiveStatus)
    ? (params.status as PaymentEffectiveStatus)
    : undefined;

  const [{ data: payments, count }, summary] = await Promise.all([
    getPayments(primary.organization_id, { status, page, pageSize: PAGE_SIZE }),
    getFinancialSummary(primary.organization_id),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  function pageHref(nextPage: number) {
    const search = new URLSearchParams();
    if (status) search.set("status", status);
    search.set("page", String(nextPage));
    return `/dashboard/payments?${search.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pagamentos</h1>
        <p className="text-muted-foreground">
          Controle financeiro manual — sem integração com gateway de pagamento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inadimplentes</CardDescription>
            <CardTitle className="text-2xl">{summary.overdueCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor em atraso</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary.overdueAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A receber</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary.pendingAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recebido este mês</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary.paidThisMonthAmount)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex items-end gap-3">
            <div className="flex w-48 flex-col gap-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select name="status" defaultValue={status ?? "ALL"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendentes</SelectItem>
                  <SelectItem value="OVERDUE">Atrasados</SelectItem>
                  <SelectItem value="PAID">Pagos</SelectItem>
                  <SelectItem value="CANCELLED">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <PaymentsTable organizationId={primary.organization_id} payments={payments} />
          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                {page <= 1 ? (
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={pageHref(page - 1)}>Anterior</Link>}
                  />
                )}
                {page >= totalPages ? (
                  <Button variant="outline" size="sm" disabled>
                    Próxima
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={pageHref(page + 1)}>Próxima</Link>}
                  />
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
