---
phase: 02-email-infrastructure
plan: 03
subsystem: infra
tags: [resend, dns, spf, dkim, dmarc, mx, email-auth, webhooks]

# Dependency graph
requires:
  - phase: 02-email-infrastructure
    provides: Resend API integration, email suppression table, webhook handler at /api/webhooks/resend
provides:
  - mail.brief.app added to Resend with SPF/DKIM/DMARC/MX DNS records live in DNS
  - RESEND_WEBHOOK_SECRET configured in .env.local and production (Resend webhook endpoint created)
  - UNSUBSCRIBE_SECRET generated and configured in all environments
  - DNS authentication confirmed live via dig (SPF include:amazonses.com, valid DKIM p= key, DMARC p=none, MX feedback-smtp.eu-west-1.amazonses.com)
affects: [02-email-infrastructure, 05-dispatch-pipeline, phase-6-growth]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DNS email authentication with SPF include:amazonses.com (Resend uses Amazon SES infrastructure)
    - DMARC p=none monitoring-only policy — satisfies Gmail/Yahoo/Microsoft 2025 bulk sender requirements without breaking delivery
    - RESEND_WEBHOOK_SECRET and UNSUBSCRIBE_SECRET as independent secrets — separate concerns (webhook signing vs unsubscribe HMAC)

key-files:
  created: []
  modified:
    - ".env.local — RESEND_WEBHOOK_SECRET and UNSUBSCRIBE_SECRET added"

key-decisions:
  - "DNS verified via dig rather than MXToolbox web UI — dig output is authoritative, MXToolbox is a convenience wrapper around the same DNS resolution"
  - "Resend dashboard shows Pending (normal — Resend polls independently); DNS propagation confirmed live, not blocking"
  - "DMARC p=none chosen for Phase 2 — monitoring-only; appropriate for a new sending domain before delivery patterns are established"
  - "mail.brief.app subdomain used (not brief.app root) — Phase 1 sends from noreply@mail.brief.app; subdomain isolates email reputation from root domain"

patterns-established:
  - "DNS email auth: SPF + DKIM + DMARC all three required before any production send — enforced by MAIL-02"
  - "Environment secrets: RESEND_WEBHOOK_SECRET for webhook validation, UNSUBSCRIBE_SECRET for HMAC token generation — set in .env.local and Vercel"

requirements-completed: [MAIL-02]

# Metrics
duration: ~48h (DNS propagation window; active configuration ~30min)
completed: 2026-03-04
---

# Phase 02 Plan 03: Resend Domain DNS Verification Summary

**mail.brief.app DNS authentication live: SPF (amazonses.com), DKIM (valid public key), DMARC (p=none), and MX (feedback-smtp.eu-west-1.amazonses.com) all confirmed via dig**

## Performance

- **Duration:** ~30 min active configuration + DNS propagation window (~48h)
- **Started:** 2026-03-04 (DNS propagation began earlier; verification completed 2026-03-04T09:12:12Z)
- **Completed:** 2026-03-04T09:12:12Z
- **Tasks:** 2 of 2
- **Files modified:** 1 (.env.local)

## Accomplishments

- mail.brief.app added to Resend dashboard; all four DNS records added at DNS provider: SPF TXT, DKIM TXT, MX, and DMARC TXT
- DNS authentication confirmed live via `dig` — SPF `include:amazonses.com ~all`, valid DKIM `p=` public key, DMARC `v=DMARC1; p=none;`, MX `10 feedback-smtp.eu-west-1.amazonses.com`
- Resend webhook endpoint created pointing to `/api/webhooks/resend` with `email.bounced` and `email.complained` events
- RESEND_WEBHOOK_SECRET and UNSUBSCRIBE_SECRET set in .env.local and production environment — Phase 2 email infrastructure fully wired

## Task Commits

This plan involved external dashboard configuration and DNS management — no code commits were made. Tasks were human-action and human-verify checkpoints by design.

1. **Task 1: Configure mail.brief.app in Resend dashboard and add DNS records** — Human action (external dashboards)
2. **Task 2: Verify DNS records pass MXToolbox checks** — Human verify (dig-confirmed propagation)

**Plan metadata:** (committed with state/roadmap update)

## Files Created/Modified

- `.env.local` — RESEND_WEBHOOK_SECRET (Resend webhook signing secret) and UNSUBSCRIBE_SECRET (openssl rand -hex 32) added

## Decisions Made

- DNS verified via `dig` directly rather than waiting for MXToolbox web UI — `dig` output is authoritative DNS resolution, identical underlying mechanism. Accepted as equivalent verification.
- Resend dashboard shows "Pending" status — this is normal. Resend polls DNS on its own schedule independently of DNS TTL. DNS is confirmed live; dashboard will auto-update.
- DMARC `p=none` for Phase 2 — monitoring-only policy. Appropriate for a new sending domain. Satisfies Gmail/Yahoo/Microsoft 2025 bulk sender enforcement requirements. Escalate to `p=quarantine` after establishing clean delivery patterns.

## Deviations from Plan

None — plan executed exactly as written. The verification method (dig vs MXToolbox) is equivalent and the user confirmed DNS records are live. Resend dashboard "Pending" state is explicitly called out in the plan as expected behavior during propagation.

## Issues Encountered

- Resend dashboard shows "Pending" after DNS records were added — not an issue, documented as expected behavior in the plan. DNS is confirmed propagated and live. Dashboard will auto-resolve.

## User Setup Required

All external configuration completed as part of this plan:
- mail.brief.app domain added to Resend dashboard
- SPF, DKIM, MX, and DMARC DNS records added at DNS provider
- Resend webhook endpoint created at /api/webhooks/resend (email.bounced + email.complained events)
- RESEND_WEBHOOK_SECRET added to .env.local and production (Vercel)
- UNSUBSCRIBE_SECRET generated (openssl rand -hex 32) and added to .env.local and production (Vercel)

**Remaining:** Resend dashboard will show "Verified" once it polls DNS (automatic, no action needed).

## Next Phase Readiness

- Phase 2 email infrastructure is complete: email templates (02-01), webhook handler + suppression (02-02), and DNS authentication (02-03) all done
- FROM_ADDRESS `noreply@mail.brief.app` is ready to use in production once Resend shows "Verified" (currently using `onboarding@resend.dev` as placeholder per 01-06 decision)
- Phase 5 (dispatch pipeline) can proceed — DNS auth is live, MAIL-02 requirement satisfied
- No blockers

---
*Phase: 02-email-infrastructure*
*Completed: 2026-03-04*
