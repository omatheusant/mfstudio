import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BookingStatus, DayOfWeek } from "@/types/database";

function dayOfWeekOf(date: string): DayOfWeek {
  // `date` is a plain "YYYY-MM-DD" string — parse as UTC noon to avoid the
  // local-timezone-of-the-server shifting it to the previous/next day.
  return new Date(`${date}T12:00:00Z`).getUTCDay() as DayOfWeek;
}

export type SlotOccupancy = {
  id: string;
  schedule_category_id: string;
  category_name: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  capacity: number;
  reserved: number;
};

/** Every active slot for the given date's day-of-week, with current occupancy. Staff (agenda) view — not filtered by any plan. */
export async function getSlotsForDate(
  organizationId: string,
  date: string,
): Promise<SlotOccupancy[]> {
  const supabase = await createClient();
  const dow = dayOfWeekOf(date);

  const { data: slots, error: slotsError } = await supabase
    .from("schedule_slots")
    .select("id, schedule_category_id, day_of_week, start_time, end_time, capacity, schedule_category:schedule_categories(name)")
    .eq("organization_id", organizationId)
    .eq("day_of_week", dow)
    .eq("active", true)
    .order("start_time");

  if (slotsError) {
    console.error("[bookings] failed to load slots:", slotsError.message);
    return [];
  }

  const slotIds = (slots ?? []).map((s) => s.id);
  const counts = await countReservedBySlot(organizationId, date, slotIds);

  return (slots ?? []).map((s) => ({
    id: s.id,
    schedule_category_id: s.schedule_category_id,
    category_name: (s.schedule_category as unknown as { name: string } | null)?.name ?? "—",
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    capacity: s.capacity,
    reserved: counts.get(s.id) ?? 0,
  }));
}

async function countReservedBySlot(
  organizationId: string,
  date: string,
  slotIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (slotIds.length === 0) return counts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("schedule_slot_id")
    .eq("organization_id", organizationId)
    .eq("date", date)
    .eq("status", "RESERVED")
    .in("schedule_slot_id", slotIds);

  if (error) {
    console.error("[bookings] failed to count reservations:", error.message);
    return counts;
  }

  for (const row of data ?? []) {
    counts.set(row.schedule_slot_id, (counts.get(row.schedule_slot_id) ?? 0) + 1);
  }
  return counts;
}

export type RosterEntry = {
  id: string;
  status: BookingStatus;
  student_id: string;
  student_name: string | null;
};

/** Who's booked into a specific slot occurrence — staff roster view. */
export async function getRoster(
  organizationId: string,
  scheduleSlotId: string,
  date: string,
): Promise<RosterEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, status, student_id, student:students(id, profiles(full_name))")
    .eq("organization_id", organizationId)
    .eq("schedule_slot_id", scheduleSlotId)
    .eq("date", date)
    .in("status", ["RESERVED", "COMPLETED", "NO_SHOW"])
    .order("created_at");

  if (error) {
    console.error("[bookings] failed to load roster:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const student = row.student as unknown as {
      id: string;
      profiles: { full_name: string | null } | null;
    } | null;
    return {
      id: row.id,
      status: row.status,
      student_id: row.student_id,
      student_name: student?.profiles?.full_name ?? null,
    };
  });
}

export type AvailableSlot = SlotOccupancy & {
  compatible: boolean;
};

/**
 * Slots for the given date, annotated with whether each one is
 * compatible with the student's active plan. Deliberately includes
 * incompatible slots too (rather than hiding them) — the UI marks WHY
 * they can't be booked, per the spec's "não esconder sem explicar".
 */
export async function getAvailableSlotsForStudent(
  organizationId: string,
  studentId: string,
  date: string,
): Promise<{ slots: AvailableSlot[]; hasActivePlan: boolean }> {
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("student_id", studentId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!subscription) {
    return { slots: [], hasActivePlan: false };
  }

  const { data: allowedCategories } = await supabase
    .from("plan_schedule_categories")
    .select("schedule_category_id")
    .eq("plan_id", subscription.plan_id);

  const allowedIds = new Set((allowedCategories ?? []).map((c) => c.schedule_category_id));

  const slots = await getSlotsForDate(organizationId, date);

  return {
    hasActivePlan: true,
    slots: slots.map((slot) => ({ ...slot, compatible: allowedIds.has(slot.schedule_category_id) })),
  };
}

export type UpcomingBooking = {
  id: string;
  date: string;
  status: BookingStatus;
  schedule_slot_id: string;
  start_time: string;
  end_time: string;
  category_name: string;
};

export async function getUpcomingBookingsForStudent(
  studentId: string,
): Promise<UpcomingBooking[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, date, status, schedule_slot_id, schedule_slot:schedule_slots(start_time, end_time, schedule_category:schedule_categories(name))",
    )
    .eq("student_id", studentId)
    .eq("status", "RESERVED")
    .gte("date", today)
    .order("date");

  if (error) {
    console.error("[bookings] failed to load upcoming bookings:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const slot = row.schedule_slot as unknown as {
      start_time: string;
      end_time: string;
      schedule_category: { name: string } | null;
    } | null;
    return {
      id: row.id,
      date: row.date,
      status: row.status,
      schedule_slot_id: row.schedule_slot_id,
      start_time: slot?.start_time ?? "",
      end_time: slot?.end_time ?? "",
      category_name: slot?.schedule_category?.name ?? "—",
    };
  });
}

/** "3/5 sessões usadas nesta semana/mês" — same period math as create_booking()'s RPC, mirrored in JS for display only (the RPC is what actually enforces the limit). */
export async function getSessionsUsedInCurrentPeriod(
  studentId: string,
  sessionPeriod: "WEEK" | "MONTH",
  referenceDate: string = new Date().toISOString().slice(0, 10),
): Promise<number> {
  const supabase = await createClient();
  const { start, end } = periodBounds(referenceDate, sessionPeriod);

  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .in("status", ["RESERVED", "COMPLETED"])
    .gte("date", start)
    .lte("date", end);

  if (error) {
    console.error("[bookings] failed to count sessions used:", error.message);
    return 0;
  }

  return count ?? 0;
}

function periodBounds(date: string, period: "WEEK" | "MONTH") {
  const d = new Date(`${date}T12:00:00Z`);
  if (period === "WEEK") {
    const dow = d.getUTCDay();
    const diffToMonday = (dow + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
    };
  }
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
