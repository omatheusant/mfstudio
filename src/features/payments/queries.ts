import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaymentEffectiveStatus } from "@/types/database";

export type PaymentRow = {
  id: string;
  student_id: string;
  subscription_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  effective_status: PaymentEffectiveStatus;
  payment_method: string | null;
  notes: string | null;
  student_name: string | null;
  plan_name: string | null;
};

function mapRow(row: {
  id: string;
  student_id: string;
  subscription_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  effective_status: PaymentEffectiveStatus;
  payment_method: string | null;
  notes: string | null;
  student?: unknown;
  subscription?: unknown;
}): PaymentRow {
  const student = row.student as { profiles: { full_name: string | null } | null } | null;
  const subscription = row.subscription as { plan: { name: string } | null } | null;
  return {
    id: row.id,
    student_id: row.student_id,
    subscription_id: row.subscription_id,
    amount: row.amount,
    due_date: row.due_date,
    paid_at: row.paid_at,
    effective_status: row.effective_status,
    payment_method: row.payment_method,
    notes: row.notes,
    student_name: student?.profiles?.full_name ?? null,
    plan_name: subscription?.plan?.name ?? null,
  };
}

export async function getPayments(
  organizationId: string,
  opts: { status?: PaymentEffectiveStatus; page?: number; pageSize?: number } = {},
): Promise<{ data: PaymentRow[]; count: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("payments_with_status")
    .select(
      "id, student_id, subscription_id, amount, due_date, paid_at, effective_status, payment_method, notes, student:students(profiles(full_name)), subscription:subscriptions(plan:plans(name))",
      { count: "exact" },
    )
    .eq("organization_id", organizationId);

  if (opts.status) {
    query = query.eq("effective_status", opts.status);
  }

  query = query.order("due_date", { ascending: true }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("[payments] failed to load payments:", error.message);
    return { data: [], count: 0 };
  }

  return {
    data: (data ?? []).map((row) => mapRow(row as unknown as Parameters<typeof mapRow>[0])),
    count: count ?? 0,
  };
}

export async function getPaymentsForStudent(studentId: string): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments_with_status")
    .select(
      "id, student_id, subscription_id, amount, due_date, paid_at, effective_status, payment_method, notes, subscription:subscriptions(plan:plans(name))",
    )
    .eq("student_id", studentId)
    .order("due_date", { ascending: false });

  if (error) {
    console.error("[payments] failed to load student payments:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as unknown as Parameters<typeof mapRow>[0]));
}

export type FinancialSummary = {
  overdueCount: number;
  overdueAmount: number;
  pendingAmount: number;
  paidThisMonthAmount: number;
};

/** Reused by the (Fase 8) dashboard — kept here since it reads straight from payments_with_status. */
export async function getFinancialSummary(organizationId: string): Promise<FinancialSummary> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [{ data: overdue }, { data: pending }, { data: paid }] = await Promise.all([
    supabase
      .from("payments_with_status")
      .select("amount")
      .eq("organization_id", organizationId)
      .eq("effective_status", "OVERDUE"),
    supabase
      .from("payments_with_status")
      .select("amount")
      .eq("organization_id", organizationId)
      .eq("effective_status", "PENDING"),
    supabase
      .from("payments_with_status")
      .select("amount")
      .eq("organization_id", organizationId)
      .eq("status", "PAID")
      .gte("paid_at", monthStartStr),
  ]);

  return {
    overdueCount: overdue?.length ?? 0,
    overdueAmount: (overdue ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
    pendingAmount: (pending ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
    paidThisMonthAmount: (paid ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
  };
}
