import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { OrganizationRole } from "@/types/database";

/**
 * Data Access Layer (DAL) — the ONLY place allowed to derive "who is the
 * current user and what can they do" from a request. Server Actions,
 * Route Handlers and Server Components call into this module instead of
 * re-implementing auth/authorization checks themselves.
 *
 * `proxy.ts` also checks auth, but only as an optimistic UX redirect — it
 * is not a substitute for the checks here, and these checks are not a
 * substitute for RLS. All three layers exist on purpose: proxy (optimistic
 * UX), DAL (server-side authorization), RLS (last line of defense in the
 * database itself). See docs/architecture.md.
 *
 * `cache()` memoizes each function for the lifetime of a single request/
 * render pass, so calling e.g. `getCurrentUser()` from multiple components
 * costs one JWT verification, not N.
 */

export type CurrentUser = {
  id: string;
  email: string | undefined;
};

export type Membership = {
  organization_id: string;
  role: OrganizationRole;
  status: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  } | null;
};

/**
 * Verifies the session's JWT (locally, against Supabase's signing keys)
 * and returns the minimal identity it contains. Returns null when there is
 * no valid session — callers decide whether that should redirect.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : undefined,
  };
});

/** Same as `getCurrentUser`, but redirects to /login when unauthenticated. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Every ACTIVE organization membership for the current user, with the
 * organization row embedded. Backed by RLS (`organization_members` and
 * `organizations` select policies), so even a bug here cannot leak another
 * tenant's row.
 */
export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "organization_id, role, status, organization:organizations(id, name, slug, timezone)",
    )
    .eq("user_id", user.id)
    .eq("status", "ACTIVE");

  if (error) {
    console.error("[dal] failed to load memberships:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Membership[];
});

/**
 * Requires the user to be an ACTIVE member of `organizationId`. Redirects
 * to /dashboard (rather than throwing) since "not a member of this org" is
 * a routing concern, not a fatal error, in most UI call sites.
 */
export async function requireMembership(organizationId: string) {
  const user = await requireUser();
  const memberships = await getMemberships();
  const membership = memberships.find((m) => m.organization_id === organizationId);

  if (!membership) {
    redirect("/dashboard");
  }

  return { user, membership };
}

/**
 * Requires the user to be an ACTIVE member of `organizationId` with one of
 * `roles`. Throws (rather than redirecting) since this is meant to guard
 * Server Actions/mutations, where silently redirecting would hide a bug or
 * an attempted privilege escalation.
 */
export async function requireRole(organizationId: string, roles: OrganizationRole[]) {
  const { user, membership } = await requireMembership(organizationId);

  if (!roles.includes(membership.role)) {
    throw new Error("Forbidden: you do not have the required role for this action.");
  }

  return { user, membership };
}
