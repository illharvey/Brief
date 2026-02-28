"use server"
import { db } from "@/lib/db/client"
import { users, userConsents, passwordResetTokens, verificationTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { headers } from "next/headers"
import {
  signUpSchema,
  signInSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from "@/lib/validations/auth"
import { signIn as authSignIn, signOut as authSignOut } from "@/lib/auth"
import { loginRatelimit } from "@/lib/rate-limit"
import { resend } from "@/lib/email"

// -------------------------------------------------------------------------
// signUpAction
// Creates user, hashes password, records GDPR consent (AUTH-01, AUTH-06).
// Does NOT auto-sign-in — email verification must happen first.
// Returns userId so calling page can store it in onboarding cookie.
// -------------------------------------------------------------------------
export async function signUpAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const parsed = signUpSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // Check for duplicate — return specific code; page shows "An account with this email exists — log in?"
  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
    columns: { id: true },
  })
  if (existing) {
    return { error: "duplicate_email" }
  }

  // bcryptjs hash is async — never call synchronously
  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  // Extract client IP — x-forwarded-for is correct for Vercel edge deployments
  const headersList = await headers()
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  const userAgent = headersList.get("user-agent") ?? undefined

  const [newUser] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      passwordHash,
      emailVerified: null,
      onboardingComplete: false,
    })
    .returning({ id: users.id })

  // AUTH-06: Record GDPR consent — two consent types at signup
  await db.insert(userConsents).values([
    {
      userId: newUser.id,
      consentType: "marketing_email",
      consentedAt: new Date(),
      ipAddress: ip,
      userAgent,
    },
    {
      userId: newUser.id,
      consentType: "terms_of_service",
      consentedAt: new Date(),
      ipAddress: ip,
      userAgent,
    },
  ])

  // Send email verification — fire and forget; failure should not block signup
  try {
    await sendVerificationEmailAction(newUser.id, parsed.data.email)
  } catch (e) {
    console.error("Verification email failed to send:", e)
  }

  return { success: true, userId: newUser.id }
}

// -------------------------------------------------------------------------
// signInAction
// Rate-limited login wrapping Auth.js signIn.
// Wrong password shows "Email or password is incorrect" (user decision: locked).
// -------------------------------------------------------------------------
export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const parsed = signInSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { error: "invalid_input" }
  }

  // Rate limit: 5 attempts / 30s per email (soft lock, not account lock)
  const { success: rateLimitPassed, reset } = await loginRatelimit.limit(
    `login:${parsed.data.email}`
  )
  if (!rateLimitPassed) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000)
    return {
      error: "rate_limited",
      message: `Too many attempts. Try again in ${retryAfterSeconds} seconds.`,
    }
  }

  try {
    await authSignIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })
    return { success: true }
  } catch {
    // Auth.js throws on invalid credentials — return vague message per user decision
    return { error: "invalid_credentials", message: "Email or password is incorrect" }
  }
}

// -------------------------------------------------------------------------
// signOutAction
// -------------------------------------------------------------------------
export async function signOutAction() {
  await authSignOut({ redirect: false })
}

// -------------------------------------------------------------------------
// requestPasswordResetAction
// Never leaks whether email exists — always returns success.
// -------------------------------------------------------------------------
export async function requestPasswordResetAction(formData: FormData) {
  const email = formData.get("email") as string
  const parsed = passwordResetRequestSchema.safeParse({ email })
  if (!parsed.success) {
    return { error: "invalid_input" }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
    columns: { id: true },
  })
  // Always return success — don't leak whether email is registered
  if (!user) return { success: true }

  // Generate high-entropy token (two UUIDs concatenated = 64 hex chars)
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour — user decision (locked)

  await db.insert(passwordResetTokens).values({
    token,
    userId: user.id,
    expiresAt,
  })

  const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "noreply@mail.brief.app",
    to: parsed.data.email,
    subject: "Reset your Brief password",
    text: `Click this link to reset your password (expires in 1 hour):\n\n${resetLink}\n\nIf you did not request this, ignore this email.`,
  })

  return { success: true }
}

// -------------------------------------------------------------------------
// consumePasswordResetAction
// Validates token expiry and usedAt, updates password hash, marks token used
// in a single transaction — prevents replay attacks (Pitfall 5 in research).
// -------------------------------------------------------------------------
export async function consumePasswordResetAction(formData: FormData) {
  const raw = {
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  }

  const parsed = passwordResetSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const tokenRow = await db.query.passwordResetTokens.findFirst({
    where: (t, { eq: eqFn, and, isNull, gt }) =>
      and(
        eqFn(t.token, parsed.data.token),
        isNull(t.usedAt),
        gt(t.expiresAt, new Date())
      ),
  })
  if (!tokenRow) {
    return { error: "invalid_or_expired_token" }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  // Wrap in transaction: update password + mark token used atomically
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, tokenRow.userId))

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, parsed.data.token))
  })

  return { success: true }
}

// -------------------------------------------------------------------------
// sendVerificationEmailAction
// Sends verification email using verificationTokens table.
// Called after signup; can also be called standalone to resend.
// -------------------------------------------------------------------------
export async function sendVerificationEmailAction(userId: string, email: string) {
  // userId is accepted for future use (e.g., rate-limiting per user)
  void userId

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await db.insert(verificationTokens).values({
    identifier: email,
    token,
    expires,
  })

  const verifyLink = `${process.env.APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  await resend.emails.send({
    from: "noreply@mail.brief.app",
    to: email,
    subject: "Verify your Brief email address",
    text: `Click this link to verify your email address:\n\n${verifyLink}\n\nThis link expires in 24 hours.`,
  })
}
