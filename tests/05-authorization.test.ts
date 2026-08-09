import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MF_STUDIO_SLUG, SEED_EMAILS, getOrgIdBySlug, signIn } from "./helpers";
import type { Database } from "@/types/database";

/**
 * Fase 11 §44 priority 10: autorização por papel. Deliberately exercises
 * the ANON-KEY signed-in clients (never the service client) — this is
 * exactly what a real request from the app looks like, so it's the only
 * way to actually prove RLS (not just application code) is doing the
 * enforcing.
 */
describe("Autorização por papel", () => {
  let owner: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let professor: SupabaseClient<Database>;
  let joao: SupabaseClient<Database>; // STUDENT
  let orgId: string;

  beforeAll(async () => {
    owner = await signIn(SEED_EMAILS.owner);
    admin = await signIn(SEED_EMAILS.admin);
    professor = await signIn(SEED_EMAILS.professor);
    joao = await signIn(SEED_EMAILS.joao);
    orgId = await getOrgIdBySlug(owner, MF_STUDIO_SLUG);
  });

  it("STUDENT não consegue criar planos (RLS, não só a UI escondendo o botão)", async () => {
    const { error } = await joao
      .from("plans")
      .insert({ organization_id: orgId, name: "Plano Ilegítimo", price: 1, session_limit: 1, session_period: "WEEK" });

    expect(error).not.toBeNull();
  });

  it("PROFESSOR não vê pagamentos da organização, mesmo existindo pagamentos reais", async () => {
    const { data, error } = await professor.from("payments_with_status").select("id").eq("organization_id", orgId);

    // RLS filters silently (0 rows), it does not raise a permission error.
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    // Positive control: the SAME query, as OWNER, must return rows — proves
    // the empty result above is RLS, not "there happen to be no payments".
    const { data: ownerView, error: ownerError } = await owner
      .from("payments_with_status")
      .select("id")
      .eq("organization_id", orgId);
    expect(ownerError).toBeNull();
    expect((ownerView ?? []).length).toBeGreaterThan(0);
  });

  it("STUDENT não consegue marcar presença em nome de outro aluno", async () => {
    // Any real booking id is fine here — mark_attendance() checks the
    // caller's ROLE before it even looks at whether the booking exists.
    const { error } = await joao.rpc("mark_attendance", {
      p_booking_id: "00000000-0000-0000-0000-000000000000",
      p_status: "PRESENT",
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("Sem permissão");
  });

  it("ADMIN não consegue promover ninguém a OWNER (só um OWNER existente pode)", async () => {
    const { data: professorMembership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("role", "PROFESSOR")
      .single();

    expect(professorMembership).not.toBeNull();

    const { error } = await admin
      .from("organization_members")
      .update({ role: "OWNER" })
      .eq("id", professorMembership!.id);

    // RLS's with-check rejects it — Postgres reports this as "0 rows
    // affected" for an UPDATE whose WITH CHECK fails, not a thrown error,
    // so we assert the row was NOT actually changed instead.
    const { data: unchanged } = await owner
      .from("organization_members")
      .select("role")
      .eq("id", professorMembership!.id)
      .single();

    expect(unchanged?.role).toBe("PROFESSOR");
    void error; // present for completeness; PostgREST may or may not surface one here depending on version
  });
});
