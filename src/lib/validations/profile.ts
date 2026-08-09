import * as z from "zod";

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2, { error: "Informe seu nome completo." }),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
