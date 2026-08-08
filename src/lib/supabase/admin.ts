import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * ⚠️ DANGEROUS. Only import this file from trusted server-only code that
 * has already established, in application logic, why RLS cannot be used
 * (e.g. provisioning a new organization/owner before any membership row
 * exists to satisfy a policy). Never import this from a Client Component,
 * a file without `"use server"`/route handler context, or anywhere the
 * `SUPABASE_SERVICE_ROLE_KEY` could reach the browser bundle.
 *
 * Every call site using this client MUST perform its own authorization
 * check in application code, since the database will not do it for you.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to create an admin client.",
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
