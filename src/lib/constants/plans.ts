import type { BillingCycle, SessionPeriod } from "@/types/database";

export const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "YEARLY", label: "Anual" },
  { value: "CUSTOM", label: "Personalizado" },
];

export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  MONTHLY: "Mensal",
  WEEKLY: "Semanal",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
  CUSTOM: "Personalizado",
};

export const SESSION_PERIOD_OPTIONS: { value: SessionPeriod; label: string }[] = [
  { value: "WEEK", label: "por semana" },
  { value: "MONTH", label: "por mês" },
];

export const SESSION_PERIOD_LABEL: Record<SessionPeriod, string> = {
  WEEK: "semana",
  MONTH: "mês",
};
