import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/types/database";

export type AttendanceEntry = {
  booking_id: string;
  date: string;
  status: BookingStatus;
  start_time: string;
  end_time: string;
  category_name: string;
  checked_in_at: string | null;
};

/** A student's full booking history with outcome — used for the "Histórico de presença" tab. Includes bookings with no checkin row yet (e.g. still RESERVED, or NO_SHOW marked without ever checking in). */
export async function getAttendanceHistory(studentId: string): Promise<AttendanceEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, date, status,
       schedule_slot:schedule_slots(start_time, end_time, schedule_category:schedule_categories(name)),
       checkin:checkins(checked_in_at)`,
    )
    .eq("student_id", studentId)
    .in("status", ["COMPLETED", "NO_SHOW"])
    .order("date", { ascending: false });

  if (error) {
    console.error("[checkins] failed to load attendance history:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const slot = row.schedule_slot as unknown as {
      start_time: string;
      end_time: string;
      schedule_category: { name: string } | null;
    } | null;
    const checkin = row.checkin as unknown as { checked_in_at: string } | null;
    return {
      booking_id: row.id,
      date: row.date,
      status: row.status,
      start_time: slot?.start_time ?? "",
      end_time: slot?.end_time ?? "",
      category_name: slot?.schedule_category?.name ?? "—",
      checked_in_at: checkin?.checked_in_at ?? null,
    };
  });
}
