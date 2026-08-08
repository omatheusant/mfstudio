import * as z from "zod";

export const scheduleCategorySchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome para a categoria." }),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, { error: "Use o formato HH:MM." });

export const scheduleSlotSchema = z
  .object({
    schedule_category_id: z.uuid({ error: "Selecione uma categoria." }),
    day_of_week: z.coerce
      .number()
      .int()
      .min(0)
      .max(6),
    start_time: timeSchema,
    end_time: timeSchema,
    capacity: z.coerce
      .number()
      .int()
      .positive({ error: "A capacidade deve ser maior que zero." }),
  })
  .refine((data) => data.end_time > data.start_time, {
    error: "O horário final deve ser depois do horário inicial.",
    path: ["end_time"],
  });

export type ScheduleCategoryInput = z.infer<typeof scheduleCategorySchema>;
export type ScheduleSlotInput = z.infer<typeof scheduleSlotSchema>;
