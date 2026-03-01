import { NextRequest, NextResponse } from "next/server"
import { validateUnsubscribeToken } from "@/lib/email"
import { db } from "@/lib/db/client"
import { emailSuppressions } from "@/lib/db/schema"

const APP_URL = process.env.APP_URL ?? "https://brief.app"

async function suppressEmail(email: string): Promise<void> {
  await db
    .insert(emailSuppressions)
    .values({ email, reason: "unsubscribe", suppressedAt: new Date() })
    .onConflictDoNothing()
}

// POST — RFC 8058 one-click (email client fires automatically, no user interaction)
// Must return 200 or 202 with empty or minimal body per RFC 8058 §3.
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return new NextResponse("Missing token", { status: 400 })

  const result = validateUnsubscribeToken(token)
  if (!result) return new NextResponse("Invalid or expired token", { status: 400 })

  await suppressEmail(result.email)
  return new NextResponse(null, { status: 200 })
}

// GET — browser link click; suppress then redirect to confirmation page
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/", APP_URL))
  }

  const result = validateUnsubscribeToken(token)
  if (!result) {
    // Invalid/expired token — redirect home silently (don't leak token state)
    return NextResponse.redirect(new URL("/", APP_URL))
  }

  await suppressEmail(result.email)
  return NextResponse.redirect(
    new URL(`/unsubscribed?email=${encodeURIComponent(result.email)}`, APP_URL)
  )
}
