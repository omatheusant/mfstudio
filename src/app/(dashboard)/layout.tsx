import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getMemberships, requireUser } from "@/lib/auth/dal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const memberships = await getMemberships();

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  // Fase 1 assumes a single active organization per user. Multi-org
  // switching UI can be added later without touching the data model —
  // `getMemberships()` already returns every organization the user
  // belongs to.
  const primary = memberships[0];

  return (
    <SidebarProvider>
      <AppSidebar
        organizationName={primary.organization?.name ?? ""}
        role={primary.role}
      />
      <SidebarInset>
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
          </div>
          <UserMenu email={user.email} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
