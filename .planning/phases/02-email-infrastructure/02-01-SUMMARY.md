---
phase: 02-email-infrastructure
plan: 01
subsystem: email
tags: [react-email, email-templates, drizzle-orm, postgres, typescript, neon]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Drizzle ORM schema conventions, neon-http database client, pgTable patterns"
provides:
  - "@react-email/components and @react-email/render installed as project dependencies"
  - "emailSuppressions Drizzle table (email_suppressions in Postgres) with id, email unique, reason, suppressedAt, createdAt"
  - "VerifyEmail React Email template rendering to HTML and plain text via render()"
  - "ResetPassword React Email template rendering to HTML and plain text via render()"
affects:
  - 02-02 (webhook and unsubscribe routes write to emailSuppressions; send helpers use VerifyEmail and ResetPassword)
  - 02-03 (email send helper renders VerifyEmail and ResetPassword before dispatch)

# Tech tracking
tech-stack:
  added:
    - "@react-email/components ^1.0.8 — Html, Head, Body, Container, Heading, Text, Button, Hr components"
    - "@react-email/render ^2.0.4 — async render() function (replaces deprecated renderAsync)"
    - "react-email ^5.2.9 (devDependency) — local email preview server"
  patterns:
    - "Email templates as plain React components with typed props interfaces (no any)"
    - "Inline styles only in email templates (email clients strip external stylesheets)"
    - "render() called with { plainText: true } option to get plain text output"

key-files:
  created:
    - "src/emails/verify-email.tsx — VerifyEmail component, verifyUrl: string prop"
    - "src/emails/reset-password.tsx — ResetPassword component, resetUrl: string prop"
  modified:
    - "src/lib/db/schema.ts — added emailSuppressions pgTable definition"
    - "package.json — added @react-email/components, @react-email/render, react-email"

key-decisions:
  - "react-email ^5.2.9 installed as devDependency only (preview server not needed in production)"
  - "No image assets in templates — text-only branding per user preference for simplicity"
  - "email column has unique constraint on emailSuppressions — one suppression row per address, upsert pattern for webhooks"

patterns-established:
  - "Email template pattern: export named function + export default; props interface typed; imports from @react-email/components only"
  - "render() pattern: await render(<Component props />) for HTML; await render(<Component props />, { plainText: true }) for text"

requirements-completed: [MAIL-02, MAIL-03, MAIL-04, AUTH-07]

# Metrics
duration: 15min
completed: 2026-03-01
---

# Phase 02 Plan 01: React Email templates and emailSuppressions schema

**@react-email/components installed, emailSuppressions table added to Drizzle schema, and VerifyEmail and ResetPassword templates both render to valid HTML and plain text strings via render()**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-01T10:30:14Z
- **Completed:** 2026-03-01T13:32:48Z
- **Tasks:** 2
- **Files modified:** 4 (package.json, package-lock.json, src/lib/db/schema.ts, src/emails/verify-email.tsx, src/emails/reset-password.tsx)

## Accomplishments

- Installed `@react-email/components`, `@react-email/render`, and `react-email` (dev) — render API available for Plan 02 send helpers
- Added `emailSuppressions` pgTable to `src/lib/db/schema.ts` with unique email constraint — ready for webhook and unsubscribe routes
- Built `VerifyEmail` template (HTML: 2186 chars, text: 331 chars) with verifyUrl prop, heading, body, CTA button, and footer disclaimer
- Built `ResetPassword` template (HTML: 2256 chars, text: 401 chars) with resetUrl prop, heading, body, CTA button, and footer disclaimer
- `npx tsc --noEmit` passes with zero errors across all project files

## Task Commits

Each task was committed atomically:

1. **Task 1: Install React Email packages and add emailSuppressions schema** - `4eca6d4` (feat)
2. **Task 2: Build VerifyEmail and ResetPassword React Email templates** - `c59ce66` (feat)

**Plan metadata:** [docs commit hash below]

## Files Created/Modified

- `src/emails/verify-email.tsx` — VerifyEmail React Email template; exports named `VerifyEmail` and default; verifyUrl: string prop
- `src/emails/reset-password.tsx` — ResetPassword React Email template; exports named `ResetPassword` and default; resetUrl: string prop
- `src/lib/db/schema.ts` — appended `emailSuppressions` pgTable definition after `deliveryPreferences`
- `package.json` — added three react-email packages to dependencies and devDependencies
- `package-lock.json` — lockfile updated with 92 new packages (36 + 56 from two install commands)

## Decisions Made

- `react-email` installed as devDependency only — local preview server (`email dev`) not needed in production builds
- No image assets in templates — clean text-only branding per user preference ("Keep templates simple and clean — no heavy styling, no image assets")
- `email` column on `emailSuppressions` carries a unique constraint — ensures one suppression row per address; Plan 02 webhook handler will use upsert (INSERT ... ON CONFLICT DO NOTHING) to handle duplicate webhook deliveries safely

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used tsx .tsx file instead of inline tsx -e with top-level await**
- **Found during:** Task 2 verification
- **Issue:** `npx tsx -e` in CJS mode does not support top-level await; the plan's verification command failed with "Top-level await is not supported with cjs output format"
- **Fix:** Wrote a temporary `verify-templates.tsx` file in the project root and ran `npx tsx verify-templates.tsx`; deleted file after verification passed
- **Files modified:** None — temporary test file deleted before commit
- **Verification:** All template output confirmed (HTML lengths, text lengths, heading presence, URL presence)
- **Committed in:** Not committed — temporary only

---

**Total deviations:** 1 auto-fixed (1 blocking — verification command syntax)
**Impact on plan:** Verification method differed from plan spec but verified the same done criteria. No functional scope change.

## Issues Encountered

- **drizzle-kit push requires live DATABASE_URL:** The `.env.local` only has a placeholder connection string, so `npx drizzle-kit push` could not run against the Neon database. The schema definition is correct and will be pushed when a real DATABASE_URL is configured. This is consistent with how prior plans handled schema — the schema is correct in code.
- **Pre-existing build failure (out of scope):** `npm run build` fails with `useSearchParams() should be wrapped in a suspense boundary at page "/login"` — this is a pre-existing issue from Plan 01-05 that predates this plan. Logged to `deferred-items.md` for tracking. TypeScript compilation (`npx tsc --noEmit`) passes cleanly.

## User Setup Required

To complete the database push step, run:
```bash
# Set DATABASE_URL to your real Neon connection string in .env.local, then:
cd /Users/willharveynats/conductor/repos/brief
npx drizzle-kit push
```

This will create the `email_suppressions` table in Postgres.

## Next Phase Readiness

- Plan 02-02 (webhook + unsubscribe routes) can import `emailSuppressions` from `src/lib/db/schema.ts` and write suppression rows
- Plan 02-03 (send helper upgrade) can import `render` from `@react-email/render` and both templates from `src/emails/`
- The `render()` API signature is: `await render(<VerifyEmail verifyUrl={url} />)` for HTML; add `{ plainText: true }` option for plain text
- Pre-existing login build error should be addressed before production deployment (see deferred-items.md)

---
*Phase: 02-email-infrastructure*
*Completed: 2026-03-01*

## Self-Check: PASSED

- FOUND: src/emails/verify-email.tsx
- FOUND: src/emails/reset-password.tsx
- FOUND: .planning/phases/02-email-infrastructure/02-01-SUMMARY.md
- FOUND: commit 4eca6d4 (Task 1)
- FOUND: commit c59ce66 (Task 2)
