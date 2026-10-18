import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getMemberships, requireRole } from "@/lib/auth/dal";
import { getPlans } from "@/features/plans/queries";
import { getStudents } from "@/features/students/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StudentDialog } from "./_components/student-dialog";
import { StudentsTable } from "./_components/students-table";

export const metadata: Metadata = {
  title: "Alunos — MF Studio",
};

const PAGE_SIZE = 20;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const memberships = await getMemberships();
  const primary = memberships[0];

  if (!primary) {
    redirect("/onboarding");
  }

  await requireRole(primary.organization_id, ["OWNER", "ADMIN"]);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const status = params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : undefined;

  const [{ data: students, count }, plans] = await Promise.all([
    getStudents(primary.organization_id, { search: params.q, status, page, pageSize: PAGE_SIZE }),
    getPlans(primary.organization_id),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const activePlans = plans.filter((plan) => plan.active);

  function pageHref(nextPage: number) {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (status) search.set("status", status);
    search.set("page", String(nextPage));
    return `/dashboard/students?${search.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground">
            {count} aluno{count === 1 ? "" : "s"} cadastrado{count === 1 ? "" : "s"}.
          </p>
        </div>
        <StudentDialog
          organizationId={primary.organization_id}
          plans={activePlans}
          trigger={<Button disabled={activePlans.length === 0}>Novo aluno</Button>}
        />
      </div>

      {activePlans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Crie um plano em{" "}
          <Link href="/dashboard/plans" className="underline underline-offset-4">
            Planos
          </Link>{" "}
          antes de cadastrar alunos.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Buscar e filtrar</CardTitle>
          <CardDescription>Por nome, e-mail ou status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-1 min-w-48 flex-col gap-2">
              <label htmlFor="q" className="text-sm font-medium">
                Buscar
              </label>
              <Input id="q" name="q" defaultValue={params.q} placeholder="Nome ou e-mail" />
            </div>
            <div className="flex w-40 flex-col gap-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select
                name="status"
                defaultValue={status ?? "ALL"}
                items={[
                  { value: "ALL", label: "Todos" },
                  { value: "ACTIVE", label: "Ativos" },
                  { value: "INACTIVE", label: "Inativos" },
                ]}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="INACTIVE">Inativos</SelectItem>
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
          <StudentsTable students={students} />
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
