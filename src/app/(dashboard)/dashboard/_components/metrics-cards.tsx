import type { DashboardMetrics } from "@/features/dashboard/queries";
import { formatCurrency } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function MetricCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | number;
  emphasis?: "default" | "destructive";
}) {
  return (
    <Card>
      <CardHeader className="gap-1 pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={`text-2xl ${emphasis === "destructive" ? "text-destructive" : ""}`}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export function MetricsCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard label="Alunos ativos" value={metrics.activeStudents} />
      <MetricCard label="Novos alunos (30 dias)" value={metrics.newStudents} />
      <MetricCard label="Alunos inativos" value={metrics.inactiveStudents} />
      <MetricCard
        label="Alunos inadimplentes"
        value={metrics.overdueStudents}
        emphasis={metrics.overdueStudents > 0 ? "destructive" : "default"}
      />
      <MetricCard label="Receita recebida (mês)" value={formatCurrency(metrics.revenueReceivedThisMonth)} />
      <MetricCard label="Receita pendente" value={formatCurrency(metrics.revenuePending)} />
      <MetricCard
        label="Receita em atraso"
        value={formatCurrency(metrics.revenueOverdue)}
        emphasis={metrics.revenueOverdue > 0 ? "destructive" : "default"}
      />
      <MetricCard label="Ocupação média hoje" value={`${metrics.averageOccupancyToday}%`} />
    </div>
  );
}
