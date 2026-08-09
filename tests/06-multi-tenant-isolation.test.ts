import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MF_STUDIO_SLUG,
  SEED_EMAILS,
  SEED_PASSWORD,
  getOrgIdBySlug,
  serviceClient,
  signIn,
} from "./helpers";
import type { Database } from "@/types/database";

/**
 * Fase 11 §44 priority 11 — the whole product's foundational guarantee
 * (see docs/database.md §"Validação de isolamento multi-tenant"): a
 * member of organization A can never see or touch organization B's rows.
 * Creates a completely independent second organization ("Org B") via the
 * same create_organization() RPC any real signup uses, then proves MF
 * Studio's own OWNER — who has every permission *within* MF Studio —
 * still sees nothing of Org B.
 */
describe("Isolamento multi-tenant", () => {
  const suffix = `${Date.now()}`;
  const service = serviceClient();
  let mfOwner: SupabaseClient<Database>;
  let mfOrgId: string;
  let mfPlanId: string | null = null;

  let orgBOwner: SupabaseClient<Database>;
  let orgBOwnerId: string;
  let orgBId: string;
  let orgBCategoryId: string;

  beforeAll(async () => {
    mfOwner = await signIn(SEED_EMAILS.owner);
    mfOrgId = await getOrgIdBySlug(mfOwner, MF_STUDIO_SLUG);

    const email = `isolation-owner-${suffix}@elevo-fit-tests.dev`;
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
    });
    if (createError || !created.user) throw createError ?? new Error("createUser failed");
    orgBOwnerId = created.user.id;

    orgBOwner = await signIn(email);
    const { data: org, error: orgError } = await orgBOwner.rpc("create_organization", {
      p_name: `Org B Isolamento ${suffix}`,
      p_slug: `org-b-isolamento-${suffix}`,
    });
    if (orgError || !org) throw orgError ?? new Error("create_organization failed");
    orgBId = org.id;

    const { data: category, error: categoryError } = await orgBOwner
      .from("schedule_categories")
      .insert({ organization_id: orgBId, name: "Categoria Org B" })
      .select("id")
      .single();
    if (categoryError) throw categoryError;
    orgBCategoryId = category.id;

    const { data: plan } = await mfOwner
      .from("plans")
      .select("id")
      .eq("organization_id", mfOrgId)
      .limit(1)
      .single();
    mfPlanId = plan?.id ?? null;
  });

  afterAll(async () => {
    if (orgBCategoryId) await service.from("schedule_categories").delete().eq("id", orgBCategoryId);
    if (orgBId) await service.from("organizations").delete().eq("id", orgBId);
    await service.auth.admin.deleteUser(orgBOwnerId).catch(() => {});
  });

  it("o OWNER do MF Studio não vê a organização B na listagem", async () => {
    const { data, error } = await mfOwner.from("organizations").select("id").eq("id", orgBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("o OWNER do MF Studio não vê membros da organização B", async () => {
    const { data, error } = await mfOwner
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("o OWNER da organização B não vê planos do MF Studio", async () => {
    const { data, error } = await orgBOwner
      .from("plans")
      .select("id")
      .eq("organization_id", mfOrgId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("não é possível vincular um plano do MF Studio a uma categoria da organização B (trigger cross-tenant)", async () => {
    expect(mfPlanId).not.toBeNull();

    const { error } = await mfOwner.rpc("sync_plan_categories", {
      p_plan_id: mfPlanId!,
      p_category_ids: [orgBCategoryId],
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("same organization");
  });
});
