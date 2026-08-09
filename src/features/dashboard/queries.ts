import "server-only";

import { getSlotsForDate } from "@/features/bookings/queries";
import { getFinancialSummary } from "@/features/payments/queries";
import { createClient } from "@/lib/supabase/server";

export type DashboardMetrics = {
  activeStudents: number;
  inactiveStudents: number;
  /** Students created in the last 30 days — the only "novos alunos" window with a clear, undebatable definition (see docs/business-rules.md). */
  newStudents: number;
  overdueStudents: number;
  revenueReceivedThisMonth: number;
  revenuePending: number;
  revenueOverdue: number;
  classesToday: number;
  occupiedSpotsToday: number;
  totalSpotsToday: number;
  /** 0–100, average occupancy across today's active slots. */
  averageOccupancyToday: number;
};

export async function getDashboardMetrics(
  organizationId: string,
  todayDate: string,
): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [activeCountRes, inactiveCountRes, newCountRes, financial, slots] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "ACTIVE"),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "INACTIVE"),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    getFinancialSummary(organizationId),
    getSlotsForDate(organizationId, todayDate),
  ]);

  const totalSpotsToday = slots.reduce((sum, slot) => sum + slot.capacity, 0);
  const occupiedSpotsToday = slots.reduce((sum, slot) => sum + slot.reserved, 0);

  return {
    activeStudents: activeCountRes.count ?? 0,
    inactiveStudents: inactiveCountRes.count ?? 0,
    newStudents: newCountRes.count ?? 0,
    overdueStudents: financial.overdueCount,
    revenueReceivedThisMonth: financial.paidThisMonthAmount,
    revenuePending: financial.pendingAmount,
    revenueOverdue: financial.overdueAmount,
    classesToday: slots.length,
    occupiedSpotsToday,
    totalSpotsToday,
    averageOccupancyToday:
      totalSpotsToday > 0 ? Math.round((occupiedSpotsToday / totalSpotsToday) * 100) : 0,
  };
}
