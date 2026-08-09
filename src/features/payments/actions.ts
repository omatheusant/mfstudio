"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createPaymentSchema, markPaidSchema } from "@/lib/validations/payments";

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function createPayment(
  organizationId: string,
  studentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = createPaymentSchema.safeParse({
    subscription_id: formData.get("subscription_id"),
    amount: formData.get("amount"),
    due_date: formData.get("due_date"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    organization_id: organizationId,
    student_id: studentId,
    subscription_id: parsed.data.subscription_id,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

export async function markPaymentPaid(
  organizationId: string,
  paymentId: string,
  studentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const parsed = markPaidSchema.safeParse({
    payment_method: formData.get("payment_method"),
    paid_at: formData.get("paid_at"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "PAID",
      payment_method: parsed.data.payment_method,
      paid_at: new Date(parsed.data.paid_at).toISOString(),
    })
    .eq("id", paymentId)
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

export async function cancelPayment(organizationId: string, paymentId: string, studentId: string) {
  await requireRole(organizationId, ["OWNER", "ADMIN"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "CANCELLED" })
    .eq("id", paymentId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/students/${studentId}`);
}
