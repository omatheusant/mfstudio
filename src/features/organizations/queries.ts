import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OrganizationRole } from "@/types/database";

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
