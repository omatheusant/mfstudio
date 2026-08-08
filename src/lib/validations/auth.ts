import * as z from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z.string().min(1, { error: "Informe sua senha." }),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Informe seu nome completo." }),
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z
    .string()
    .min(8, { error: "A senha deve ter pelo menos 8 caracteres." }),
});

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe o nome do Studio." }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      error: "Use apenas letras minúsculas, números e hífens.",
    }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
