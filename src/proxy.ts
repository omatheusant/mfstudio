import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (same runtime concept,
 * Node.js only, no `edge` runtime). See:
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * This proxy does exactly one security-relevant thing: it refreshes the
 * Supabase session cookie on every request so Server Components (which
 * cannot write cookies themselves) always see a fresh session.
 *
 * It also performs an OPTIMISTIC route-group redirect (logged-out users
 * away from protected areas, logged-in users away from /login). This is a
 * UX convenience only — every Server Action, Route Handler and RLS policy
 * re-verifies the user independently. Never rely on this file alone for
 * authorization. See docs/01-app/02-guides/authentication.md
 * ("Optimistic checks with Proxy").
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() verifies the JWT locally (or against the Auth server on
  // first use) instead of trusting whatever is in the cookie unchecked.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  // Routes a logged-in user should be bounced away from (back to /dashboard).
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  // Routes anyone — logged in or not — may access.
  const isPublicRoute =
    isAuthRoute ||
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/studio/display");

  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimization
     * requests. Deliberately still runs on API routes: Server Actions are
     * POSTs to the page route, not to /api, so excluding /api here does
     * not create a gap — but every action/route handler still re-checks
     * auth itself regardless.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
