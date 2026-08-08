import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/lib/auth/actions";
import { getMemberships, requireUser } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
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
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
              E
            </span>
            ELEVO FIT
          </Link>
          {primary.organization ? (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">{primary.organization.name}</span>
            </>
          ) : null}
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
