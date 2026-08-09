import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DisplayOrganization = { name: string; logoUrl: string | null };

export async function getDisplayOrganization(slug: string): Promise<DisplayOrganization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_display_organization", { p_org_slug: slug });

  if (error || !data || data.length === 0) {
    if (error) console.error("[display] failed to load organization:", error.message);
    return null;
  }

  return { name: data[0].name, logoUrl: data[0].logo_url };
}

export type DisplaySlot = {
  slotId: string;
  startTime: string;
  endTime: string;
  categoryName: string;
  capacity: number;
  reserved: number;
};

export async function getDisplayAgenda(slug: string, date: string): Promise<DisplaySlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_display_agenda", {
    p_org_slug: slug,
    p_date: date,
  });

  if (error) {
    console.error("[display] failed to load agenda:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    slotId: row.slot_id,
    startTime: row.start_time,
    endTime: row.end_time,
    categoryName: row.category_name,
    capacity: row.capacity,
    reserved: row.reserved,
  }));
}

export type DisplayRosterEntry = { firstName: string; status: "RESERVED" | "PRESENT" | "ABSENT" };

export async function getDisplayRoster(
  slug: string,
  slotId: string,
  date: string,
): Promise<DisplayRosterEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_display_roster", {
    p_org_slug: slug,
    p_slot_id: slotId,
    p_date: date,
  });

  if (error) {
    console.error("[display] failed to load roster:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    firstName: row.first_name,
    status: row.status as DisplayRosterEntry["status"],
  }));
}
