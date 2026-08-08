"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  updateOrganizationSchema,
  updateOrganizationSettingsSchema,
} from "@/lib/validations/organization";

export type ActionState = { error?: string; success?: boolean } | undefined;

/**
 * `organizationId` is bound at render time (see settings page:
 * `updateOrganization.bind(null, organizationId)`) — it never comes from
 * form data the user could tamper with. `requireRole` re-derives the
 * user's role for THAT organization from the session/DB regardless, so
 * even a tampered bind would just fail authorization, not leak data.
 */
export async function updateOrganization(
  organizationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      timezone: parsed.data.timezone,
    })
    .eq("id", organizationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateOrganizationSettings(
  organizationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = updateOrganizationSettingsSchema.safeParse({
    default_capacity: formData.get("default_capacity"),
    cancellation_window_minutes: formData.get("cancellation_window_minutes"),
    checkin_open_minutes_before: formData.get("checkin_open_minutes_before"),
    checkin_close_minutes_after: formData.get("checkin_close_minutes_after"),
    block_booking_when_overdue: formData.get("block_booking_when_overdue"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_settings")
    .update(parsed.data)
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
