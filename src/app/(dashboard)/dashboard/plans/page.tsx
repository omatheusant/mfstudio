import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMemberships, requireRole } from "@/lib/auth/dal";
import { getPlans } from "@/features/plans/queries";
import { getScheduleCategories } from "@/features/schedules/queries";

import { PlansTable } from "./_components/plans-table";

export const metadata: Metadata = {
  title: "Planos — MF Studio",
};

export default async function PlansPage() {
  const memberships = await getMemberships();
  const primary = memberships[0];

  if (!primary) {
    redirect("/onboarding");
  }

  await requireRole(primary.organization_id, ["OWNER", "ADMIN"]);

  const [plans, categories] = await Promise.all([
    getPlans(primary.organization_id),
    getScheduleCategories(primary.organization_id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
        <p className="text-muted-foreground">
          Defina os planos que os alunos podem assinar neste Studio.
        </p>
      </div>

      <PlansTable
        organizationId={primary.organization_id}
        plans={plans}
        categories={categories}
      />
    </div>
  );
}
