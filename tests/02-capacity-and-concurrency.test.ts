import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MF_STUDIO_SLUG,
  SEED_EMAILS,
  TEST_RUN_WEEK_OFFSET,
  getOrgIdBySlug,
  nextDateForDow,
  serviceClient,
  signIn,
} from "./helpers";
import type { Database } from "@/types/database";

/**
 * Fase 11 §44 priority 4 + the spec's single most emphasized correctness
 * concern (seção 39): capacity must never be exceeded, even when several
 * bookings race for the last vacancy at the same instant.
 *
 * Builds a fully throwaway fixture (category/slot/plan/3 students) so
 * this never touches the seeded MF Studio data other tests rely on.
 */
describe("Capacidade e concorrência", () => {
  const suffix = `${Date.now()}`;
  const service = serviceClient();
  let owner: SupabaseClient<Database>;
  let orgId: string;
  let categoryId: string;
  let planId: string;
  let slotId: string;
  let capacity: number;
  const date = nextDateForDow(3, TEST_RUN_WEEK_OFFSET * 7); // a Wednesday, far in the future

  const throwawayUserIds: string[] = [];
  const throwawayEmails = [0, 1, 2].map((i) => `race-test-${suffix}-${i}@elevo-fit-tests.dev`);
  let racers: SupabaseClient<Database>[] = [];

  beforeAll(async () => {
    owner = await signIn(SEED_EMAILS.owner);
    orgId = await getOrgIdBySlug(owner, MF_STUDIO_SLUG);
    capacity = 2;

    const { data: category, error: categoryError } = await owner
      .from("schedule_categories")
      .insert({ organization_id: orgId, name: `Teste Concorrência ${suffix}` })
      .select("id")
      .single();
    if (categoryError) throw categoryError;
    categoryId = category.id;

    const { data: slot, error: slotError } = await owner
      .from("schedule_slots")
      .insert({
        organization_id: orgId,
        schedule_category_id: categoryId,
        day_of_week: 3,
        start_time: "04:00:00",
        end_time: "05:00:00",
        capacity,
      })
      .select("id")
      .single();
    if (slotError) throw slotError;
    slotId = slot.id;

    const { data: plan, error: planError } = await owner
      .from("plans")
      .insert({
        organization_id: orgId,
        name: `Teste Concorrência ${suffix}`,
        price: 0,
        session_limit: 10,
        session_period: "WEEK",
      })
      .select("id")
      .single();
    if (planError) throw planError;
    planId = plan.id;

    const { error: syncError } = await owner.rpc("sync_plan_categories", {
      p_plan_id: planId,
      p_category_ids: [categoryId],
    });
    if (syncError) throw syncError;

    // Three throwaway students, each with an ACTIVE subscription to the
    // test plan above — created via the admin API directly (test setup,
    // not the app's invite flow) since we don't need real email delivery.
    for (const email of throwawayEmails) {
      const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password: "elevofit123",
        email_confirm: true,
      });
      if (createError || !created.user) throw createError ?? new Error("createUser failed");
      throwawayUserIds.push(created.user.id);

      const { error: memberError } = await service.from("organization_members").insert({
        organization_id: orgId,
        user_id: created.user.id,
        role: "STUDENT",
        status: "ACTIVE",
      });
      if (memberError) throw memberError;

      const { data: student, error: studentError } = await service
        .from("students")
        .insert({ organization_id: orgId, profile_id: created.user.id })
        .select("id")
        .single();
      if (studentError) throw studentError;

      const { error: subError } = await service.from("subscriptions").insert({
        organization_id: orgId,
        student_id: student.id,
        plan_id: planId,
        price: 0,
        status: "ACTIVE",
      });
      if (subError) throw subError;
    }

    racers = await Promise.all(throwawayEmails.map((email) => signIn(email)));
  });

  afterAll(async () => {
    // Best-effort cleanup — this fixture is fully self-contained (unique
    // category/plan/slot names per run), so leftovers from a failed run
    // are harmless, but clean up anyway.
    for (const userId of throwawayUserIds) {
      await service.auth.admin.deleteUser(userId).catch(() => {});
    }
    if (planId) await service.from("plans").delete().eq("id", planId);
    if (slotId) await service.from("schedule_slots").delete().eq("id", slotId);
    if (categoryId) await service.from("schedule_categories").delete().eq("id", categoryId);
  });

  it("nunca permite mais reservas RESERVED do que a capacidade, mesmo com tentativas simultâneas", async () => {
    // Each racer resolves their own student_id first (their own session
    // can only see their own student row).
    const studentIds = await Promise.all(
      racers.map(async (client) => {
        const { data, error } = await client
          .from("students")
          .select("id")
          .eq("organization_id", orgId)
          .single();
        if (error) throw error;
        return data.id;
      }),
    );

    // Fire all 3 create_booking calls for the SAME slot/date at once —
    // this is exactly the race the spec calls out: capacity 2, 3
    // simultaneous attempts at the last vacancies.
    const results = await Promise.all(
      racers.map((client, i) =>
        client.rpc("create_booking", {
          p_student_id: studentIds[i],
          p_schedule_slot_id: slotId,
          p_date: date,
        }),
      ),
    );

    const succeeded = results.filter((r) => r.error === null);
    const failed = results.filter((r) => r.error !== null);

    expect(succeeded.length).toBe(capacity);
    expect(failed.length).toBe(racers.length - capacity);
    for (const r of failed) {
      expect(r.error?.message).toContain("lotado");
    }

    // Ground truth in the database matches — never trust the client
    // responses alone for a concurrency assertion.
    const { count } = await service
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("schedule_slot_id", slotId)
      .eq("date", date)
      .eq("status", "RESERVED");

    expect(count).toBe(capacity);
  });
});
