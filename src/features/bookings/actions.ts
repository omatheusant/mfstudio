"use server";

import { revalidatePath } from "next/cache";

import { requireRole, requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getAvailableSlotsForStudent } from "@/features/bookings/queries";

export type ActionState = { error?: string; success?: boolean } | undefined;

/** Used by the staff "Nova reserva" dialog on a student's detail page to load slots as the chosen date changes. */
export async function fetchAvailableSlotsForStudent(
  organizationId: string,
  studentId: string,
  date: string,
) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);
  return getAvailableSlotsForStudent(organizationId, studentId, date);
}

/**
 * Both actions below are thin wrappers around the create_booking()/
 * cancel_booking() RPCs (20260808160003_rpc_bookings.sql) — every
 * business rule (capacity, session limits, plan compatibility,
 * conflicts, cancellation window) is enforced there, not here. That
 * keeps this file free of logic that could drift out of sync with what
 * the database actually allows.
 */

function friendlyRpcError(message: string) {
  // The RPCs raise plain Portuguese messages meant for end users directly
  // (see the migration) — pass them through as-is instead of Postgres's
  // "ERROR: ..." wrapper prefix, if present.
  return message.replace(/^.*?:\s*/, "").trim() || message;
}

/** A STUDENT booking a slot for themselves. */
export async function bookForSelf(
  organizationId: string,
  scheduleSlotId: string,
  date: string,
): Promise<ActionState> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (studentError || !student) {
    return { error: "Não foi possível localizar seu cadastro de aluno." };
  }

  const { error } = await supabase.rpc("create_booking", {
    p_student_id: student.id,
    p_schedule_slot_id: scheduleSlotId,
    p_date: date,
  });

  if (error) {
    return { error: friendlyRpcError(error.message) };
  }

  revalidatePath("/dashboard/bookings");
  return { success: true };
}

/** OWNER/ADMIN booking a specific student into a slot (e.g. from the student's detail page). */
export async function bookForStudent(
  organizationId: string,
  studentId: string,
  scheduleSlotId: string,
  date: string,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_booking", {
    p_student_id: studentId,
    p_schedule_slot_id: scheduleSlotId,
    p_date: date,
  });

  if (error) {
    return { error: friendlyRpcError(error.message) };
  }

  revalidatePath("/dashboard/agenda");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

/** Cancellation is available to the booking's own student and to staff — cancel_booking() itself checks which. */
export async function cancelBookingAction(bookingId: string): Promise<ActionState> {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });

  if (error) {
    return { error: friendlyRpcError(error.message) };
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/agenda");
  return { success: true };
}
