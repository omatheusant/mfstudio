import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MF_STUDIO_SLUG,
  SEED_EMAILS,
  TEST_RUN_WEEK_OFFSET,
  createThrowawayPlan,
  createThrowawaySlot,
  createThrowawayStudent,
  farFutureMonday,
  getOrgIdBySlug,
  serviceClient,
  signIn,
} from "./helpers";
import type { Database } from "@/types/database";

/**
 * Fase 11 §44 priority 8–9: inadimplência (calculada, nunca marcada
 * manualmente — ver docs/business-rules.md) e o bloqueio de reservas que
 * ela aciona quando organization_settings.block_booking_when_overdue
 * está ligado (padrão da organização seedada).
 */
describe("Inadimplência e bloqueio de reservas", () => {
  const suffix = `${Date.now()}`;
  const service = serviceClient();
  let owner: SupabaseClient<Database>;
  let student: SupabaseClient<Database>;
  let orgId: string;
  let studentId: string;
  let subscriptionId: string;
  let userId: string;
  let planId: string;
  let slotId: string;
  let categoryId: string;
  let paymentId: string;
  const email = `overdue-test-${suffix}@elevo-fit-tests.dev`;
  const date = farFutureMonday(TEST_RUN_WEEK_OFFSET + 2);

  beforeAll(async () => {
    owner = await signIn(SEED_EMAILS.owner);
    orgId = await getOrgIdBySlug(owner, MF_STUDIO_SLUG);

    const fixture = await createThrowawayStudent(service, orgId, email);
    userId = fixture.userId;
    studentId = fixture.studentId;

    const slot = await createThrowawaySlot(owner, orgId, {
      name: `Teste Inadimplência ${suffix}`,
      dayOfWeek: 1,
      startTime: "11:00:00",
      endTime: "12:00:00",
      capacity: 5,
    });
    slotId = slot.slotId;
    categoryId = slot.categoryId;

    planId = await createThrowawayPlan(owner, orgId, {
      name: `Teste Inadimplência ${suffix}`,
      categoryIds: [categoryId],
      sessionLimit: 5,
      sessionPeriod: "WEEK",
    });

    const { data: subscription, error: subError } = await owner
      .from("subscriptions")
      .insert({ organization_id: orgId, student_id: studentId, plan_id: planId, price: 100 })
      .select("id")
      .single();
    if (subError) throw subError;
    subscriptionId = subscription.id;

    student = await signIn(email);
  });

  afterAll(async () => {
    await service.auth.admin.deleteUser(userId).catch(() => {});
    if (planId) await service.from("plans").delete().eq("id", planId);
    if (slotId) await service.from("schedule_slots").delete().eq("id", slotId);
    if (categoryId) await service.from("schedule_categories").delete().eq("id", categoryId);
  });

  it("um pagamento PENDING vencido aparece como OVERDUE em payments_with_status (nunca gravado como tal)", async () => {
    const { data: payment, error: paymentError } = await owner
      .from("payments")
      .insert({
        organization_id: orgId,
        student_id: studentId,
        subscription_id: subscriptionId,
        amount: 100,
        due_date: "2020-01-01", // safely in the past regardless of when tests run
      })
      .select("id, status")
      .single();
    if (paymentError) throw paymentError;
    paymentId = payment.id;

    // Stored status is still PENDING — OVERDUE only ever appears computed.
    expect(payment.status).toBe("PENDING");

    const { data: withStatus, error: viewError } = await student
      .from("payments_with_status")
      .select("effective_status")
      .eq("id", paymentId)
      .single();

    expect(viewError).toBeNull();
    expect(withStatus?.effective_status).toBe("OVERDUE");
  });

  it("bloqueia a reserva enquanto o aluno estiver inadimplente, e libera assim que o pagamento é marcado como pago", async () => {
    const blocked = await student.rpc("create_booking", {
      p_student_id: studentId,
      p_schedule_slot_id: slotId,
      p_date: date,
    });

    expect(blocked.error).not.toBeNull();
    expect(blocked.error?.message).toContain("inadimplente");

    const { error: markPaidError } = await owner
      .from("payments")
      .update({ status: "PAID", paid_at: new Date().toISOString(), payment_method: "PIX" })
      .eq("id", paymentId);
    expect(markPaidError).toBeNull();

    const allowed = await student.rpc("create_booking", {
      p_student_id: studentId,
      p_schedule_slot_id: slotId,
      p_date: date,
    });

    expect(allowed.error).toBeNull();
    expect(allowed.data?.status).toBe("RESERVED");
  });
});
