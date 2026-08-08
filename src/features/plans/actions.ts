"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { planSchema } from "@/lib/validations/plans";

export type ActionState = { error?: string; success?: boolean } | undefined;

function parsePlanFormData(formData: FormData) {
  return planSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    billing_cycle: formData.get("billing_cycle"),
    session_limit: formData.get("session_limit"),
    session_period: formData.get("session_period"),
    schedule_category_ids: formData.getAll("schedule_category_ids"),
  });
}

export async function createPlan(
  organizationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = parsePlanFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("plans")
    .insert({
      organization_id: organizationId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      billing_cycle: parsed.data.billing_cycle,
      session_limit: parsed.data.session_limit,
      session_period: parsed.data.session_period,
    })
    .select("id")
    .single();

  if (error || !plan) {
    if (error?.code === "23505") {
      return { error: "Já existe um plano com esse nome." };
    }
    return { error: error?.message ?? "Erro ao criar plano." };
  }

  const { error: syncError } = await supabase.rpc("sync_plan_categories", {
    p_plan_id: plan.id,
    p_category_ids: parsed.data.schedule_category_ids,
  });

  if (syncError) {
    return { error: syncError.message };
  }

  revalidatePath("/dashboard/plans");
  return { success: true };
}

export async function updatePlan(
  organizationId: string,
  planId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = parsePlanFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      billing_cycle: parsed.data.billing_cycle,
      session_limit: parsed.data.session_limit,
      session_period: parsed.data.session_period,
    })
    .eq("id", planId)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um plano com esse nome." };
    }
    return { error: error.message };
  }

  const { error: syncError } = await supabase.rpc("sync_plan_categories", {
    p_plan_id: planId,
    p_category_ids: parsed.data.schedule_category_ids,
  });

  if (syncError) {
    return { error: syncError.message };
  }

  revalidatePath("/dashboard/plans");
  return { success: true };
}

export async function setPlanActive(organizationId: string, planId: string, active: boolean) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({ active })
    .eq("id", planId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/plans");
}

export async function deletePlan(organizationId: string, planId: string) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("id", planId)
    .eq("organization_id", organizationId);

  if (error) {
    // Fase 4 adds subscriptions.plan_id ON DELETE RESTRICT — this message
    // is ready for that even though nothing enforces it yet.
    if (error.code === "23503") {
      throw new Error(
        "Este plano possui alunos vinculados e não pode ser removido. Desative-o em vez disso.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/plans");
}
