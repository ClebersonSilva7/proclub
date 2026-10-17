import { z } from "zod";
export const emailSchema = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
export const passwordSchema = z.string().min(12).max(72);
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const passwordUpdateSchema = z
  .object({ password: passwordSchema, confirmation: z.string() })
  .refine((value) => value.password === value.confirmation);

export function safeDestination(value: unknown) {
  if (typeof value !== "string") return "/fan";
  if (["/fan", "/admin", "/redefinir-senha"].includes(value)) return value;
  if (/^\/gestao\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 90)
    return value;
  return "/fan";
}
