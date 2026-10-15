import { redirect } from "next/navigation";

// Single-tenant system for MF Studio — there's no public marketing/signup
// funnel to land on here. proxy.ts already sends unauthenticated visitors
// of protected routes to /login; this makes "/" do the same instead of
// showing a product pitch for a SaaS this no longer is.
export default function Home() {
  redirect("/login");
}
