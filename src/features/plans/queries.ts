import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type PlanRow = Database["public"]["Tables"]["plans"]["Row"];

export type PlanWithCategories = PlanRow & {
  plan_schedule_categories: {
    schedule_category: { id: string; name: string } | null;
  }[];
};

export async function getPlans(organizationId: string): Promise<PlanWithCategories[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(
      "*, plan_schedule_categories(schedule_category:schedule_categories(id, name))",
    )
    .eq("organization_id", organizationId)
    .order("price");

  if (error) {
    console.error("[plans] failed to load plans:", error.message);
    return [];
  }

  return (data ?? []) as unknown as PlanWithCategories[];
}
