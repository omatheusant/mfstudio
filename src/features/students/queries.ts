import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StudentStatus, SubscriptionStatus } from "@/types/database";

export type StudentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url?: string | null;
};

export type StudentSubscriptionSummary = {
  id: string;
  status: SubscriptionStatus;
  price: number;
  plan: { id: string; name: string; session_limit: number; session_period: "WEEK" | "MONTH" } | null;
};

/** The `students` row for the given profile within an organization — used to resolve "which student am I" for a logged-in STUDENT. */
export async function getStudentByProfileId(organizationId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "id, status, subscriptions(id, status, price, plan:plans(id, name, session_limit, session_period))",
    )
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[students] failed to load student by profile:", error.message);
    return null;
  }

  return data as
    | { id: string; status: StudentStatus; subscriptions: StudentSubscriptionSummary[] }
    | null;
}

export type StudentListRow = {
  id: string;
  status: StudentStatus;
  created_at: string;
  profiles: StudentProfile | null;
  subscriptions: StudentSubscriptionSummary[];
};

export async function getStudents(
  organizationId: string,
  opts: {
    search?: string;
    status?: StudentStatus;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{ data: StudentListRow[]; count: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select(
      "id, status, created_at, profiles!inner(id, full_name, email, phone), subscriptions(id, status, price, plan:plans(id, name))",
      { count: "exact" },
    )
    .eq("organization_id", organizationId);

  if (opts.status) {
    query = query.eq("status", opts.status);
  }

  if (opts.search) {
    const term = `%${opts.search}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`, {
      foreignTable: "profiles",
    });
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("[students] failed to load students:", error.message);
    return { data: [], count: 0 };
  }

  return { data: (data ?? []) as unknown as StudentListRow[], count: count ?? 0 };
}

export type StudentDetail = {
  id: string;
  status: StudentStatus;
  notes: string | null;
  created_at: string;
  profiles: StudentProfile | null;
  subscriptions: {
    id: string;
    status: SubscriptionStatus;
    price: number;
    start_date: string;
    end_date: string | null;
    billing_day: number | null;
    plan: { id: string; name: string; session_limit: number; session_period: string } | null;
  }[];
};

export async function getStudent(
  organizationId: string,
  studentId: string,
): Promise<StudentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      `id, status, notes, created_at,
       profiles(id, full_name, email, phone, avatar_url),
       subscriptions(id, status, price, start_date, end_date, billing_day,
         plan:plans(id, name, session_limit, session_period))`,
    )
    .eq("organization_id", organizationId)
    .eq("id", studentId)
    .order("start_date", { referencedTable: "subscriptions", ascending: false })
    .maybeSingle();

  if (error) {
    console.error("[students] failed to load student:", error.message);
    return null;
  }

  return data as unknown as StudentDetail | null;
}
