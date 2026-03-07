# Phase 7: Beta Polish - Research

**Researched:** 2026-03-07
**Domain:** QA / observability / email client testing / AI audit / legal compliance
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Observability setup**
- Vercel logs + console only — no third-party service (Sentry, Datadog) for beta
- Daily briefing count metric: a database query or admin script (no UI), run on demand
- All four pipeline stages require explicit error capture:
  - Content ingestion (per-feed failures)
  - AI summarisation (Claude API errors, timeouts, malformed responses)
  - Email delivery (Resend rejections, unhandled bounces)
  - Scheduling/cron (job didn't run, crashed mid-execution)
- Error log format: structured JSON to console `{ stage, userId, error, timestamp }` — captured by Vercel

**Email client testing**
- Testing tool: Mail Tester (free tier)
- Must-pass clients (all four are blocking):
  - Gmail (web)
  - Apple Mail (macOS/iOS)
  - Outlook (desktop)
  - Gmail mobile app
- Pass bar: visual output closely matches the React Email template design intent
- Dark mode: out of scope for beta — light mode only

**AI audit process**
- Sample size: 10+ briefings across different topic types
- Process: generate a side-by-side comparison document — each AI claim alongside its source article
- Acceptance criteria: zero fabricated facts — every specific claim (names, numbers, events) must be traceable to source articles
- If hallucination found: blocking — fix the summarisation prompt and re-audit 10+ briefings before beta proceeds

**Beta readiness gate**
- A formal written checklist (BETA-CHECKLIST.md in .planning/) must be fully completed before any beta user is onboarded
- All four items are hard blockers — beta cannot launch until all pass:
  1. Unsubscribe flow verified end-to-end (legal compliance)
  2. AI audit passed with zero fabricated facts
  3. Email renders correctly (matches design spec) in all 4 clients
  4. All pipeline error stages produce structured logs
- First beta user: dogfooding only (developer self-testing) — no external users until self-validation is complete

### Claude's Discretion
- Exact admin script / query implementation for briefing count metric
- How to generate the AI audit comparison document (tooling, format)
- Mail Tester submission process and what to do with the spam score portion of results

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 7 is a cross-cutting quality gate with zero new feature code. Every task is either: adding structured error logging to an existing pipeline stage that currently lacks it, writing/running a verification checklist item, or hardening behavior that was built in phases 1-6 but not yet exercised end-to-end. No new libraries are needed for any of the four gate criteria.

The observability audit reveals one critical gap: the current `dispatch.ts` and `ingestForUser` already emit structured JSON logs for dispatch-level events, but the ingestion sources (`rss.ts`, `guardian.ts`, `newsdata.ts`) swallow per-feed errors into a result object without console output. Similarly, the summarisation pipeline emits `console.error` with a non-structured message. Both must be upgraded to structured JSON before the gate can pass. The email delivery stage (`sendBriefingEmail`) propagates Resend errors as thrown exceptions, which are caught and logged by dispatch — adequate, but the format should be verified.

**Primary recommendation:** Work through four verifiable work streams in sequence — (1) structured log audit and patch, (2) unsubscribe E2E verification, (3) email client testing via Mail Tester, (4) AI hallucination audit — then produce BETA-CHECKLIST.md capturing pass evidence for each.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tsx` | (existing via package.json) | Run TypeScript scripts without compile step | Already used for `scripts/generate-briefing.ts` |
| `drizzle-orm` | `^0.45.1` | Admin DB queries for briefing count metric | Already in project |
| `@react-email/render` | `^2.0.4` | Render briefing email HTML for Mail Tester submission | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv/config` | (transitive) | Load `.env.local` in admin scripts | Used in `generate-briefing.ts` pattern |
| `Mail Tester` | (web service) | Spam score + client rendering test | One-off manual verification |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mail Tester (free) | Litmus ($99/mo) | Litmus gives automated multi-client screenshots; overkill for single-developer beta gate |
| Manual AI audit doc | Automated LLM eval harness | Automated eval adds tooling complexity; 10-sample manual review is sufficient for pre-beta |

**Installation:** No new packages needed — all tooling is already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

No new source directories needed. Additions are:

```
scripts/
├── generate-briefing.ts          # existing — used for AI audit
├── briefing-count.ts             # NEW — daily metric admin query
└── audit-briefing.ts             # NEW — AI audit comparison doc generator
.planning/
└── BETA-CHECKLIST.md             # NEW — formal gate document
```

### Pattern 1: Structured JSON Console Logging

**What:** Every pipeline stage error emitted via `console.error(JSON.stringify({ stage, userId, error, timestamp }))` to standard output, captured by Vercel's log drain.

**When to use:** Any catch block in the four pipeline stages.

**Current state audit:**

```
Stage                    | Current log behavior              | Meets standard?
-------------------------|-----------------------------------|----------------
dispatch.ts (scheduler)  | JSON via console.error ✓          | YES
dispatchForUser catch    | JSON via console.error ✓          | YES
ingestForUser sources    | Pushes to result.errors array,    | NO — must add
                         | no console output                 | console.error
summarisation index.ts   | console.error(raw string) for     | NO — needs JSON
                         | topic failures                    | structured format
sendBriefingEmail         | throws — caught by dispatch       | YES (via dispatch)
GitHub Actions cron      | curl exit code only               | YES (sufficient)
```

**Example — correct pattern (from `dispatch.ts`):**
```typescript
// Source: /src/lib/dispatch.ts (existing)
console.error(
  JSON.stringify({
    event: 'dispatch_failed',
    userId,
    deliveryDate,
    error: message,
    retryCount: newRetryCount,
  }),
)
```

**Pattern to add in `ingestForUser` (src/lib/ingestion/index.ts):**
```typescript
// Source: to be added in Phase 7
function recordError(source: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(
    JSON.stringify({
      stage: 'ingestion',
      source,
      userId,
      error: message,
      timestamp: new Date().toISOString(),
    })
  )
  result.errors.push({ source, message, timestamp: new Date().toISOString() })
}
```

**Pattern to upgrade in summarisation (src/lib/summarisation/index.ts):**
```typescript
// Replace console.error(`[summarisation] Topic "${topic}" failed:`, err)
console.error(
  JSON.stringify({
    stage: 'summarisation',
    userId,
    topic,
    error: err instanceof Error ? err.message : String(err),
    timestamp: new Date().toISOString(),
  })
)
```

### Pattern 2: Unsubscribe Flow Verification Script

**What:** End-to-end trace from link click (GET /api/unsubscribe?token=...) through `emailSuppressions` table insert, to confirmed suppression (no further sends).

**Existing implementation:**
- `/src/app/api/unsubscribe/route.ts` — GET handler calls `suppressEmail()` then redirects to `/unsubscribed?email=...`
- `suppressEmail` uses `onConflictDoNothing` — idempotent
- `sendBriefingEmail` calls `isSuppressed(email)` before every send

**Verification steps (manual, documented in checklist):**
1. Generate a valid token: `generateUnsubscribeToken(email)` from `src/lib/email.ts`
2. Paste the URL into a browser — confirm redirect to `/unsubscribed` page
3. Check `emailSuppressions` table: `SELECT * FROM email_suppressions WHERE email = '...'`
4. Trigger `runDispatch()` for that user — confirm `dispatch_skipped` event logged with `isSuppressed` path

**Note:** The unsubscribed page at `/unsubscribed` does not appear to exist in `src/app/`. The redirect target is `APP_URL/unsubscribed?email=...`. This page must either exist or the redirect must be updated before the flow can be called "complete." This is a gap to investigate during planning.

### Pattern 3: Mail Tester Submission Process

**What:** Send the actual rendered briefing HTML to Mail Tester's unique inbox address, then review spam score and client rendering.

**Process:**
1. Navigate to mail-tester.com — get a unique `test-[hash]@mail-tester.com` address
2. Temporarily add that address as recipient in a test dispatch call
3. Send one real briefing email (via `sendBriefingEmail`) to that address
4. Visit the Mail Tester results URL — check spam score (aim >= 9/10) and rendering previews
5. The spam score portion is informational only (per locked decision — rendering match is the pass criterion)

**Key consideration:** Mail Tester renders Gmail web but not native Outlook desktop. For Outlook desktop, a separate Outlook client test (send to a real Outlook account) is required. The locked decision lists Outlook (desktop) as a required client.

### Pattern 4: AI Audit Comparison Document

**What:** A Markdown file with each AI-generated bullet alongside the `sourceSnapshot` stored in `briefingItems.sourceSnapshot`.

**Data source:** `briefingItems.sourceSnapshot` — the exact article text sent to the LLM — was designed specifically for this audit (`[04-01]: sourceSnapshot on briefingItems stores exact LLM input text per article — enables Phase 6 grounding audits`).

**Admin script pattern (Claude's discretion):**
```typescript
// scripts/audit-briefing.ts
// Usage: npx tsx scripts/audit-briefing.ts <briefingId>
import 'dotenv/config'
import { db } from '../src/lib/db/client'
import { briefingItems, articles } from '../src/lib/db/schema'
import { eq } from 'drizzle-orm'

const briefingId = process.argv[2]
// Query briefingItems + join articles for sourceUrl
// For each item: print summary, then sourceSnapshot, then article URL
// Output as Markdown: ## Topic / ### Claim / Source text / [verify link]
```

**Output format recommendation:** Markdown file per briefing with collapsible sections:
```markdown
## Topic: Formula 1

### Item 1
**AI claim:** Hamilton confirmed deal with Ferrari for 2026 season
**Source snapshot excerpt:** "Lewis Hamilton will join Ferrari for the 2026 Formula 1 season..."
**Article URL:** https://...
**Verdict:** [ ] PASS / [ ] FAIL
```

### Pattern 5: Briefing Count Admin Script

**What:** A database query reporting total briefings sent by day.

**Recommended implementation (Claude's discretion):**
```typescript
// scripts/briefing-count.ts
// Usage: npx tsx scripts/briefing-count.ts [--days 7]
import 'dotenv/config'
import { db } from '../src/lib/db/client'
import { deliveries } from '../src/lib/db/schema'
import { eq, gte, sql } from 'drizzle-orm'

// SELECT delivery_date, COUNT(*) as sent_count
// FROM deliveries WHERE status = 'sent'
// GROUP BY delivery_date ORDER BY delivery_date DESC
// LIMIT [days]
```

### Anti-Patterns to Avoid

- **Testing email rendering by eyeball in browser only:** React Email preview != actual email client rendering. Use Mail Tester to send a real email.
- **Considering the audit complete with < 10 samples:** The locked decision specifies 10+ briefings across different topic types. A single topic provides insufficient coverage of LLM behavior variance.
- **Treating `result.errors` array as observability:** The ingestion `result.errors` array is an in-memory return value for the caller, not a log. Vercel only captures console output.
- **Skipping the unsubscribed page check:** The unsubscribe route redirects to `/unsubscribed` — if that page returns a 404, the flow is broken even though the suppression DB insert succeeds.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spam score measurement | Custom SMTP header checker | Mail Tester | Mail Tester covers SPF/DKIM/DMARC/content scoring without infra work |
| LLM output evaluation | Custom hallucination detector | Manual audit with `sourceSnapshot` | `sourceSnapshot` was designed for this — already in DB |
| Email client screenshots | Custom headless browser farm | Manual send to real accounts | Automated rendering is Litmus territory; beta only needs 4 clients |
| Structured log aggregation | Log parsing pipeline | Vercel log drain (built-in) | Vercel captures all `console.*` output; searchable in dashboard |

**Key insight:** Every audit tool needed for this phase is either already in the project (`sourceSnapshot`, dispatch logs) or freely available (Mail Tester). No new infrastructure is required.

---

## Common Pitfalls

### Pitfall 1: Missing `unsubscribed` Page

**What goes wrong:** The unsubscribe GET handler in `/src/app/api/unsubscribe/route.ts` redirects to `${APP_URL}/unsubscribed?email=...`. If this page doesn't exist, users clicking the unsubscribe link land on a 404. The DB suppression still succeeds, but the flow is not "verified end-to-end" as required by the gate criterion.

**Why it happens:** The redirect was written in Phase 2 with a forward reference to a UI page. Checking `src/app/` shows no `unsubscribed/` directory currently exists.

**How to avoid:** Verify or create `src/app/unsubscribed/page.tsx` as part of the unsubscribe flow verification task.

**Warning signs:** Navigate to `APP_URL/unsubscribed` manually — if it returns 404 or redirects to homepage, the page is missing.

### Pitfall 2: Ingestion Errors Not Reaching Vercel Logs

**What goes wrong:** `ingestForUser` collects errors in a `result.errors` array (returned to the caller) but does not emit `console.error`. This means per-feed failures (e.g., a dead RSS URL) are invisible in Vercel logs. The gate criterion requires pipeline failures to be logged.

**Why it happens:** The ingestion module was built to return structured results to the scheduler, but the scheduler only logs the dispatch-level summary, not per-feed detail.

**How to avoid:** Add `console.error(JSON.stringify(...))` inside the ingestion `recordError` helper during the structured log audit task.

**Warning signs:** Inject a bad RSS feed URL, check Vercel logs — if no error log appears for that feed, the fix is needed.

### Pitfall 3: Feed Failure Test Needs a Real Bad URL

**What goes wrong:** Gate criterion 3 requires "injecting a permanently-failing feed URL into the pipeline confirms the pipeline continues and the failure is logged." A URL that merely times out is unreliable as a test — it may pass on fast networks. A URL that reliably 404s (e.g., `https://httpstat.us/404`) is more deterministic.

**Why it happens:** Testing failure paths requires deliberate injection of known-bad inputs.

**How to avoid:** Use `https://httpstat.us/404` or a similar utility URL as the injected bad feed. Alternatively, temporarily add a clearly nonexistent domain.

### Pitfall 4: Mail Tester Score < 9 on First Send

**What goes wrong:** Mail Tester may flag the briefing email with score warnings for content-based spam signals (e.g., all-uppercase topic headings, excessive links).

**Why it happens:** Transactional emails from new domains are scrutinized. The `BriefingEmail` template uses `textTransform: "uppercase"` for topic headings.

**How to avoid:** Review Mail Tester's breakdown. If score is low due to content (not infrastructure), evaluate whether the template needs adjustment. SPF/DKIM/DMARC are already configured for `briefnews.online` — infrastructure issues should not appear.

### Pitfall 5: `sourceSnapshot` Is Empty String on Cache Hits

**What goes wrong:** `briefingItems.sourceSnapshot` is `''` (empty string) when the article summary was served from Upstash Redis cache (`[04-02]: sourceSnapshot is empty string on cache hit — avoids re-reading article text`). For the AI audit, empty snapshots cannot be used to verify claims.

**Why it happens:** The design tradeoff: once a summary is cached, the original text is not re-read. This is correct for production but breaks the audit.

**How to avoid:** The audit script should filter `WHERE from_cache = false` to select only items with real `sourceSnapshot` values, or generate fresh briefings for audit by bypassing cache (e.g., by clearing the Redis cache for test articles before running the audit).

### Pitfall 6: Summarisation `console.error` Is Not Structured JSON

**What goes wrong:** `src/lib/summarisation/index.ts` line 92: `console.error(\`[summarisation] Topic "${topic}" failed:\`, err)` — this is a template string, not JSON. Vercel will capture it, but it is not parseable as structured JSON and does not include `{ stage, userId, error, timestamp }` as required.

**Why it happens:** The code predates the structured logging decision made in Phase 7 context.

**How to avoid:** Replace with `console.error(JSON.stringify({ stage: 'summarisation', userId, topic, error: message, timestamp }))` during the log audit task.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Admin Script Pattern (from `scripts/generate-briefing.ts`)
```typescript
// Source: /scripts/generate-briefing.ts
import 'dotenv/config'
import { generateBriefingForUser } from '../src/lib/summarisation'

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: npx tsx scripts/generate-briefing.ts <userId>')
  process.exit(1)
}

generateBriefingForUser(userId)
  .then(result => { /* ... */ process.exit(0) })
  .catch(err => { console.error(err); process.exit(1) })
```
All new admin scripts (`briefing-count.ts`, `audit-briefing.ts`) follow this exact shape.

### Existing Structured Log Pattern (from `src/lib/dispatch.ts`)
```typescript
// Source: /src/lib/dispatch.ts
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
```
All new structured log additions must match this pattern. Use `stage` instead of `event` for ingestion/summarisation (aligns with CONTEXT.md format).

### Unsubscribe Suppression Check (from `src/lib/email.ts`)
```typescript
// Source: /src/lib/email.ts
export async function isSuppressed(email: string): Promise<boolean> {
  const row = await db.query.emailSuppressions.findFirst({
    where: eq(emailSuppressions.email, email),
    columns: { id: true },
  })
  return !!row
}
```
Used by `sendBriefingEmail` before every send. Verification: insert a row manually, confirm send is blocked.

### Drizzle Admin Query Pattern
```typescript
// Source: /src/lib/dispatch.ts (pattern)
import { and, eq, desc, sql } from 'drizzle-orm'
import { db } from '../src/lib/db/client'
import { deliveries } from '../src/lib/db/schema'

// Count sent briefings by date
const rows = await db
  .select({
    deliveryDate: deliveries.deliveryDate,
    count: sql<number>`cast(count(*) as int)`,
  })
  .from(deliveries)
  .where(eq(deliveries.status, 'sent'))
  .groupBy(deliveries.deliveryDate)
  .orderBy(desc(deliveries.deliveryDate))
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `console.error(string)` in summarisation | `console.error(JSON.stringify({...}))` | Parseable logs in Vercel |
| `result.errors` array (in-memory only) in ingestion | `result.errors` + `console.error(JSON.stringify({...}))` | Feed failures now visible in logs |
| Manual Outlook check via developer inbox | Same — send to real Outlook account | Outlook desktop has no free automated rendering service |

---

## Open Questions

1. **Does `src/app/unsubscribed/page.tsx` exist?**
   - What we know: The unsubscribe route redirects to `/unsubscribed` (hardcoded in `route.ts`). The `src/app/` directory listing shows no `unsubscribed/` folder.
   - What's unclear: Whether the Phase 2 plans created this page as part of AUTH-07.
   - Recommendation: Treat as missing until verified. If missing, create a minimal page (heading + "You have been unsubscribed." + link to homepage) as part of the unsubscribe verification task.

2. **Does the Mail Tester free tier provide Outlook desktop rendering?**
   - What we know: Mail Tester provides a spam score and some preview screenshots, but the free tier is limited. Outlook desktop rendering may require a paid plan or manual send.
   - What's unclear: Exact free tier screenshot coverage as of 2026.
   - Recommendation: Plan for a manual test — send a real email to a test Outlook desktop account (developer's own account or a throwaway Microsoft account). This is the most reliable approach regardless of Mail Tester tier.

3. **Cache bypass for AI audit**
   - What we know: `sourceSnapshot` is empty string on cache hits, making those items unauditable.
   - What's unclear: Whether there are enough non-cached items in a real briefing run to audit 10+ claims.
   - Recommendation: The `audit-briefing.ts` script should filter to `fromCache = false` rows and report a count. If fewer than 10 fresh summaries are available, note this in the audit doc and select the most recent briefing generated after clearing Redis cache for targeted topics.

---

## Sources

### Primary (HIGH confidence)
- `/src/lib/dispatch.ts` — existing structured logging patterns, dispatch flow
- `/src/lib/email.ts` — unsubscribe token generation and suppression check
- `/src/app/api/unsubscribe/route.ts` — unsubscribe GET/POST handler
- `/src/lib/summarisation/index.ts` — summarisation pipeline, current error logging
- `/src/lib/ingestion/index.ts` — ingestion pipeline, current error collection
- `/src/lib/db/schema.ts` — `briefingItems.sourceSnapshot`, `deliveries` table structure
- `/src/emails/briefing-email.tsx` — email template for Mail Tester assessment
- `/scripts/generate-briefing.ts` — admin script pattern to follow

### Secondary (MEDIUM confidence)
- Mail Tester free tier capabilities — based on public documentation; free tier limitations may have changed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed; all tools already in project
- Architecture: HIGH — based on direct codebase inspection; patterns are concrete
- Pitfalls: HIGH — identified via direct code audit (unsubscribed page gap, structured log gaps verified by reading source files)

**Research date:** 2026-03-07
**Valid until:** 2026-04-06 (stable — no fast-moving external dependencies)
