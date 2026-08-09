"use client";

import { CalendarDays, LayoutDashboard, Settings, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { OrganizationRole } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: OrganizationRole[];
};

// Every module gets a nav entry only once it's actually implemented — see
// docs/architecture.md. Don't add placeholder links "for later".
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/agenda",
    label: "Agenda",
    icon: CalendarDays,
    roles: ["OWNER", "ADMIN", "PROFESSOR"],
  },
  {
    href: "/dashboard/bookings",
    label: "Reservar aula",
    icon: CalendarDays,
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/students",
    label: "Alunos",
    icon: Users,
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/dashboard/plans",
    label: "Planos",
    icon: Wallet,
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/dashboard/settings",
    label: "Configurações",
    icon: Settings,
    roles: ["OWNER", "ADMIN"],
  },
];

export function AppSidebar({
  organizationName,
  role,
}: {
  organizationName: string;
  role: OrganizationRole;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            E
          </span>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold leading-tight">
              ELEVO FIT
            </span>
            <span className="truncate text-xs text-muted-foreground leading-tight">
              {organizationName}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
