import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users, deliveryPreferences, deliveries } from '@/lib/db/schema'
import { ingestForUser } from '@/lib/ingestion'
import { enrichForUser } from '@/lib/ingestion/enrich'
import { generateBriefingForUser } from '@/lib/summarisation'
import { sendBriefingEmail } from '@/lib/email'
import type { BriefingTopicSection } from '@/emails/briefing-email'
import type { BriefingItem } from '@/lib/summarisation/types'

const MAX_RETRIES = 1
const ITEMS_PER_TOPIC = 5
const CATCH_UP_WINDOW_MS = 2 * 60 * 60 * 1000 // 2 hours

export interface DispatchResult {
  processed: number
  sent: number
  skipped: number
  failed: number
  errors: Array<{ userId: string; error: string }>
}

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

/**
 * Get the current date in the user's local timezone as "YYYY-MM-DD".
 * Uses en-CA locale which returns ISO 8601 format.
 * NEVER use new Date().toISOString().slice(0, 10) — that gives UTC date.
 */
function getUserLocalDate(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Check if a user is due for delivery right now.
 * Returns true if their scheduled time is within the catch-up window (0 to +2h past scheduled).
 *
 * Guard: Intl with hour12:false can return "24" for midnight in some environments.
 * Always normalise hour 24 → 0.
 */
function isUserDue(
  deliveryTime: string,
  timezone: string,
  now: Date,
  catchUpWindowMs = CATCH_UP_WINDOW_MS,
): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const rawHour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const currentHour = rawHour === 24 ? 0 : rawHour // midnight guard
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')!.value)
  const currentMinuteOfDay = currentHour * 60 + currentMinute

  const [targetHour, targetMinute] = deliveryTime.split(':').map(Number)
  const targetMinuteOfDay = targetHour * 60 + targetMinute

  const diffMs = (currentMinuteOfDay - targetMinuteOfDay) * 60 * 1000

  return diffMs >= 0 && diffMs <= catchUpWindowMs
}

/**
 * Format a Date as the user-facing date string for the email header.
 * e.g. "Wednesday, 4 March 2026"
 */
function formatDisplayDate(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)
}

// ---------------------------------------------------------------------------
// BriefingResult → BriefingTopicSection[] transformer
// ---------------------------------------------------------------------------

/**
 * Transform flat BriefingItem[] into grouped BriefingTopicSection[] for the email template.
 * - Groups by item.topic, preserving topic order from the source array
 * - Caps each topic to ITEMS_PER_TOPIC (5) items — already ranked by Phase 4
 * - Strips markdown bullet prefix "- " or "* " from summary text for clean email display
 * - Omits topics with zero items (empty after grouping)
 * - Uses sourceName as headline — article title is not carried through BriefingItem
 */
function buildTopicSections(items: BriefingItem[]): BriefingTopicSection[] {
  const seen = new Map<string, BriefingTopicSection>()

  for (const item of items) {
    if (!seen.has(item.topic)) {
      seen.set(item.topic, { topicName: item.topic, items: [] })
    }
    const section = seen.get(item.topic)!
    if (section.items.length >= ITEMS_PER_TOPIC) continue

    // Strip leading markdown bullet prefix ("- " or "* ") if present (from LLM output format)
    const cleanSummary = item.summary.replace(/^[-*]\s+/, '').trim()

    section.items.push({
      headline: item.sourceName, // Source name as headline — article title not in BriefingItem
      summary: cleanSummary,
      articleUrl: item.articleUrl,
      sourceName: item.sourceName,
    })
  }

  return Array.from(seen.values()).filter(s => s.items.length > 0)
}

// ---------------------------------------------------------------------------
// Per-user dispatch
// ---------------------------------------------------------------------------

async function dispatchForUser(
  userId: string,
  email: string,
  name: string | null,
  deliveryTime: string,
  timezone: string,
  now: Date,
): Promise<'sent' | 'skipped' | 'failed' | 'not_due'> {
  // 1. Is this user due right now?
  if (!isUserDue(deliveryTime, timezone, now)) {
    return 'not_due'
  }

  // 2. Compute date in user's local timezone (idempotency key)
  const deliveryDate = getUserLocalDate(timezone, now)

  // 3. Check deliveries table for an existing record today
  const existing = await db.query.deliveries.findFirst({
    where: and(
      eq(deliveries.userId, userId),
      eq(deliveries.deliveryDate, deliveryDate),
    ),
    columns: { id: true, status: true, retryCount: true },
  })

  if (existing) {
    if (existing.status === 'sent' || existing.status === 'skipped') {
      return 'skipped' // Already handled today
    }
    if (existing.status === 'failed' && (existing.retryCount ?? 0) >= MAX_RETRIES) {
      return 'skipped' // Exhausted retries — skip for the rest of the day
    }
    // status === 'failed' && retryCount < MAX_RETRIES → fall through to retry
  }

  // 4. Run pipeline: ingest → summarise
  const userName = name ?? email.split('@')[0]
  const displayDate = formatDisplayDate(now, timezone)

  try {
    await ingestForUser(userId)
    await enrichForUser(userId)
    const result = await generateBriefingForUser(userId)

    // 5. Zero-content day: record as skipped, do not send
    if (result.itemCount === 0) {
      await db
        .insert(deliveries)
        .values({
          userId,
          deliveryDate,
          status: 'skipped',
          scheduledFor: deliveryTime,
          failureReason: 'zero_content',
        })
        .onConflictDoNothing()

      console.log(
        JSON.stringify({
          event: 'dispatch_skipped',
          userId,
          reason: 'zero_content',
          deliveryDate,
          scheduledFor: deliveryTime,
        }),
      )
      return 'skipped'
    }

    // 6. Build topic sections and send email
    const topicSections = buildTopicSections(result.items)
    await sendBriefingEmail(email, userName, topicSections, displayDate)

    // 7. Record successful delivery (onConflictDoNothing handles concurrent cron race)
    await db
      .insert(deliveries)
      .values({
        userId,
        deliveryDate,
        status: 'sent',
        scheduledFor: deliveryTime,
        sentAt: new Date(),
        briefingId: result.briefingId,
      })
      .onConflictDoNothing()

    console.log(
      JSON.stringify({
        event: 'dispatch_sent',
        userId,
        deliveryDate,
        scheduledFor: deliveryTime,
        sentAt: new Date().toISOString(),
        itemCount: result.itemCount,
      }),
    )
    return 'sent'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const currentRetryCount = existing?.retryCount ?? 0
    const newRetryCount = existing ? currentRetryCount + 1 : 0

    if (existing) {
      // Update existing failed record: increment retryCount, update failureReason
      await db
        .update(deliveries)
        .set({ retryCount: newRetryCount, failureReason: message })
        .where(eq(deliveries.id, existing.id))
    } else {
      await db
        .insert(deliveries)
        .values({
          userId,
          deliveryDate,
          status: 'failed',
          scheduledFor: deliveryTime,
          failureReason: message,
          retryCount: 0,
        })
        .onConflictDoNothing()
    }

    console.error(
      JSON.stringify({
        event: 'dispatch_failed',
        userId,
        deliveryDate,
        scheduledFor: deliveryTime,
        error: message,
        retryCount: newRetryCount,
      }),
    )
    throw err // Re-throw so runDispatch() records it in result.errors
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Main entry point called by the cron route.
 * Queries all users with delivery preferences and dispatches to those who are due.
 * Serial processing — appropriate for beta scale (10-20 users).
 */
export async function runDispatch(now = new Date()): Promise<DispatchResult> {
  const result: DispatchResult = { processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] }

  // Query all users with delivery preferences (join users + deliveryPreferences)
  const usersWithPrefs = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      deliveryTime: deliveryPreferences.deliveryTime,
      timezone: deliveryPreferences.timezone,
    })
    .from(users)
    .innerJoin(deliveryPreferences, eq(users.id, deliveryPreferences.userId))
    .where(eq(users.onboardingComplete, true)) // Only dispatch to fully onboarded users

  console.log(
    JSON.stringify({
      event: 'cron_start',
      userCount: usersWithPrefs.length,
      timestamp: now.toISOString(),
    }),
  )

  for (const user of usersWithPrefs) {
    if (!user.email) continue // Guard: users.email is nullable in schema
    result.processed++

    try {
      const outcome = await dispatchForUser(
        user.userId,
        user.email,
        user.name,
        user.deliveryTime,
        user.timezone,
        now,
      )
      if (outcome === 'sent') result.sent++
      else if (outcome === 'skipped' || outcome === 'not_due') result.skipped++
    } catch (err) {
      result.failed++
      result.errors.push({
        userId: user.userId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  console.log(
    JSON.stringify({
      event: 'cron_complete',
      ...result,
      timestamp: new Date().toISOString(),
    }),
  )

  return result
}
