import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMemberships, requireRole } from "@/lib/auth/dal";
import {
  getOrganization,
  getOrganizationSettings,
} from "@/features/organizations/queries";
import { getScheduleCategories, getScheduleSlots } from "@/features/schedules/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AgendaFinanceiroForm } from "./_components/agenda-financeiro-form";
import { ScheduleCategoriesPanel } from "./_components/schedule-categories-panel";
import { ScheduleSlotsPanel } from "./_components/schedule-slots-panel";
import { StudioForm } from "./_components/studio-form";

export const metadata: Metadata = {
  title: "Configurações — ELEVO FIT",
};

export default async function SettingsPage() {
  const memberships = await getMemberships();
  const primary = memberships[0];

  if (!primary) {
    redirect("/onboarding");
  }

  // Only OWNER/ADMIN may view or change Studio configuration — enforced
  // here (throws if not) in addition to RLS and the sidebar simply not
  // showing this link to other roles.
  await requireRole(primary.organization_id, ["OWNER", "ADMIN"]);

  const [organization, settings, categories, slots] = await Promise.all([
    getOrganization(primary.organization_id),
    getOrganizationSettings(primary.organization_id),
    getScheduleCategories(primary.organization_id),
    getScheduleSlots(primary.organization_id),
  ]);

  if (!organization || !settings) {
    // Should never happen — create_organization() always creates both.
    throw new Error("Organização ou configurações não encontradas.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Dados do Studio, regras de agenda/financeiro e horários oferecidos.
        </p>
      </div>

      <Tabs defaultValue="studio">
        <TabsList>
          <TabsTrigger value="studio">Studio</TabsTrigger>
          <TabsTrigger value="agenda">Agenda e financeiro</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="slots">Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="pt-4">
          <StudioForm organization={organization} />
        </TabsContent>

        <TabsContent value="agenda" className="pt-4">
          <AgendaFinanceiroForm
            organizationId={primary.organization_id}
            settings={settings}
          />
        </TabsContent>

        <TabsContent value="categories" className="pt-4">
          <ScheduleCategoriesPanel
            organizationId={primary.organization_id}
            categories={categories}
          />
        </TabsContent>

        <TabsContent value="slots" className="pt-4">
          <ScheduleSlotsPanel
            organizationId={primary.organization_id}
            categories={categories}
            slots={slots}
            defaultCapacity={settings.default_capacity}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
