import * as z from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe o nome do Studio." }),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.email({ error: "Informe um e-mail válido." }).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  timezone: z.string().trim().min(1, { error: "Selecione um fuso horário." }),
});

export const updateOrganizationSettingsSchema = z.object({
  default_capacity: z.coerce
    .number()
    .int()
    .positive({ error: "A capacidade padrão deve ser maior que zero." }),
  cancellation_window_minutes: z.coerce
    .number()
    .int()
    .min(0, { error: "Não pode ser negativo." }),
  checkin_open_minutes_before: z.coerce
    .number()
    .int()
    .min(0, { error: "Não pode ser negativo." }),
  checkin_close_minutes_after: z.coerce
    .number()
    .int()
    .min(0, { error: "Não pode ser negativo." }),
  block_booking_when_overdue: z.coerce.boolean(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UpdateOrganizationSettingsInput = z.infer<
  typeof updateOrganizationSettingsSchema
>;
