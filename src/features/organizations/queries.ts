import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database, OrganizationRole } from "@/types/database";

export type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationSettingsRow =
  Database["public"]["Tables"]["organization_settings"]["Row"];

export async function getOrganization(organizationId: string): Promise<OrganizationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[organizations] failed to load organization:", error.message);
    return null;
  }

  return data;
}

/**
 * The organization's own settings row (Fase 2). Always exists — created
 * automatically by `create_organization()` — so a null result here means
 * either a data bug or that the caller isn't a member (RLS hid the row).
 */
export async function getOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettingsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[organizations] failed to load settings:", error.message);
    return null;
  }

  return data;
}

export type OrganizationMemberRow = {
  id: string;
  role: OrganizationRole;
  status: string;
  user: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

/**
 * Members of one organization. Callers are expected to have already
 * verified the current user belongs to `organizationId` (e.g. via
 * `requireMembership` in the DAL) — RLS enforces it regardless, this is
 * just the query itself.
 */
export async function getOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, role, status, user:profiles(id, full_name, avatar_url)")
    .eq("organization_id", organizationId)
    .order("role");

  if (error) {
    console.error("[organizations] failed to load members:", error.message);
    return [];
  }

  return (data ?? []) as unknown as OrganizationMemberRow[];
}
