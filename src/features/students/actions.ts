"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  changePlanSchema,
  createStudentSchema,
  updateStudentNotesSchema,
} from "@/lib/validations/students";

export type ActionState = { error?: string; success?: boolean } | undefined;

/**
 * Creates a student end-to-end: invites a real Supabase Auth user (the
 * only step that needs the service-role admin client — see
 * lib/supabase/admin.ts), then does everything else (membership, student
 * record, subscription) through the caller's own RLS-governed session,
 * exactly like any other write in this app. If any step after the invite
 * fails, the orphaned auth user is deleted so retrying doesn't leave
 * dangling accounts.
 */
export async function createStudent(
  organizationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = createStudentSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    plan_id: formData.get("plan_id"),
    price: formData.get("price") || undefined,
    start_date: formData.get("start_date"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY não está configurada neste ambiente — necessária para convidar novos alunos (ver .env.example).",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.full_name, phone: parsed.data.phone || null },
      redirectTo: `${siteUrl}/auth/confirm?next=/set-password`,
    },
  );

  if (inviteError || !invited?.user) {
    if (inviteError?.message?.toLowerCase().includes("already been registered")) {
      return { error: "Já existe uma conta com esse e-mail." };
    }
    return { error: inviteError?.message ?? "Erro ao convidar aluno." };
  }

  const newUserId = invited.user.id;
  const supabase = await createClient();

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: newUserId,
    role: "STUDENT",
    status: "ACTIVE",
  });

  if (memberError) {
    await admin.auth.admin.deleteUser(newUserId).catch(() => {});
    return { error: memberError.message };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      organization_id: organizationId,
      profile_id: newUserId,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (studentError || !student) {
    await admin.auth.admin.deleteUser(newUserId).catch(() => {});
    return { error: studentError?.message ?? "Erro ao criar aluno." };
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("price")
    .eq("id", parsed.data.plan_id)
    .single();

  const { error: subscriptionError } = await supabase.from("subscriptions").insert({
    organization_id: organizationId,
    student_id: student.id,
    plan_id: parsed.data.plan_id,
    price: parsed.data.price ?? plan?.price ?? 0,
    start_date: parsed.data.start_date,
    status: "ACTIVE",
  });

  if (subscriptionError) {
    return { error: subscriptionError.message };
  }

  revalidatePath("/dashboard/students");
  return { success: true };
}

export async function updateStudentNotes(
  organizationId: string,
  studentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = updateStudentNotesSchema.safeParse({
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ notes: parsed.data.notes || null })
    .eq("id", studentId)
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

export async function setStudentStatus(
  organizationId: string,
  studentId: string,
  status: "ACTIVE" | "INACTIVE",
) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", studentId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
}

/**
 * Ends the student's current ACTIVE subscription (if any) and starts a
 * new one on the chosen plan. Order matters: the old subscription is
 * moved off ACTIVE *before* the new row is inserted, so the
 * "one ACTIVE subscription per student" unique index is never violated.
 */
export async function changeStudentPlan(
  organizationId: string,
  studentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = changePlanSchema.safeParse({
    plan_id: formData.get("plan_id"),
    price: formData.get("price") || undefined,
    start_date: formData.get("start_date"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  const { error: cancelError } = await supabase
    .from("subscriptions")
    .update({ status: "CANCELLED", end_date: parsed.data.start_date })
    .eq("student_id", studentId)
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE");

  if (cancelError) {
    return { error: cancelError.message };
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("price")
    .eq("id", parsed.data.plan_id)
    .single();

  const { error: insertError } = await supabase.from("subscriptions").insert({
    organization_id: organizationId,
    student_id: studentId,
    plan_id: parsed.data.plan_id,
    price: parsed.data.price ?? plan?.price ?? 0,
    start_date: parsed.data.start_date,
    status: "ACTIVE",
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

export async function cancelSubscription(
  organizationId: string,
  studentId: string,
  subscriptionId: string,
) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "CANCELLED", end_date: new Date().toISOString().slice(0, 10) })
    .eq("id", subscriptionId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/students/${studentId}`);
}
