import Link from "next/link";

import type { UpcomingBooking } from "@/features/bookings/queries";
import { SESSION_PERIOD_LABEL } from "@/lib/constants/plans";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SessionPeriod } from "@/types/database";

export type StudentHomePlan = {
  name: string;
  price: number;
  sessionLimit: number;
  sessionPeriod: SessionPeriod;
  sessionsUsed: number;
};

function formatClassDate(date: string) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (date === today) return "Hoje";
  if (date === tomorrow) return "Amanhã";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

export function StudentHome({
  fullName,
  plan,
  nextClass,
}: {
  fullName: string | null;
  plan: StudentHomePlan | null;
  nextClass: UpcomingBooking | null;
}) {
  const firstName = fullName?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {firstName || "aluno"} 👋
        </h1>
      </div>

      {plan ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{plan.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {plan.sessionLimit} sessões por {SESSION_PERIOD_LABEL[plan.sessionPeriod]} ·{" "}
              {formatCurrency(plan.price)}
            </p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>Sessões utilizadas</span>
                <span className="tabular-nums font-medium">
                  {plan.sessionsUsed}/{plan.sessionLimit}
                </span>
              </div>
              <Progress value={(plan.sessionsUsed / plan.sessionLimit) * 100} />
            </div>
            {nextClass ? (
              <div className="rounded-md border px-3 py-2 text-sm">
                <p className="text-muted-foreground">Próxima aula</p>
                <p className="font-medium">
                  {formatClassDate(nextClass.date)} às {nextClass.start_time.slice(0, 5)}
                  {" · "}
                  {nextClass.category_name}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você não tem nenhuma aula reservada.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Você ainda não tem um plano ativo. Fale com a equipe do Studio
            para vincular um plano à sua conta.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-auto py-4"
          render={<Link href="/dashboard/bookings">Reservar aula</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4"
          render={<Link href="/dashboard/bookings#minhas-reservas">Minhas reservas</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4"
          render={<Link href="/dashboard/bookings#minhas-reservas">Fazer check-in</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4"
          render={<Link href="/dashboard/payments">Pagamentos</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4 col-span-2"
          render={<Link href="/dashboard/profile">Meu perfil</Link>}
        />
      </div>
    </div>
  );
}
