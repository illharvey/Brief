import { z } from "zod"

export const signUpSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters") // bcrypt 72-char limit
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
})

export const signInSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Valid email required"),
})

export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Token required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
