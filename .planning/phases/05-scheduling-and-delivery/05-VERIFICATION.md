---
phase: 05-scheduling-and-delivery
verified: 2026-03-04T14:30:00Z
status: passed
score: 20/20 must-haves verified
re_verification: false
human_verification:
  - test: "Confirm briefing email arrives in real inbox with correct structure"
    expected: "Email from Brief <noreply@briefnews.online> with topic sections, article summaries, footer Preferences + Unsubscribe links"
    why_human: "End-to-end email delivery to a real inbox cannot be verified programmatically from the codebase. Plan 05-05 SUMMARY documents human-confirmed delivery to will.harvey@me.com."
  - test: "Confirm idempotency in production — second dispatch on same day does not send a second email"
    expected: "Second trigger returns {sent:0, skipped:1}; deliveries table has exactly one row for that user/date"
    why_human: "Live execution state in production Neon DB cannot be verified by code inspection. Plan 05-05 SUMMARY documents this was confirmed."
  - test: "Confirm GitHub Actions cron secrets are set in repository settings"
    expected: "Repository secrets CRON_SECRET and APP_URL are set so the scheduled workflow can authenticate against /api/cron/dispatch"
    why_human: "GitHub Actions secrets are not visible in the codebase. SUMMARY notes they must be manually configured."
---

# Phase 5: Scheduling and Delivery — Verification Report

**Phase Goal:** The full pipeline runs automatically every day, delivering each user's briefing at their chosen time with guaranteed idempotency
**Verified:** 2026-03-04T14:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | deliveries table exists in schema with unique constraint on (userId, deliveryDate) | VERIFIED | `src/lib/db/schema.ts` lines 211-231; `drizzle/0001_great_the_captain.sql` confirms `CONSTRAINT "deliveries_user_id_delivery_date_unique" UNIQUE("user_id","delivery_date")` |
| 2 | Attempting to insert a second row for the same (userId, deliveryDate) is handled via onConflictDoNothing | VERIFIED | `src/lib/dispatch.ts` lines 181, 210, 245 use `.onConflictDoNothing()` on all delivery inserts |
| 3 | BriefingEmail renders topic sections with headers, article headlines, summaries, and source links | VERIFIED | `src/emails/briefing-email.tsx` — full component: H2 headers per topic, linked headline, summary text, sourceName attribution, footer with Preferences and Unsubscribe links |
| 4 | Empty topics are not rendered in email output | VERIFIED | `dispatch.ts` `buildTopicSections()` line 120: `.filter(s => s.items.length > 0)` — caller filters; component receives pre-filtered list |
| 5 | sendBriefingEmail respects suppression list — suppressed addresses never receive briefing | VERIFIED | `src/lib/email.ts` line 125: `if (await isSuppressed(email)) return` — unconditionally first line in sendBriefingEmail |
| 6 | FROM_ADDRESS uses verified domain | VERIFIED | `src/lib/email.ts` line 14: `const FROM_ADDRESS = "Brief <noreply@briefnews.online>"` — corrected from unverified mail.brief.app to verified briefnews.online in commit ec26bd5 |
| 7 | A user scheduled for a time within the past 2 hours with no delivery record today gets their briefing sent | VERIFIED | `dispatch.ts` `isUserDue()` function (lines 47-71) uses Intl.DateTimeFormat with 2-hour CATCH_UP_WINDOW_MS; pipeline proceeds if no existing record |
| 8 | A user who already has a sent delivery record today is skipped | VERIFIED | `dispatch.ts` lines 152-155: checks `existing.status === 'sent' || existing.status === 'skipped'` → returns `'skipped'` |
| 9 | A user whose first attempt failed (retryCount=0) is retried once on next tick | VERIFIED | `dispatch.ts` lines 156-159: checks `retryCount >= MAX_RETRIES` (MAX_RETRIES=1); if retryCount=0 falls through to retry |
| 10 | A user whose retry also failed (retryCount=1) is skipped for the day | VERIFIED | `dispatch.ts` line 156: `(existing.retryCount ?? 0) >= MAX_RETRIES` with MAX_RETRIES=1 → returns `'skipped'` |
| 11 | A zero-content briefing is recorded as status=skipped, not sent | VERIFIED | `dispatch.ts` lines 171-193: `if (result.itemCount === 0)` inserts status='skipped' with failureReason='zero_content' |
| 12 | Delivery date is computed in the user's IANA timezone, not UTC | VERIFIED | `dispatch.ts` `getUserLocalDate()` (lines 31-38) uses `Intl.DateTimeFormat('en-CA', { timeZone: timezone })` — never UTC |
| 13 | Each pipeline run emits structured JSON log lines per user | VERIFIED | `dispatch.ts` emits JSON for cron_start (line 287), dispatch_sent (line 212), dispatch_skipped (line 183), dispatch_failed (line 248), cron_complete (line 319) |
| 14 | GET /api/cron/dispatch with valid Bearer CRON_SECRET returns 200 JSON | VERIFIED | `src/app/api/cron/dispatch/route.ts` lines 9-11: auth check, then calls runDispatch(), returns Response.json with ok:true |
| 15 | GET /api/cron/dispatch without or wrong Authorization header returns 401 | VERIFIED | `route.ts` lines 9-12: `if (authHeader !== 'Bearer ${process.env.CRON_SECRET}') return new Response('Unauthorized', { status: 401 })` |
| 16 | GET /api/health/scheduler returns 200 JSON with lastRun and timestamp fields | VERIFIED | `src/app/api/health/scheduler/route.ts` lines 7-16: queries deliveries table, returns `{ ok, lastRun, lastStatus, timestamp }` |
| 17 | The cron fires automatically on a 15-minute schedule | VERIFIED | `.github/workflows/cron-dispatch.yml` line 5: `cron: '*/15 * * * *'` — GitHub Actions replaced Vercel Cron (Hobby plan limitation); also supports manual trigger via workflow_dispatch |
| 18 | dispatch.ts imports and wires ingestForUser, generateBriefingForUser, sendBriefingEmail | VERIFIED | `dispatch.ts` lines 4-6: all three imported; called in dispatchForUser at lines 167, 168, 197 |
| 19 | Cron route imports and calls runDispatch | VERIFIED | `src/app/api/cron/dispatch/route.ts` lines 2, 16: `import { runDispatch }` and `await runDispatch()` |
| 20 | Health endpoint queries deliveries table for lastRun | VERIFIED | `src/app/api/health/scheduler/route.ts` lines 7-10: `db.query.deliveries.findFirst({ orderBy: [desc(deliveries.createdAt)] })` |

**Score:** 20/20 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | deliveries table with unique constraint on (userId, deliveryDate) and retryCount | VERIFIED | Lines 207-231; exports `deliveries`; unique constraint present; all 10 columns |
| `drizzle/0001_great_the_captain.sql` | SQL migration for deliveries table | VERIFIED | File exists; CREATE TABLE deliveries with UNIQUE constraint and both FKs |
| `src/emails/briefing-email.tsx` | React Email component for briefing HTML email | VERIFIED | Exports `BriefingEmail` (default + named) and `BriefingTopicSection` interface; full implementation with topic sections, articles, footer |
| `src/lib/email.ts` | sendBriefingEmail() helper and updated FROM_ADDRESS | VERIFIED | FROM_ADDRESS=`noreply@briefnews.online`; `sendBriefingEmail` exported; isSuppressed first; throws on Resend error |
| `src/lib/dispatch.ts` | runDispatch() orchestrator and isUserDue() timezone check | VERIFIED | Exports `runDispatch` and `DispatchResult`; full implementation with all scheduling logic |
| `src/app/api/cron/dispatch/route.ts` | Vercel Cron handler calling runDispatch() every 15-min tick | VERIFIED | Exports `GET` and `maxDuration=300`; auth guard; calls runDispatch() |
| `src/app/api/health/scheduler/route.ts` | Health check endpoint returning last delivery record | VERIFIED | Exports `GET`; queries deliveries.createdAt; returns lastRun, lastStatus, timestamp |
| `vercel.json` | Present at project root | VERIFIED (MODIFIED) | File exists but is now `{}` — cron config deliberately removed and replaced by GitHub Actions when Vercel Hobby plan rejected `*/15` schedule. This is intentional, documented in 05-05-SUMMARY.md. |
| `.github/workflows/cron-dispatch.yml` | GitHub Actions cron scheduler replacing Vercel Cron | VERIFIED | `*/15 * * * *` schedule; uses secrets.CRON_SECRET and secrets.APP_URL; supports workflow_dispatch manual trigger |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/email.ts` | `src/emails/briefing-email.tsx` | `import { BriefingEmail }` | VERIFIED | Line 9: `import { BriefingEmail } from "@/emails/briefing-email"` |
| `src/lib/email.ts` | `resend.emails.send` | isSuppressed check then resend.emails.send with List-Unsubscribe headers | VERIFIED | Lines 125-145: isSuppressed guard, then resend.emails.send with both List-Unsubscribe headers |
| `src/lib/dispatch.ts` | `src/lib/ingestion/index.ts` | `import { ingestForUser }` | VERIFIED | Line 4: `import { ingestForUser } from '@/lib/ingestion'`; called line 167 |
| `src/lib/dispatch.ts` | `src/lib/summarisation/index.ts` | `import { generateBriefingForUser }` | VERIFIED | Line 5: `import { generateBriefingForUser } from '@/lib/summarisation'`; called line 168 |
| `src/lib/dispatch.ts` | `src/lib/email.ts` | `import { sendBriefingEmail }` | VERIFIED | Line 6: `import { sendBriefingEmail } from '@/lib/email'`; called line 197 |
| `src/lib/dispatch.ts` | deliveries table | `db.query.deliveries.findFirst + db.insert(deliveries).onConflictDoNothing()` | VERIFIED | Line 144: findFirst; lines 173-181, 202-210, 236-245: insert with onConflictDoNothing |
| `src/app/api/cron/dispatch/route.ts` | `src/lib/dispatch.ts` | `import { runDispatch }` | VERIFIED | Line 2: `import { runDispatch } from '@/lib/dispatch'`; line 16: `await runDispatch()` |
| `src/app/api/health/scheduler/route.ts` | deliveries table | `db.query.deliveries.findFirst orderBy createdAt desc` | VERIFIED | Lines 7-10: `db.query.deliveries.findFirst({ orderBy: [desc(deliveries.createdAt)] })` |
| `.github/workflows/cron-dispatch.yml` | `GET /api/cron/dispatch` | curl with Authorization: Bearer CRON_SECRET | VERIFIED | Lines 14-17: curl with `-H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"` targeting `${{ secrets.APP_URL }}/api/cron/dispatch` |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MAIL-01 | 05-01, 05-02, 05-03, 05-04, 05-05 | User receives a daily HTML email briefing at their chosen delivery time | SATISFIED | Full pipeline implemented: deliveries schema (05-01), email template + sendBriefingEmail (05-02), runDispatch orchestrator (05-03), cron route + health endpoint (05-04), live delivery confirmed (05-05). REQUIREMENTS.md marks MAIL-01 as Complete / Phase 5. |

**Orphaned requirements check:** REQUIREMENTS.md maps only MAIL-01 to Phase 5. All five plans declare `requirements: [MAIL-01]`. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `vercel.json` | 1 | File is `{}` — crons config removed | Info | Intentional. Vercel Cron removed when Hobby plan rejected `*/15 * * * *` schedule. GitHub Actions workflow replaces it. No functional gap. |

No TODO/FIXME/placeholder comments found in any Phase 5 source file.
No empty implementations (return null / return {} / return []) in any Phase 5 route or lib file.
No stub patterns found.

---

## Human Verification Required

### 1. Live briefing email delivery to real inbox

**Test:** Check the inbox for will.harvey@me.com (the test user registered in the app).
**Expected:** Email arrived from "Brief <noreply@briefnews.online>" with subject "Good morning, [Name] — your Brief is ready". Body contains at least one topic section with H2 header, article summaries, and a footer with "Preferences" and "Unsubscribe" links.
**Why human:** End-to-end email delivery cannot be verified from the codebase. Plan 05-05 SUMMARY documents this was confirmed during live execution on 2026-03-04, with response `{"ok":true,"sent":1,"skipped":0,"failed":0}`.

### 2. Idempotency in production

**Test:** Trigger `/api/cron/dispatch` with CRON_SECRET a second time on the same day.
**Expected:** Response shows `{"sent":0,"skipped":1,"failed":0}`. The deliveries table for that user/date has exactly one row — no duplicate.
**Why human:** Production database state cannot be verified from code inspection. Plan 05-05 SUMMARY documents second trigger returned `{"ok":true,"sent":0,"skipped":1,"failed":0}`.

### 3. GitHub Actions secrets configured

**Test:** Verify `CRON_SECRET` and `APP_URL` are set as repository secrets in GitHub.
**Expected:** GitHub Actions workflow runs successfully on the 15-minute schedule, hitting the production Vercel deployment.
**Why human:** GitHub Actions secrets are not visible in the repository code. Required for automated dispatch to function.

---

## Notable Deviation: vercel.json and Cron Scheduler

Plan 05-04 specified `vercel.json` with `*/15 * * * *` cron. During Plan 05-05 deployment, the Vercel Hobby plan rejected this schedule at build time. The fix (documented in 05-05-SUMMARY.md, commit `ed1969b`) was to:

1. Strip the crons config from `vercel.json` (now `{}`).
2. Add `.github/workflows/cron-dispatch.yml` with the same 15-minute schedule via GitHub Actions.

The functional outcome is identical — the `/api/cron/dispatch` endpoint is called every 15 minutes with a Bearer token. The delivery mechanism changed from Vercel Cron to GitHub Actions, but the endpoint, authentication, and scheduling interval are the same.

The Plan 05-04 artifact check for `vercel.json contains "*/15 * * * *"` would fail on the current `{}` file, but this is a known, intentional change documented in SUMMARY and not a gap in goal achievement.

---

## Gaps Summary

None. All 20 observable truths verified. All artifacts exist and are substantive implementations. All key links are wired. MAIL-01 is fully satisfied. The vercel.json change is an intentional, documented deviation that preserves the scheduling goal via GitHub Actions.

---

_Verified: 2026-03-04T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
