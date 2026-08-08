"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  scheduleCategorySchema,
  scheduleSlotSchema,
} from "@/lib/validations/schedules";
import type { DayOfWeek } from "@/types/database";

export type ActionState = { error?: string; success?: boolean } | undefined;

// ---------------------------------------------------------------------
// Schedule categories
// ---------------------------------------------------------------------

export async function createScheduleCategory(
  organizationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = scheduleCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("schedule_categories").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    description: parsed.data.description || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe uma categoria com esse nome." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateScheduleCategory(
  organizationId: string,
  categoryId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = scheduleCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_categories")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", categoryId)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe uma categoria com esse nome." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function setScheduleCategoryActive(
  organizationId: string,
  categoryId: string,
  active: boolean,
) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_categories")
    .update({ active })
    .eq("id", categoryId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}

export async function deleteScheduleCategory(organizationId: string, categoryId: string) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_categories")
    .delete()
    .eq("id", categoryId)
    .eq("organization_id", organizationId);

  if (error) {
    // schedule_slots.schedule_category_id is ON DELETE RESTRICT.
    if (error.code === "23503") {
      throw new Error(
        "Essa categoria está em uso por horários existentes. Desative-a ou remova os horários primeiro.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------
// Schedule slots
// ---------------------------------------------------------------------

function parseSlotFormData(formData: FormData) {
  return scheduleSlotSchema.safeParse({
    schedule_category_id: formData.get("schedule_category_id"),
    day_of_week: formData.get("day_of_week"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    capacity: formData.get("capacity"),
  });
}

export async function createScheduleSlot(
  organizationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = parseSlotFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("schedule_slots").insert({
    organization_id: organizationId,
    schedule_category_id: parsed.data.schedule_category_id,
    day_of_week: parsed.data.day_of_week as DayOfWeek,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    capacity: parsed.data.capacity,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um horário idêntico cadastrado nesse dia." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateScheduleSlot(
  organizationId: string,
  slotId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = parseSlotFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_slots")
    .update({
      schedule_category_id: parsed.data.schedule_category_id,
      day_of_week: parsed.data.day_of_week as DayOfWeek,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      capacity: parsed.data.capacity,
    })
    .eq("id", slotId)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um horário idêntico cadastrado nesse dia." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function setScheduleSlotActive(
  organizationId: string,
  slotId: string,
  active: boolean,
) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_slots")
    .update({ active })
    .eq("id", slotId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}

export async function deleteScheduleSlot(organizationId: string, slotId: string) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_slots")
    .delete()
    .eq("id", slotId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}
