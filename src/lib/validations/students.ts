import * as z from "zod";

export const createStudentSchema = z.object({
  full_name: z.string().trim().min(2, { error: "Informe o nome completo." }),
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z.string().min(8, { error: "A senha deve ter pelo menos 8 caracteres." }),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  plan_id: z.uuid({ error: "Selecione um plano." }),
  price: z.coerce.number().min(0).optional(),
  start_date: z.string().min(1, { error: "Informe a data de início." }),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateStudentNotesSchema = z.object({
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const changePlanSchema = z.object({
  plan_id: z.uuid({ error: "Selecione um plano." }),
  price: z.coerce.number().min(0).optional(),
  start_date: z.string().min(1, { error: "Informe a data de início." }),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
