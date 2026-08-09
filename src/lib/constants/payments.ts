import type { PaymentEffectiveStatus, PaymentMethod } from "@/types/database";

export const PAYMENT_STATUS_LABEL: Record<PaymentEffectiveStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Atrasado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS_BADGE_VARIANT: Record<
  PaymentEffectiveStatus,
  "default" | "secondary" | "destructive"
> = {
  PENDING: "secondary",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "PIX", label: "PIX" },
  { value: "CASH", label: "Dinheiro" },
  { value: "CARD", label: "Cartão" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" },
];
