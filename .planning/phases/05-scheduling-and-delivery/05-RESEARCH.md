# Phase 5: Scheduling and Delivery - Research

**Researched:** 2026-03-04
**Domain:** Vercel Cron Jobs, timezone-aware scheduling, idempotent dispatch pipeline, react-email briefing templates, Drizzle ORM deliveries table
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Briefing email design**
- Subject line: `"Good morning, [Name] — your Brief is ready"` (personalised, warm)
- Body structure: named topic sections with headers (e.g., `## AI & Tech`), not one continuous narrative
- Each article entry: headline + 1–2 sentence summary + source link
- Email header: Brief logo/name + date, with a warm greeting
- Email footer: preferences link + one-click unsubscribe (legally required)
- Tone: warm but minimal — friendly greeting, then content, then out of the way
- Stories per topic: fixed cap (Claude's discretion on exact number, suggested 5)
- Empty topic section: omit entirely — no mention if no stories for that topic
- Zero-content day: skip sending entirely — no email if all topics are empty

**Scheduling precision & fan-out**
- Cron fires every 15 minutes; delivery window is ±15 min of user's chosen time
- Cron service: Vercel Cron Jobs (configured via `vercel.json`)
- Fan-out: process all ready users serially in one job (appropriate for beta scale)
- Pipeline timing: just-in-time — ingest + summarise immediately before each user's delivery
- Content lookback window: 24 hours of articles, regardless of user delivery time

**Failure & retry behavior**
- Per-user failure: retry once on the next cron tick (~15 min later)
- If retry also fails: log it, skip that user for the day — no email sent
- Infrastructure crash / cron missed: catch-up window of 2 hours — if scheduled delivery was within the past 2 hours, still run; beyond 2 hours, skip that day
- No automatic retries by Vercel — must be handled at application level

**Monitoring & observability**
- Logging: structured logs per cron run with user ID, status, scheduled time, sent_at
- Delivery history: `deliveries` table in database — columns: user, date, status, sent_at (also serves as the idempotency gate)
- Health check endpoint: `/api/health/scheduler` — returns last cron run timestamp and status, pingable from uptime monitors
- No admin dashboard in this phase (Phase 6 scope if needed)

### Claude's Discretion
- Exact email HTML/CSS styling and component structure (within warm-minimal tone direction)
- Vercel Cron schedule expression to achieve every-15-min firing
- Exact `deliveries` table schema and indexes
- Idempotency check implementation (query deliveries table before pipeline start)
- Structured log format and fields

### Deferred Ideas (OUT OF SCOPE)
- Admin dashboard showing pipeline run history — Phase 6 web app scope
- Email alerting to admin on delivery failures — not in scope for Phase 5
- Per-user retry configuration — future enhancement
- Scheduled backup / retention of old briefings — future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAIL-01 | User receives a daily HTML email briefing at their chosen delivery time | Vercel Cron every-15-min pattern, timezone conversion, idempotency via deliveries table, react-email BriefingEmail template, Resend send helper |
</phase_requirements>

---

## Summary

Phase 5 wires four previously built systems — ingestion (Phase 3), summarisation (Phase 4), email sending (Phase 2), and user preferences (Phase 1) — into a single automated daily dispatch pipeline. The entry point is a Vercel Cron Job that fires every 15 minutes and decides which users are due for delivery. The critical implementation details are: (1) the Vercel plan requirement (Hobby plan only permits daily cron jobs; Pro plan is required for every-15-minute cadence), (2) a correct timezone-aware "is this user due?" check using IANA timezone strings already stored in `deliveryPreferences.timezone`, and (3) a `deliveries` table that acts as both the idempotency gate and the audit log.

The pipeline per user is: idempotency check → ingest articles → generate briefing → render email → send via Resend → insert delivery record. The 2-hour catch-up window and one-retry-on-next-tick failure policy are baked into the scheduler logic, not into Vercel's infrastructure. Vercel does NOT retry failed cron invocations — all retry logic must be application-level.

**Primary recommendation:** Build `src/app/api/cron/dispatch/route.ts` as a Next.js App Router GET handler secured with `CRON_SECRET`, export `maxDuration = 300`, configure `*/15 * * * *` in `vercel.json`, and use the `deliveries` table as the idempotency gate with a composite unique constraint on `(userId, deliveryDate)`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel Cron Jobs | Platform | Fires HTTP GET to cron route on schedule | Already on Vercel; zero additional infrastructure |
| `@react-email/components` | ^1.0.8 (already installed) | Build briefing email HTML | Already used for verify-email and reset-password templates |
| `@react-email/render` | ^2.0.4 (already installed) | Render React email to HTML + plain text | Already used in email.ts |
| `resend` | ^6.9.3 (already installed) | Send email via Resend API | Already configured in email.ts with FROM_ADDRESS, suppression check, List-Unsubscribe headers |
| `drizzle-orm` | ^0.45.1 (already installed) | Insert/query deliveries table | Already used for all DB operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `Intl` (built-in) | Runtime | Convert HH:MM + IANA timezone to UTC delivery window | Pure built-in; no library needed for DST-aware timezone math |
| `drizzle-kit` | ^0.31.9 (already installed) | Generate and run DB migration for deliveries table | Adding deliveries table schema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Cron (every 15 min) | GitHub Actions, QStash | Vercel Cron is native, zero setup; QStash adds $; GitHub Actions is free but not integrated |
| Deliveries table for idempotency | Redis SET NX | DB table gives audit log + Phase 6 history; Redis would require key expiry management |
| Serial fan-out | Parallel per-user processing | Serial is simpler, avoids rate limit collisions, appropriate for beta (10–20 users) |

**Installation:** No new packages needed. All libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── api/
│       ├── cron/
│       │   └── dispatch/
│       │       └── route.ts          # Vercel cron handler — fires every 15 min
│       └── health/
│           └── scheduler/
│               └── route.ts          # Health check endpoint
├── emails/
│   └── briefing-email.tsx            # New: briefing HTML email template
└── lib/
    ├── dispatch.ts                   # Core dispatch logic: check readiness, run pipeline, record delivery
    └── db/
        └── schema.ts                 # Add: deliveries table
```

### Pattern 1: Vercel Cron Route Handler

**What:** A Next.js App Router GET handler at `/api/cron/dispatch` that Vercel calls every 15 minutes. Secured with `CRON_SECRET` Authorization header. Exports `maxDuration = 300` (5 minutes — Pro plan maximum with fluid compute default).

**When to use:** All scheduled work.

**vercel.json configuration:**
```json
// Source: https://vercel.com/docs/cron-jobs
{
  "crons": [
    {
      "path": "/api/cron/dispatch",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**CRITICAL: Vercel Pro plan is required.** The Hobby plan only allows daily cron jobs. The expression `*/15 * * * *` will cause a deployment failure on Hobby.
- Hobby: once per day max, ±59 min precision
- Pro: once per minute minimum, per-minute precision
- Cron timezone: always UTC (Vercel crons fire in UTC)

**Route handler pattern:**
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
// src/app/api/cron/dispatch/route.ts
import type { NextRequest } from 'next/server'

export const maxDuration = 300 // 5 minutes — Pro plan max with fluid compute

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Run dispatch pipeline
  const result = await runDispatch()
  return Response.json(result)
}
```

### Pattern 2: Timezone-Aware "Is User Due?" Check

**What:** Convert a user's `deliveryTime` (stored as `"HH:MM"` in their IANA timezone) to a UTC window and compare against `now`. Uses native `Intl.DateTimeFormat` — no library needed.

**When to use:** Every cron tick, for every user.

**Algorithm:**
```typescript
// No external library — pure Node.js Intl built-in
// DST-safe: Intl accounts for DST transitions automatically

function isUserDue(
  deliveryTime: string,       // "HH:MM" e.g. "08:00"
  timezone: string,           // IANA e.g. "Europe/London"
  now: Date,
  catchUpWindowMs = 2 * 60 * 60 * 1000  // 2 hours
): boolean {
  // Get what time it currently is in the user's timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const currentHour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')!.value)
  const currentMinuteOfDay = currentHour * 60 + currentMinute

  const [targetHour, targetMinute] = deliveryTime.split(':').map(Number)
  const targetMinuteOfDay = targetHour * 60 + targetMinute

  const diffMs = (currentMinuteOfDay - targetMinuteOfDay) * 60 * 1000

  // Within catch-up window (0 to +2 hours past scheduled time)
  return diffMs >= 0 && diffMs <= catchUpWindowMs
}
```

**Important nuance:** `formatToParts` with `hour12: false` can return hour as `"24"` for midnight in some locales. Guard against this: `hour === 24 ? 0 : hour`.

### Pattern 3: Idempotency via deliveries table

**What:** Before running the pipeline for a user, check if a delivery record exists for `(userId, deliveryDate)`. After successful send, insert the record. The unique constraint prevents double-insert races.

**deliveries table schema:**
```typescript
// Add to src/lib/db/schema.ts
export const deliveries = pgTable(
  'deliveries',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deliveryDate: text('delivery_date').notNull(),  // "YYYY-MM-DD" in user's local timezone
    status: text('status').notNull(),               // "sent" | "skipped" | "failed"
    scheduledFor: text('scheduled_for').notNull(),  // "HH:MM" user's chosen time
    sentAt: timestamp('sent_at'),                   // null until successfully sent
    briefingId: text('briefing_id')
      .references(() => briefings.id, { onDelete: 'set null' }),
    failureReason: text('failure_reason'),          // error message if status="failed"
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userDateUnique: unique().on(table.userId, table.deliveryDate),
  })
)
```

**Idempotency check pattern:**
```typescript
// Source: drizzle-orm docs — https://orm.drizzle.team/docs/insert
// Check before pipeline start
const existing = await db.query.deliveries.findFirst({
  where: and(
    eq(deliveries.userId, userId),
    eq(deliveries.deliveryDate, deliveryDate)
  ),
  columns: { id: true, status: true },
})

if (existing) {
  // Already delivered (or failed today) — skip
  return { skipped: true, reason: 'already_delivered' }
}

// After successful send — insert delivery record
// onConflictDoNothing handles the race condition where two concurrent
// cron invocations both pass the check above simultaneously
await db.insert(deliveries)
  .values({ userId, deliveryDate, status: 'sent', sentAt: new Date(), briefingId, scheduledFor })
  .onConflictDoNothing()
```

**deliveryDate should be the date in the USER's local timezone**, not UTC. Use `Intl.DateTimeFormat` to get `YYYY-MM-DD` in the user's timezone.

### Pattern 4: Retry-on-Next-Tick Logic

**What:** Track delivery attempts in a retry state. On failure, insert a `status: "failed"` record. On the next cron tick, check if a failed record exists and attempt once more. After the second failure, leave `status: "failed"` — no more retries that day.

**What:** Since the `deliveries` table unique constraint is on `(userId, deliveryDate)`, use a separate approach: check for a failed delivery from today and whether it has been retried. Add a `retryCount` integer column (default 0).

**Simplified retry pattern:**
```typescript
// deliveries table: add retryCount integer column
// On failure (first attempt): upsert with status="failed", retryCount=0
// On next tick: if status="failed" AND retryCount=0 → retry, set retryCount=1
// On second failure: status="failed", retryCount=1 → stop
const maxRetries = 1

if (existing?.status === 'failed' && (existing.retryCount ?? 0) < maxRetries) {
  // Retry this user
  await runPipelineForUser(userId)
} else if (existing) {
  return { skipped: true }
}
```

### Pattern 5: Briefing Email Template

**What:** A react-email component using the same HTML/Body/Container/Section/Heading/Text/Hr/Link components already established in the project.

**Structure:**
```typescript
// src/emails/briefing-email.tsx
import {
  Html, Head, Body, Container, Heading, Text, Hr, Link, Section
} from "@react-email/components"

interface BriefingEmailProps {
  userName: string
  date: string                    // e.g. "Wednesday, 4 March 2026"
  topics: BriefingTopicSection[]  // [{topicName, items: [{headline, summary, sourceUrl, sourceName}]}]
  preferencesUrl: string
  unsubscribeUrl: string
}

// Topic items cap: 5 per topic (as discussed — "suggested 5")
// Empty topics: not rendered (filtered before passing to template)
```

**Plain text must be rendered alongside HTML** — already handled by `@react-email/render` with `{ plainText: true }`. This is legally required (MAIL-04 — already complete from Phase 2).

### Anti-Patterns to Avoid

- **Using Hobby plan for every-15-min cron:** Deployment will fail with "Hobby accounts are limited to daily cron jobs." Must be on Pro plan.
- **Computing deliveryDate in UTC:** A user in Tokyo at 23:50 local time whose date is "tomorrow" UTC would have the wrong `deliveryDate`. Always compute date in the user's IANA timezone.
- **Retrying by catching exceptions inside the cron handler:** Vercel does NOT retry failed cron invocations at the platform level. All retry logic is application-level on the next tick.
- **Omitting `onConflictDoNothing` on delivery insert:** Without it, a race between two concurrent cron executions (Vercel warns this can happen) would cause a DB unique constraint error that surfaces as an unhandled exception.
- **Setting `hour12: true` in Intl.DateTimeFormat for time math:** Use `hour12: false` to get 0-23 hours; `hour12: true` gives 1-12 which breaks midnight/noon comparisons.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DST-safe timezone conversion | Custom UTC offset math | `Intl.DateTimeFormat` built-in | DST transitions, half-hour offsets (India +5:30, Nepal +5:45), historical tz data — all handled by the browser/Node.js tz database |
| Email HTML rendering | Manual string templates | `@react-email/render` | Email client compat, inline styles, plain text extraction — already installed |
| Idempotency key generation | UUID + Redis | `deliveries` table with unique constraint | Already have Drizzle + Neon; table doubles as audit log for Phase 6 |
| Concurrent execution locking | Redis distributed lock | `onConflictDoNothing` + unique constraint | For beta scale (serial processing), unique constraint prevents double-delivery without Redis overhead |

**Key insight:** The entire scheduling stack exists in the project already — Vercel platform, Drizzle ORM, Resend, react-email. Phase 5 is integration and orchestration, not new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Vercel Hobby Plan Blocks Sub-Daily Crons

**What goes wrong:** Deploying `vercel.json` with `"schedule": "*/15 * * * *"` on a Hobby plan causes a hard deployment failure: "Hobby accounts are limited to daily cron jobs."

**Why it happens:** Vercel enforces plan limits at deploy time, not at runtime. The deployment fails before the code runs.

**How to avoid:** Confirm the Vercel project is on a Pro plan before writing vercel.json. Pro plan minimum interval is once per minute; scheduling precision is per-minute (not ±59 min like Hobby).

**Warning signs:** Deployment error message mentioning cron frequency limits.

### Pitfall 2: deliveryDate Computed in UTC Instead of User's Timezone

**What goes wrong:** A user in UTC+9 (Tokyo) scheduled for 07:00 local time. The cron fires at 22:00 UTC (= 07:00 JST). The current UTC date is "yesterday" relative to the user's local date. If `deliveryDate` is computed as UTC date, the delivery record uses the wrong date, and the next day the user gets two emails (no idempotency match).

**Why it happens:** `new Date().toISOString().slice(0, 10)` gives the UTC date, not the user's local date.

**How to avoid:** Always compute `deliveryDate` in the user's IANA timezone:
```typescript
function getUserLocalDate(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now)  // Returns "YYYY-MM-DD" (en-CA locale uses ISO format)
}
```

**Warning signs:** Users in UTC-positive timezones receiving duplicate emails on some days.

### Pitfall 3: Vercel Cron Duplicate Invocations

**What goes wrong:** Vercel's documentation explicitly states: "Vercel's event-driven system can occasionally deliver the same cron event more than once." Two invocations of the cron handler run simultaneously for the same tick.

**Why it happens:** At-least-once delivery semantics in distributed systems.

**How to avoid:** The `deliveries` table unique constraint on `(userId, deliveryDate)` combined with `.onConflictDoNothing()` on insert is the correct defense. Both invocations will attempt to insert the delivery record; exactly one will succeed. The one that fails the insert knows the other already completed it.

**Warning signs:** Duplicate emails. Investigate by checking `deliveries` table for duplicate `(userId, deliveryDate)` rows (there should be none due to unique constraint).

### Pitfall 4: cron Handler Timeout

**What goes wrong:** With serial fan-out across many users, the cron handler runs too long and Vercel terminates it after `maxDuration`.

**Why it happens:** Default `maxDuration` with fluid compute enabled is 300s. Each user runs ingest (3–4 external API calls, ~5–10s) + summarise (Gemini calls, ~3–5s) + email send (~1s). At ~15s per user, 300s supports ~20 users safely.

**How to avoid:** For beta (10–20 users), `maxDuration = 300` is sufficient. Export explicitly in the route handler. If scale grows, move to parallel fan-out or wave-based processing before timeout becomes a problem.

**Warning signs:** Vercel logs showing "Function timeout" during cron execution; some users consistently not receiving emails.

### Pitfall 5: `isSuppressed` Check Missing for Briefing Email

**What goes wrong:** The `sendBriefingEmail` helper (to be written in Phase 5) omits the `isSuppressed(email)` check that the existing `sendVerificationEmail` and `sendPasswordResetEmail` helpers do. An unsubscribed user receives a briefing.

**Why it happens:** Copy-paste omission when writing the new send helper.

**How to avoid:** Follow the existing pattern in `email.ts` exactly — always call `await isSuppressed(email)` and return early if true.

**Warning signs:** Complaints about emails from unsubscribed users; suppression list not being respected.

### Pitfall 6: Zero-Content Day Silently Fails

**What goes wrong:** All topics return empty after ingestion. The briefing is not sent (correct per decision). But no delivery record is inserted, so the next cron tick retries — and the next, and the next — until the 2-hour catch-up window expires. This causes unnecessary pipeline runs on zero-content days.

**How to avoid:** Insert a `status: "skipped"` delivery record when skipping a zero-content day. This prevents re-runs and provides a clear audit trail.

---

## Code Examples

### vercel.json (complete)
```json
// Source: https://vercel.com/docs/cron-jobs
{
  "crons": [
    {
      "path": "/api/cron/dispatch",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Cron route handler skeleton
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
// src/app/api/cron/dispatch/route.ts
import type { NextRequest } from 'next/server'
import { runDispatch } from '@/lib/dispatch'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startedAt = new Date().toISOString()
  try {
    const result = await runDispatch()
    console.log(JSON.stringify({ event: 'cron_complete', startedAt, ...result }))
    return Response.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(JSON.stringify({ event: 'cron_error', startedAt, error: message }))
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
```

### Health check endpoint
```typescript
// src/app/api/health/scheduler/route.ts
import { db } from '@/lib/db/client'
import { deliveries } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  const latest = await db.query.deliveries.findFirst({
    orderBy: [desc(deliveries.createdAt)],
    columns: { createdAt: true, status: true },
  })

  return Response.json({
    lastRun: latest?.createdAt ?? null,
    lastStatus: latest?.status ?? null,
    timestamp: new Date().toISOString(),
  })
}
```

### BriefingEmail component (structure)
```typescript
// Source: existing email.ts + @react-email/components docs
// src/emails/briefing-email.tsx
import {
  Html, Head, Body, Container, Heading, Text, Hr, Link, Section
} from "@react-email/components"

interface BriefingTopicSection {
  topicName: string
  items: Array<{
    headline: string
    summary: string       // 1–2 sentences
    articleUrl: string
    sourceName: string
  }>
}

interface BriefingEmailProps {
  userName: string
  date: string            // "Wednesday, 4 March 2026"
  topics: BriefingTopicSection[]   // pre-filtered: empty topics already excluded
  preferencesUrl: string
  unsubscribeUrl: string
}

// Style constants matching existing templates
const containerStyle = {
  maxWidth: "560px", margin: "40px auto",
  padding: "24px", backgroundColor: "#ffffff", borderRadius: "8px"
}
const bodyStyle = {
  fontFamily: "sans-serif", backgroundColor: "#f9f9f9", margin: 0, padding: 0
}

export function BriefingEmail({ userName, date, topics, preferencesUrl, unsubscribeUrl }: BriefingEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Heading style={{ fontSize: "22px", fontWeight: "700", color: "#111111" }}>
            Brief
          </Heading>
          <Text style={{ fontSize: "15px", color: "#444444", marginBottom: "4px" }}>
            {date}
          </Text>
          <Text style={{ fontSize: "15px", color: "#444444", marginBottom: "24px" }}>
            Good morning, {userName} — your Brief is ready.
          </Text>
          <Hr style={{ borderColor: "#eeeeee", marginBottom: "24px" }} />

          {/* Topic sections */}
          {topics.map((section) => (
            <Section key={section.topicName}>
              <Heading as="h2" style={{ fontSize: "16px", color: "#111111" }}>
                {section.topicName}
              </Heading>
              {section.items.map((item, i) => (
                <Section key={i}>
                  <Text style={{ fontWeight: "600", color: "#111111", margin: "0 0 2px" }}>
                    <Link href={item.articleUrl} style={{ color: "#111111" }}>
                      {item.headline}
                    </Link>
                  </Text>
                  <Text style={{ color: "#444444", margin: "0 0 2px" }}>
                    {item.summary}
                  </Text>
                  <Text style={{ fontSize: "12px", color: "#999999", margin: "0 0 16px" }}>
                    {item.sourceName}
                  </Text>
                </Section>
              ))}
              <Hr style={{ borderColor: "#eeeeee", margin: "16px 0" }} />
            </Section>
          ))}

          {/* Footer */}
          <Text style={{ fontSize: "12px", color: "#999999" }}>
            <Link href={preferencesUrl} style={{ color: "#999999" }}>Preferences</Link>
            {" · "}
            <Link href={unsubscribeUrl} style={{ color: "#999999" }}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BriefingEmail
```

### sendBriefingEmail helper (to add to email.ts)
```typescript
// Following existing pattern in email.ts exactly
export async function sendBriefingEmail(
  email: string,
  userName: string,
  topics: BriefingTopicSection[],
  date: string,
): Promise<void> {
  if (await isSuppressed(email)) return  // MUST include — matches existing pattern

  const token = generateUnsubscribeToken(email)
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${token}`
  const preferencesUrl = `${APP_URL}/dashboard/settings`

  const html = await render(BriefingEmail({ userName, date, topics, preferencesUrl, unsubscribeUrl }))
  const text = await render(BriefingEmail({ userName, date, topics, preferencesUrl, unsubscribeUrl }), { plainText: true })

  await resend.emails.send({
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
}
```

### dispatch.ts core logic (outline)
```typescript
// src/lib/dispatch.ts
// Query all users with delivery preferences
// For each user:
//   1. Compute user's local date and time
//   2. Check isUserDue(deliveryTime, timezone, now, catchUpWindow=2hr)
//   3. If not due: skip
//   4. Check deliveries table for (userId, localDate)
//      - If status="sent": skip (already delivered)
//      - If status="failed" and retryCount >= 1: skip (exhausted retries)
//      - If status="failed" and retryCount === 0: retry
//      - If no record: first attempt
//   5. Run: ingestForUser → generateBriefingForUser
//   6. If briefing has 0 items: insert status="skipped", continue
//   7. Convert BriefingResult to BriefingTopicSection[] (cap 5 items per topic)
//   8. Send email via sendBriefingEmail
//   9. Insert deliveries row: status="sent", sentAt=now, briefingId
//   10. Log structured JSON: { userId, status, scheduledFor, sentAt }
//
// On per-user exception:
//   - Upsert deliveries: status="failed", increment retryCount, failureReason=err.message
//   - Log error, continue to next user
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| QStash stage-chaining (researched in STATE.md as LOW confidence) | Simple serial dispatch in Vercel Cron handler | Decision made in CONTEXT.md | Eliminates QStash dependency and cost; sufficient for beta scale |
| Moment.js for timezone math | Native `Intl.DateTimeFormat` | ~2020 (Intl became ubiquitous) | No library needed; DST-aware; runs in Node.js serverless without extra bundle |
| Cron on Hobby plan | Pro plan required for sub-daily | Always | Non-negotiable: Hobby is daily-only |

**Note from STATE.md:** "QStash stage-chaining API specifics have LOW confidence — read current Upstash docs before Phase 5 planning." — Research confirms QStash is NOT needed for this phase. The CONTEXT.md decision to use serial Vercel Cron dispatch eliminates this concern entirely.

---

## Open Questions

1. **Vercel Plan Status**
   - What we know: Pro plan is required for every-15-minute cron jobs
   - What's unclear: Whether the project is currently on Hobby or Pro
   - Recommendation: Verify in Vercel dashboard before implementing `vercel.json`. If on Hobby, upgrade before deploying Phase 5.

2. **`FROM_ADDRESS` Production Readiness**
   - What we know: `email.ts` currently has `FROM_ADDRESS = "Brief <onboarding@resend.dev>"` with a TODO comment saying to switch to `noreply@mail.brief.app` once DNS is verified. STATE.md records Phase 2 DNS as verified live.
   - What's unclear: Whether Resend has been updated to approve the domain and the FROM_ADDRESS updated after Phase 2 completion.
   - Recommendation: Wave 0 task: update `FROM_ADDRESS` in `email.ts` to `"Brief <noreply@mail.brief.app>"` before sending briefing emails.

3. **`BriefingResult` to `BriefingTopicSection[]` mapping**
   - What we know: `generateBriefingForUser` returns `BriefingResult` with a flat `items: BriefingItem[]` array where each item has a `topic` string. The briefing email needs items grouped by topic, ordered by topic list order.
   - What's unclear: Whether items per topic should be sliced to 5 before or after ranking (they're already ranked by Phase 4 `rankArticles`).
   - Recommendation: Group `BriefingResult.items` by `topic` preserving existing order (Phase 4 already ranked), then slice to max 5 per topic. This is a transformation step in `dispatch.ts`.

---

## Sources

### Primary (HIGH confidence)
- [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) — cron expression format, UTC timezone, how Vercel invokes via HTTP GET
- [Vercel Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — CRON_SECRET pattern, maxDuration, concurrent execution, idempotency guidance, "no retry on failure"
- [Vercel Cron Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby=daily only, Pro=per-minute minimum
- [Vercel Function Max Duration](https://vercel.com/docs/functions/configuring-functions/duration) — `export const maxDuration = N` in Next.js App Router; 300s default with fluid compute
- Project source code: `src/lib/db/schema.ts`, `src/lib/email.ts`, `src/lib/summarisation/index.ts`, `src/lib/ingestion/index.ts` — existing patterns to follow

### Secondary (MEDIUM confidence)
- [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat) — `formatToParts`, `timeZone` IANA support, `hour12: false`
- [Drizzle ORM Insert docs](https://orm.drizzle.team/docs/insert) — `onConflictDoNothing()` behavior (returns empty array on conflict — idempotency implication confirmed)

### Tertiary (LOW confidence)
- None. All claims verified against official Vercel and project source documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; Vercel Cron API verified from official docs
- Architecture: HIGH — patterns derived from existing project code and official Vercel docs
- Pitfalls: HIGH — timezone pitfall and Hobby plan limit verified from official docs; duplicate invocation documented in Vercel's own managing cron jobs page
- Timezone math: HIGH — native Intl.DateTimeFormat is well-documented on MDN

**Research date:** 2026-03-04
**Valid until:** 2026-06-04 (Vercel platform docs are stable; react-email components stable)
