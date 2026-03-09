import { Resend } from "resend"
import { render } from "@react-email/render"
import { createHmac, timingSafeEqual } from "crypto"
import { db } from "@/lib/db/client"
import { emailSuppressions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { VerifyEmail } from "@/emails/verify-email"
import { ResetPassword } from "@/emails/reset-password"
import { BriefingEmail } from "@/emails/briefing-email"
import type { BriefingTopicSection } from "@/emails/briefing-email"

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = "Brief <noreply@briefnews.online>"
const APP_URL = process.env.APP_URL ?? "https://briefnews.online"

// ---------------------------------------------------------------------------
// Suppression check — query DB before every send (MAIL-03 / AUTH-07)
// Resend also suppresses at infrastructure level, but the app must have its
// own record to satisfy CAN-SPAM/GDPR compliance.
// ---------------------------------------------------------------------------
export async function isSuppressed(email: string): Promise<boolean> {
  const row = await db.query.emailSuppressions.findFirst({
    where: eq(emailSuppressions.email, email),
    columns: { id: true },
  })
  return !!row
}

// ---------------------------------------------------------------------------
// Unsubscribe token — HMAC-SHA256, stateless, 30-day expiry (AUTH-07)
// UNSUBSCRIBE_SECRET env var: generate with `openssl rand -hex 32`
// Use timingSafeEqual to avoid timing attacks on signature comparison.
// ---------------------------------------------------------------------------
export function generateUnsubscribeToken(email: string): string {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  const payload = `${email}|${expires}`
  const sig = createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
    .update(payload)
    .digest("hex")
  return Buffer.from(`${payload}|${sig}`).toString("base64url")
}

export function validateUnsubscribeToken(token: string): { email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString()
    const parts = decoded.split("|")
    if (parts.length !== 3) return null
    const [email, expiresStr, sig] = parts

    if (Date.now() > parseInt(expiresStr, 10)) return null

    const expected = createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
      .update(`${email}|${expiresStr}`)
      .digest("hex")

    // timingSafeEqual requires same-length buffers — sig mismatch would differ in length
    // only if the hex is corrupted; guard with length check first.
    const sigBuf = Buffer.from(sig, "hex")
    const expectedBuf = Buffer.from(expected, "hex")
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null

    return { email }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Typed send helpers — HTML + text + List-Unsubscribe headers (MAIL-04)
// Both headers required together for RFC 8058 one-click support.
// ---------------------------------------------------------------------------
export async function sendVerificationEmail(email: string, verifyUrl: string): Promise<void> {
  if (await isSuppressed(email)) return

  const token = generateUnsubscribeToken(email)
  const html = await render(VerifyEmail({ verifyUrl }))
  const text = await render(VerifyEmail({ verifyUrl }), { plainText: true })

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Verify your Brief email address",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${APP_URL}/api/unsubscribe?token=${token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  if (await isSuppressed(email)) return

  const token = generateUnsubscribeToken(email)
  const html = await render(ResetPassword({ resetUrl }))
  const text = await render(ResetPassword({ resetUrl }), { plainText: true })

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Reset your Brief password",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${APP_URL}/api/unsubscribe?token=${token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })
}

// ---------------------------------------------------------------------------
// Briefing email — daily personalised HTML briefing (MAIL-01)
// Follows the same isSuppressed + List-Unsubscribe pattern as other send helpers.
// topics must be pre-filtered (empty topics excluded, items capped at 5) by caller.
// ---------------------------------------------------------------------------
export async function sendBriefingEmail(
  email: string,
  userName: string,
  topics: BriefingTopicSection[],
  date: string,
): Promise<void> {
  if (await isSuppressed(email)) return

  const token = generateUnsubscribeToken(email)
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`
  const preferencesUrl = `${APP_URL}/dashboard/settings`

  const html = await render(BriefingEmail({ userName, date, topics, preferencesUrl, unsubscribeUrl }))
  const text = await render(BriefingEmail({ userName, date, topics, preferencesUrl, unsubscribeUrl }), { plainText: true })

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: `Good morning, ${userName} — your Brief is ready`,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${APP_URL}/api/unsubscribe?token=${token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}
