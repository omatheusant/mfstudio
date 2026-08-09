import * as z from "zod";

export const PAYMENT_METHOD_VALUES = ["PIX", "CASH", "CARD", "TRANSFER", "OTHER"] as const;

export const createPaymentSchema = z.object({
  subscription_id: z.uuid({ error: "Selecione uma assinatura." }),
  amount: z.coerce.number().min(0, { error: "O valor não pode ser negativo." }),
  due_date: z.string().min(1, { error: "Informe a data de vencimento." }),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const markPaidSchema = z.object({
  payment_method: z.enum(PAYMENT_METHOD_VALUES, { error: "Selecione a forma de pagamento." }),
  paid_at: z.string().min(1, { error: "Informe a data do pagamento." }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
