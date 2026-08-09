import type { Metadata } from "next";

import { getMemberships } from "@/lib/auth/dal";
import { getRoster, getSlotsForDate } from "@/features/bookings/queries";
import { getDashboardMetrics } from "@/features/dashboard/queries";
import { getOrganizationMembers } from "@/features/organizations/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrganizationRole } from "@/types/database";

import { MetricsCards } from "./_components/metrics-cards";
import { TodayAgenda } from "./_components/today-agenda";

export const metadata: Metadata = {
  title: "Dashboard — ELEVO FIT",
};

const ROLE_LABEL: Record<OrganizationRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  PROFESSOR: "Professor",
  STUDENT: "Aluno",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const memberships = await getMemberships();
  const primary = memberships[0];

  // Guarded by (dashboard)/layout.tsx already; this is just for TypeScript.
  if (!primary?.organization) {
    return null;
  }

  if (primary.role !== "OWNER" && primary.role !== "ADMIN") {
    const members = await getOrganizationMembers(primary.organization_id);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá! 👋</h1>
          <p className="text-muted-foreground">
            Você é <span className="font-medium">{ROLE_LABEL[primary.role]}</span>{" "}
            em <span className="font-medium">{primary.organization.name}</span>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipe e alunos</CardTitle>
            <CardDescription>Pessoas com acesso a este Studio.</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user?.full_name ?? "—"}</TableCell>
                      <TableCell>{ROLE_LABEL[member.role]}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
                          {member.status === "ACTIVE" ? "Ativo" : "Inativo"}
                        </Badge>
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

  const today = todayISO();
  const [metrics, slots] = await Promise.all([
    getDashboardMetrics(primary.organization_id, today),
    getSlotsForDate(primary.organization_id, today),
  ]);
  const rosters = await Promise.all(
    slots.map((slot) => getRoster(primary.organization_id, slot.id, today)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral de {primary.organization.name}.</p>
      </div>

      <MetricsCards metrics={metrics} />

      <TodayAgenda slots={slots} rosters={rosters} />
    </div>
  );
}
