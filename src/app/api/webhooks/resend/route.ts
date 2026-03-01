import { NextRequest, NextResponse } from "next/server"
import { resend } from "@/lib/email"
import { db } from "@/lib/db/client"
import { emailSuppressions } from "@/lib/db/schema"

// CRITICAL: export config to disable body parsing — webhook signature verification
// requires the raw string body. Next.js default body parsing breaks svix HMAC.
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  // MUST use req.text() — req.json() re-serialises and invalidates svix HMAC
  const payload = await req.text()

  let event: { type: string; data: { to?: string[] } }
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    }) as { type: string; data: { to?: string[] } }
  } catch (err) {
    console.error("Resend webhook signature verification failed:", err)
    return new NextResponse("Invalid webhook signature", { status: 400 })
  }

  const { type, data } = event

  if (type === "email.bounced" || type === "email.complained") {
    const email = data.to?.[0]
    if (email) {
      await db
        .insert(emailSuppressions)
        .values({ email, reason: type, suppressedAt: new Date() })
        .onConflictDoNothing() // unique constraint on email — idempotent
      console.log(`Suppressed ${email} due to ${type}`)
    }
  }

  // Always return 200 for unhandled event types — Resend retries on non-2xx
  return new NextResponse("OK", { status: 200 })
}
