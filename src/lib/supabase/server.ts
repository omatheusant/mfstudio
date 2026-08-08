import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Supabase client for use in Server Components, Server Actions and Route
 * Handlers. Reads/writes the auth session through Next.js cookies.
 *
 * Server Components cannot write cookies (Next.js will throw), so the
 * `setAll` call is wrapped in a try/catch. When that happens, `proxy.ts`
 * is responsible for refreshing the session cookie on the next request.
 *
 * IMPORTANT: this uses the anon key and is subject to Postgres RLS. Do not
 * turn this into a service-role client — see `lib/supabase/admin.ts` for
 * the (rarely needed) exception.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore. `proxy.ts` refreshes
            // the session cookie on every request instead.
          }
        },
      },
    },
  );
}
