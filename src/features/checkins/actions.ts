"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { CheckinStatus } from "@/types/database";

export type ActionState = { error?: string; success?: boolean } | undefined;

function friendlyRpcError(message: string) {
  return message.replace(/^.*?:\s*/, "").trim() || message;
}

/** Self check-in — student_checkin() (20260808170003) enforces the window and ownership. */
export async function checkInAction(bookingId: string): Promise<ActionState> {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.rpc("student_checkin", { p_booking_id: bookingId });

  if (error) {
    return { error: friendlyRpcError(error.message) };
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/agenda");
  return { success: true };
}

/** Staff marking PRESENT/ABSENT — mark_attendance() enforces the OWNER/ADMIN/PROFESSOR role. */
export async function markAttendanceAction(
  bookingId: string,
  status: CheckinStatus,
): Promise<ActionState> {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_attendance", {
    p_booking_id: bookingId,
    p_status: status,
  });

  if (error) {
    return { error: friendlyRpcError(error.message) };
  }

  revalidatePath("/dashboard/agenda");
  return { success: true };
}
