import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MF_STUDIO_SLUG,
  MF_STUDIO_TIMEZONE,
  SEED_EMAILS,
  TEST_RUN_WEEK_OFFSET,
  createThrowawayPlan,
  createThrowawaySlot,
  createThrowawayStudent,
  farFutureMonday,
  getOrgIdBySlug,
  pointInOrgTimezone,
  serviceClient,
  signIn,
} from "./helpers";
import type { Database } from "@/types/database";

function addMinutesClamped(time: string, minutes: number): string {
  const [h, m, s] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}:${s.toString().padStart(2, "0")}`;
}

/**
 * Fase 11 §44 priority 6–7: cancellation inside vs outside the
 * configured window (organization_settings.cancellation_window_minutes,
 * 120 for the seeded MF Studio), evaluated in the ORGANIZATION's
 * timezone — see docs/business-rules.md §"Reservas" and the timezone
 * fix in 20260808200001.
 */
describe("Cancelamento — dentro e fora da janela", () => {
  const suffix = `${Date.now()}`;
  const service = serviceClient();
  let owner: SupabaseClient<Database>;
  let student: SupabaseClient<Database>;
  let orgId: string;
  let studentId: string;
  let userId: string;
  const email = `cancel-test-${suffix}@elevo-fit-tests.dev`;

  const cleanupSlotIds: string[] = [];
  const cleanupCategoryIds: string[] = [];
  let planId: string;
  let farSlotId: string;
  let farDate: string;
  let lateSlotId: string;
  let lateDate: string;

  beforeAll(async () => {
    owner = await signIn(SEED_EMAILS.owner);
    orgId = await getOrgIdBySlug(owner, MF_STUDIO_SLUG);

    const fixture = await createThrowawayStudent(service, orgId, email);
    userId = fixture.userId;
    studentId = fixture.studentId;

    // Two throwaway slots: one safely far in the future (early
    // cancellation case) and one that "started" a few minutes ago in
    // the organization's own timezone (late cancellation case).
    farDate = farFutureMonday(TEST_RUN_WEEK_OFFSET + 1);
    const farSlot = await createThrowawaySlot(owner, orgId, {
      name: `Teste Cancelamento Cedo ${suffix}`,
      dayOfWeek: 1,
      startTime: "10:00:00",
      endTime: "11:00:00",
      capacity: 5,
    });
    farSlotId = farSlot.slotId;
    cleanupSlotIds.push(farSlot.slotId);
    cleanupCategoryIds.push(farSlot.categoryId);

    const started = pointInOrgTimezone(MF_STUDIO_TIMEZONE, -10);
    lateDate = started.date;
    const lateSlot = await createThrowawaySlot(owner, orgId, {
      name: `Teste Cancelamento Tarde ${suffix}`,
      dayOfWeek: started.dayOfWeek,
      startTime: started.time,
      endTime: addMinutesClamped(started.time, 30),
      capacity: 5,
    });
    lateSlotId = lateSlot.slotId;
    cleanupSlotIds.push(lateSlot.slotId);
    cleanupCategoryIds.push(lateSlot.categoryId);

    planId = await createThrowawayPlan(owner, orgId, {
      name: `Teste Cancelamento ${suffix}`,
      categoryIds: [farSlot.categoryId, lateSlot.categoryId],
      sessionLimit: 10,
      sessionPeriod: "WEEK",
    });

    const { error: subError } = await service.from("subscriptions").insert({
      organization_id: orgId,
      student_id: studentId,
      plan_id: planId,
      price: 0,
      status: "ACTIVE",
    });
    if (subError) throw subError;

    student = await signIn(email);
  });

  afterAll(async () => {
    await service.auth.admin.deleteUser(userId).catch(() => {});
    if (planId) await service.from("plans").delete().eq("id", planId);
    for (const id of cleanupSlotIds) await service.from("schedule_slots").delete().eq("id", id);
    for (const id of cleanupCategoryIds)
      await service.from("schedule_categories").delete().eq("id", id);
  });

  it("cancelar bem antes do início devolve a sessão (status CANCELLED)", async () => {
    const { data: booking, error: bookError } = await student.rpc("create_booking", {
      p_student_id: studentId,
      p_schedule_slot_id: farSlotId,
      p_date: farDate,
    });
    expect(bookError).toBeNull();

    const { data: cancelled, error: cancelError } = await student.rpc("cancel_booking", {
      p_booking_id: booking!.id,
    });

    expect(cancelError).toBeNull();
    expect(cancelled?.status).toBe("CANCELLED");
  });

  it("cancelar depois que a aula já começou conta como CANCELLED_LATE (sessão não é devolvida)", async () => {
    const { data: booking, error: bookError } = await student.rpc("create_booking", {
      p_student_id: studentId,
      p_schedule_slot_id: lateSlotId,
      p_date: lateDate,
    });
    expect(bookError).toBeNull();

    const { data: cancelled, error: cancelError } = await student.rpc("cancel_booking", {
      p_booking_id: booking!.id,
    });

    expect(cancelError).toBeNull();
    expect(cancelled?.status).toBe("CANCELLED_LATE");
  });
});
