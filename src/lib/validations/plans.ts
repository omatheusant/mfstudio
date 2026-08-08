import * as z from "zod";

export const BILLING_CYCLE_VALUES = [
  "MONTHLY",
  "WEEKLY",
  "QUARTERLY",
  "YEARLY",
  "CUSTOM",
] as const;

export const SESSION_PERIOD_VALUES = ["WEEK", "MONTH"] as const;

export const planSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe o nome do plano." }),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.coerce.number().min(0, { error: "O preço não pode ser negativo." }),
  billing_cycle: z.enum(BILLING_CYCLE_VALUES),
  session_limit: z.coerce
    .number()
    .int()
    .positive({ error: "Informe quantas sessões o plano permite." }),
  session_period: z.enum(SESSION_PERIOD_VALUES),
  schedule_category_ids: z
    .array(z.uuid())
    .min(1, { error: "Selecione ao menos uma categoria de horário." }),
});

export type PlanInput = z.infer<typeof planSchema>;
