---
phase: 01-foundation
plan: 01
subsystem: database
tags: [next.js, drizzle-orm, neon, postgresql, zod, auth.js, next-auth, shadcn, bcryptjs, resend, upstash]

# Dependency graph
requires: []
provides:
  - Next.js 15 App Router project scaffolded with TypeScript and Tailwind CSS
  - All Phase 1 runtime and dev dependencies installed
  - Drizzle ORM client connected to Neon via neon-http driver
  - Complete 7-table database schema (users, accounts, verificationTokens, userConsents, passwordResetTokens, userTopics, deliveryPreferences)
  - Zod validation schemas for auth (signUpSchema, signInSchema, passwordResetRequestSchema, passwordResetSchema)
  - Zod validation schemas for preferences (topicsSchema, deliveryPreferenceSchema)
  - shadcn/ui initialized with zinc base color; button, input, label, badge, command, popover, form components
  - drizzle.config.ts pointing at Neon postgresql with schema.ts
  - .env.local with placeholder values; .env.example for team reference
affects:
  - 01-02 (auth routes and server actions import db and schema)
  - 01-03 (email verification imports db and validations)
  - 01-04 (onboarding UI imports validations and shadcn components)
  - 01-05 (session management reads from schema)
  - 01-06 (rate limiting uses Upstash already installed)
  - All subsequent phases in 01-foundation and beyond

# Tech tracking
tech-stack:
  added:
    - next@15 (App Router, TypeScript)
    - next-auth@beta (Auth.js v5, DrizzleAdapter)
    - @auth/drizzle-adapter
    - drizzle-orm + @neondatabase/serverless (neon-http driver)
    - drizzle-kit (dev, schema push)
    - zod (validation)
    - react-hook-form + @hookform/resolvers
    - bcryptjs (password hashing, Edge-compatible via WASM)
    - resend (transactional email)
    - @upstash/ratelimit + @upstash/redis (rate limiting)
    - shadcn/ui (zinc base, CSS variables)
    - tailwindcss v4
  patterns:
    - Drizzle schema co-located in src/lib/db/schema.ts (single source of truth)
    - Auth.js managed tables extended with custom columns (passwordHash, onboardingComplete) — DrizzleAdapter ignores unknown columns
    - Delivery time stored as "HH:MM" string in user's IANA timezone — pipeline converts at schedule time to avoid DST bugs
    - Normalized rows for userTopics (not jsonb) to enable Phase 6 co-occurrence queries
    - One passwordResetToken row per reset with usedAt timestamp to prevent replay attacks
    - Zod schemas in src/lib/validations/ as the single input validation source for server actions and client forms

key-files:
  created:
    - src/lib/db/client.ts
    - src/lib/db/schema.ts
    - src/lib/validations/auth.ts
    - src/lib/validations/preferences.ts
    - drizzle.config.ts
    - .env.example
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/label.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/command.tsx
    - src/components/ui/popover.tsx
    - src/components/ui/form.tsx
    - src/components/ui/dialog.tsx
    - src/lib/utils.ts
    - components.json
  modified:
    - package.json (all Phase 1 deps added)
    - package-lock.json
    - src/app/globals.css (shadcn CSS variables injected)

key-decisions:
  - "Used neon-http driver (not neon-serverless WebSocket) for Drizzle client — simpler, no connection pooling needed at this scale"
  - "Auth.js managed tables extended with custom columns rather than separate tables — avoids join complexity for session/user lookups"
  - "deliveryTime stored as HH:MM string in user's local IANA timezone — pipeline converts to UTC at dispatch time, avoiding DST edge cases"
  - "userTopics normalized as rows not jsonb — enables Phase 6 co-occurrence queries for adjacent topic suggestions (PREF-04 foundation)"
  - "Scaffolded Next.js in /tmp then copied to project root to avoid create-next-app conflict with .planning/ directory"

patterns-established:
  - "Schema: All DB tables in src/lib/db/schema.ts, client in src/lib/db/client.ts — import db from @/lib/db/client"
  - "Validation: Zod schemas in src/lib/validations/ — shared between server actions and client-side react-hook-form"
  - "Environment: All secrets in .env.local (gitignored); .env.example as reference"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, PREF-01, PREF-02]

# Metrics
duration: 6min
completed: 2026-02-28
---

# Phase 1 Plan 01: Foundation Bootstrap Summary

**Next.js 15 App Router project bootstrapped with Drizzle ORM + Neon schema (7 tables), Auth.js v5 dependencies, and Zod validation schemas — all Phase 1 plans can now import from these foundations**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-28T19:42:53Z
- **Completed:** 2026-02-28T19:48:43Z
- **Tasks:** 2 of 2
- **Files modified:** 18

## Accomplishments
- Scaffolded Next.js 15 App Router project with TypeScript, Tailwind CSS v4, ESLint, src-dir structure
- Installed all Phase 1 dependencies: next-auth@beta, drizzle-orm, @neondatabase/serverless, drizzle-kit, zod, react-hook-form, bcryptjs, resend, @upstash/ratelimit, @upstash/redis
- Initialized shadcn/ui (zinc base color) with all required components: button, input, label, badge, command, popover, form
- Created Drizzle client (neon-http driver) and complete 7-table schema matching Auth.js DrizzleAdapter requirements with custom extensions
- Created Zod validation schemas for auth (4 schemas) and preferences (2 schemas)
- Verified: `npm run build` completes successfully, `npx tsc --noEmit` clean, `drizzle-kit check` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15 project and install all Phase 1 dependencies** - `1d4602b` (feat)
2. **Task 2: Define complete Drizzle database schema and Zod validation schemas** - `f61c818` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `package.json` - All Phase 1 dependencies declared (next-auth, drizzle-orm, bcryptjs, zod, resend, upstash)
- `drizzle.config.ts` - Drizzle Kit config pointing to postgresql dialect and src/lib/db/schema.ts
- `components.json` - shadcn/ui configuration (zinc base color, CSS variables)
- `src/lib/db/client.ts` - Drizzle client initialized with neon-http driver, exports `db`
- `src/lib/db/schema.ts` - All 7 Phase 1 tables: users, accounts, verificationTokens, userConsents, passwordResetTokens, userTopics, deliveryPreferences
- `src/lib/validations/auth.ts` - signUpSchema, signInSchema, passwordResetRequestSchema, passwordResetSchema
- `src/lib/validations/preferences.ts` - topicsSchema, deliveryPreferenceSchema
- `src/components/ui/` - button, input, label, badge, command, popover, form, dialog components
- `src/lib/utils.ts` - shadcn cn() utility
- `.env.example` - All required env var keys with descriptive placeholder values

## Decisions Made
- Used neon-http driver over neon-serverless WebSocket — simpler configuration, no connection pooling needed at this scale
- Auth.js managed tables extended with custom columns (passwordHash, onboardingComplete) rather than creating separate tables — DrizzleAdapter ignores unknown columns, avoids join complexity
- deliveryTime stored as "HH:MM" string in IANA timezone — conversion to UTC at dispatch time avoids DST edge cases
- userTopics normalized as individual rows (not jsonb) — enables Phase 6 co-occurrence queries for adjacent topic suggestions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scaffolded Next.js in /tmp to avoid create-next-app conflict**
- **Found during:** Task 1 (Next.js scaffolding)
- **Issue:** `create-next-app` refused to run in project directory because `.planning/` directory already existed
- **Fix:** Ran `create-next-app` in `/tmp/brief-scaffold`, then rsync'd files to project root
- **Files modified:** All scaffold files (package.json, next.config.ts, etc.)
- **Verification:** Build passes successfully
- **Committed in:** 1d4602b (Task 1 commit)

**2. [Rule 3 - Blocking] Rebuilt node_modules after copy corruption**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** Copying node_modules from /tmp broke .bin symlinks (tsc, next binaries had hardcoded paths)
- **Fix:** Deleted copied node_modules, ran `npm install` from project root to reinstall natively
- **Files modified:** node_modules/ (not committed)
- **Verification:** `npx tsc --noEmit` clean, `npm run build` succeeds
- **Committed in:** Part of Task 2 verification, not a separate commit (no files changed in repo)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking)
**Impact on plan:** Both fixes were necessary workarounds for the pre-existing .planning/ directory. No scope creep. Final state matches plan exactly.

## Issues Encountered
- create-next-app v15 refuses to scaffold into non-empty directories — worked around via /tmp scaffolding with rsync copy
- node_modules .bin symlinks break when copied across filesystem paths — resolved by fresh `npm install` from project root

## User Setup Required

**External services require manual configuration before running Drizzle schema push.**

To set up:

1. **Neon database**: Create a project at [neon.tech](https://neon.tech), copy the connection string
2. **Auth secret**: Run `npx auth secret` and copy the output
3. **Resend API key**: Get from [resend.com](https://resend.com) dashboard
4. **Upstash Redis**: Create instance at [console.upstash.com](https://console.upstash.com), copy REST URL and token

Then update `.env.local` with real values and run:
```bash
npx drizzle-kit push
```

This will create all 7 tables in your Neon database.

## Next Phase Readiness
- All Phase 1 dependencies installed — subsequent plans can immediately import from `@/lib/db/client`, `@/lib/db/schema`, `@/lib/validations/auth`, `@/lib/validations/preferences`
- shadcn/ui components available for auth and onboarding UI (Plans 04+)
- Drizzle schema ready for push once DATABASE_URL is configured
- Blocker: DATABASE_URL must be set before `drizzle-kit push` (schema push) and before any server actions run against the DB

---
*Phase: 01-foundation*
*Completed: 2026-02-28*

## Self-Check: PASSED

All files verified to exist on disk and all task commits verified in git history.
- src/lib/db/client.ts: FOUND
- src/lib/db/schema.ts: FOUND
- src/lib/validations/auth.ts: FOUND
- src/lib/validations/preferences.ts: FOUND
- drizzle.config.ts: FOUND
- .env.local: FOUND
- components.json: FOUND
- 01-01-SUMMARY.md: FOUND
- Commit 1d4602b (Task 1): FOUND
- Commit f61c818 (Task 2): FOUND
