import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getMemberships, requireRole } from "@/lib/auth/dal";
import { getUpcomingBookingsForStudent } from "@/features/bookings/queries";
import { getAttendanceHistory } from "@/features/checkins/queries";
import { getPlans } from "@/features/plans/queries";
import { getPaymentsForStudent } from "@/features/payments/queries";
import { getStudent } from "@/features/students/queries";
import { formatCurrency } from "@/lib/utils";
import { SESSION_PERIOD_LABEL } from "@/lib/constants/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MyBookingsList } from "../../bookings/_components/my-bookings-list";
import { PaymentsTable } from "../../payments/_components/payments-table";
import { ChangePlanDialog } from "./_components/change-plan-dialog";
import { NewBookingDialog } from "./_components/new-booking-dialog";
import { NewPaymentDialog } from "./_components/new-payment-dialog";
import { NotesForm } from "./_components/notes-form";
import { StudentStatusSwitch } from "./_components/student-status-switch";

export const metadata: Metadata = {
  title: "Aluno — MF Studio",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const memberships = await getMemberships();
  const primary = memberships[0];

  if (!primary) {
    redirect("/onboarding");
  }

  await requireRole(primary.organization_id, ["OWNER", "ADMIN"]);

  const { id } = await params;
  const [student, plans] = await Promise.all([
    getStudent(primary.organization_id, id),
    getPlans(primary.organization_id),
  ]);

  if (!student) {
    notFound();
  }

  const [upcomingBookings, attendanceHistory, payments] = await Promise.all([
    getUpcomingBookingsForStudent(student.id),
    getAttendanceHistory(student.id),
    getPaymentsForStudent(student.id),
  ]);

  const activeSubscription = student.subscriptions.find((s) => s.status === "ACTIVE");
  const activePlans = plans.filter((plan) => plan.active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {student.profiles?.full_name ?? "Aluno"}
          </h1>
          <p className="text-muted-foreground">{student.profiles?.email}</p>
        </div>
        <StudentStatusSwitch
          organizationId={primary.organization_id}
          studentId={student.id}
          status={student.status}
        />
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="plan">Plano</TabsTrigger>
          <TabsTrigger value="bookings">Próximas reservas</TabsTrigger>
          <TabsTrigger value="attendance">Presença</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações pessoais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p>{student.profiles?.full_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">E-mail</p>
                <p>{student.profiles?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p>{student.profiles?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Aluno desde</p>
                <p>{new Date(student.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Plano atual</CardTitle>
                <CardDescription>
                  O preço fica congelado na assinatura — alterar o preço do
                  plano não afeta assinaturas já criadas.
                </CardDescription>
              </div>
              <ChangePlanDialog
                organizationId={primary.organization_id}
                studentId={student.id}
                plans={activePlans}
                hasActiveSubscription={Boolean(activeSubscription)}
                trigger={
                  <button className="text-sm font-medium underline underline-offset-4">
                    {activeSubscription ? "Trocar plano" : "Vincular plano"}
                  </button>
                }
              />
            </CardHeader>
            <CardContent>
              {activeSubscription ? (
                <div className="flex flex-col gap-1 text-sm">
                  <p className="text-lg font-semibold">{activeSubscription.plan?.name}</p>
                  <p>
                    {formatCurrency(activeSubscription.price)} ·{" "}
                    {activeSubscription.plan
                      ? `${activeSubscription.plan.session_limit}x por ${SESSION_PERIOD_LABEL[activeSubscription.plan.session_period as "WEEK" | "MONTH"]}`
                      : null}
                  </p>
                  <p className="text-muted-foreground">
                    Início em {new Date(activeSubscription.start_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este aluno ainda não tem um plano ativo.
                </p>
              )}

              {student.subscriptions.length > 1 ? (
                <div className="mt-6 flex flex-col gap-2">
                  <p className="text-sm font-medium">Histórico</p>
                  {student.subscriptions
                    .filter((s) => s.id !== activeSubscription?.id)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span>{s.plan?.name}</span>
                        <span className="text-muted-foreground">
                          {new Date(s.start_date).toLocaleDateString("pt-BR")}
                          {s.end_date
                            ? ` – ${new Date(s.end_date).toLocaleDateString("pt-BR")}`
                            : ""}
                        </span>
                        <Badge variant="secondary">{s.status}</Badge>
                      </div>
                    ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Próximas reservas</CardTitle>
                <CardDescription>
                  Só é possível reservar horários compatíveis com o plano
                  ativo do aluno.
                </CardDescription>
              </div>
              <NewBookingDialog
                organizationId={primary.organization_id}
                studentId={student.id}
                trigger={
                  <Button size="sm" disabled={!activeSubscription}>
                    Nova reserva
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <MyBookingsList bookings={upcomingBookings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de presença</CardTitle>
              <CardDescription>
                Marcada pelo próprio aluno (check-in) ou pela equipe, na Agenda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {attendanceHistory.map((entry) => (
                    <li
                      key={entry.booking_id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {new Date(`${entry.date}T12:00:00Z`).toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                          })}{" "}
                          · {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}
                        </p>
                        <p className="text-muted-foreground">{entry.category_name}</p>
                      </div>
                      <Badge variant={entry.status === "COMPLETED" ? "default" : "secondary"}>
                        {entry.status === "COMPLETED" ? "Presente" : "Faltou"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Pagamentos</CardTitle>
                <CardDescription>
                  Controle manual — nenhuma cobrança é gerada automaticamente.
                </CardDescription>
              </div>
              <NewPaymentDialog
                organizationId={primary.organization_id}
                studentId={student.id}
                subscriptions={student.subscriptions.map((s) => ({
                  id: s.id,
                  plan_name: s.plan?.name ?? "—",
                  price: s.price,
                }))}
                trigger={
                  <Button size="sm" disabled={student.subscriptions.length === 0}>
                    Novo pagamento
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <PaymentsTable
                organizationId={primary.organization_id}
                payments={payments}
                showStudent={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
              <CardDescription>Visíveis apenas para a equipe do Studio.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotesForm
                organizationId={primary.organization_id}
                studentId={student.id}
                notes={student.notes}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
