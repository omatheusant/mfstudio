import { beforeAll, describe, expect, it } from "vitest";

import {
  MF_STUDIO_SLUG,
  SEED_EMAILS,
  TEST_RUN_WEEK_OFFSET,
  farFutureMonday,
  getOrgIdBySlug,
  getScheduleCategoryIdByName,
  getSlotId,
  getStudentIdByEmail,
  signIn,
} from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Fase 11 §44 priority 1–3, 5:
 *   1. cálculo de sessões disponíveis
 *   2. reserva
 *   3. bloqueio por limite
 *   5. compatibilidade de plano/horário
 *
 * Uses the seeded MF Studio + João (plano Ouro: 5 sessões/semana,
 * categoria Premium). Runs on a far-future week so repeated `npm test`
 * runs never collide with a previous run's bookings.
 */
describe("Reservas — sessões, limite e compatibilidade de plano", () => {
  let joao: SupabaseClient<Database>;
  let orgId: string;
  let premiumId: string;
  let alternativoId: string;
  let joaoStudentId: string;
  const monday = farFutureMonday(TEST_RUN_WEEK_OFFSET);

  beforeAll(async () => {
    joao = await signIn(SEED_EMAILS.joao);
    orgId = await getOrgIdBySlug(joao, MF_STUDIO_SLUG);
    premiumId = await getScheduleCategoryIdByName(joao, orgId, "Premium");
    alternativoId = await getScheduleCategoryIdByName(joao, orgId, "Alternativo");
    joaoStudentId = await getStudentIdByEmail(joao, orgId, SEED_EMAILS.joao);
  });

  it("reserva um horário compatível com o plano (05:00, Premium)", async () => {
    const slot = await getSlotId(joao, orgId, premiumId, 1, "05:00:00");

    const { data, error } = await joao.rpc("create_booking", {
      p_student_id: joaoStudentId,
      p_schedule_slot_id: slot.id,
      p_date: monday,
    });

    expect(error).toBeNull();
    expect(data?.status).toBe("RESERVED");
  });

  it("recusa reservar um horário fora da categoria do plano (Alternativo)", async () => {
    const slot = await getSlotId(joao, orgId, alternativoId, 1, "08:00:00");

    const { error } = await joao.rpc("create_booking", {
      p_student_id: joaoStudentId,
      p_schedule_slot_id: slot.id,
      p_date: monday,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("não está disponível para o plano");
  });

  it("permite reservar até o limite de sessões do plano (5/semana), e recusa a 6ª", async () => {
    // Monday is already booked (05:00) by the first test above — book
    // Tue/Wed/Thu/Fri at 05:00 to reach 5, all within the same ISO week.
    for (let day = 2; day <= 5; day += 1) {
      const date = new Date(`${monday}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + (day - 1));
      const slot = await getSlotId(joao, orgId, premiumId, day, "05:00:00");

      const { error } = await joao.rpc("create_booking", {
        p_student_id: joaoStudentId,
        p_schedule_slot_id: slot.id,
        p_date: date.toISOString().slice(0, 10),
      });

      expect(error, `booking day ${day} should succeed`).toBeNull();
    }

    // 6th session this week — same week, a different time so it's not a
    // duplicate-slot conflict, just over the plan's session_limit.
    const sixthSlot = await getSlotId(joao, orgId, premiumId, 1, "06:00:00");
    const { error } = await joao.rpc("create_booking", {
      p_student_id: joaoStudentId,
      p_schedule_slot_id: sixthSlot.id,
      p_date: monday,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("limite de sessões");
  });
});
