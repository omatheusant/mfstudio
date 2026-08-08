import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ScheduleCategoryRow =
  Database["public"]["Tables"]["schedule_categories"]["Row"];

export type ScheduleSlotRow = Database["public"]["Tables"]["schedule_slots"]["Row"] & {
  schedule_category: Pick<ScheduleCategoryRow, "id" | "name"> | null;
};

export async function getScheduleCategories(
  organizationId: string,
): Promise<ScheduleCategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_categories")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) {
    console.error("[schedules] failed to load categories:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getScheduleSlots(organizationId: string): Promise<ScheduleSlotRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_slots")
    .select("*, schedule_category:schedule_categories(id, name)")
    .eq("organization_id", organizationId)
    .order("day_of_week")
    .order("start_time");

  if (error) {
    console.error("[schedules] failed to load slots:", error.message);
    return [];
  }

  return (data ?? []) as unknown as ScheduleSlotRow[];
}
