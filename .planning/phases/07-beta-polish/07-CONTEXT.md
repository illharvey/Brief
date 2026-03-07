# Phase 7: Beta Polish - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Cross-cutting quality gate — verify robustness and legal compliance across all system components before onboarding real beta users. No new features are added in this phase; only verification, hardening, and sign-off work.

</domain>

<decisions>
## Implementation Decisions

### Observability setup
- Vercel logs + console only — no third-party service (Sentry, Datadog) for beta
- Daily briefing count metric: a database query or admin script (no UI), run on demand
- All four pipeline stages require explicit error capture:
  - Content ingestion (per-feed failures)
  - AI summarisation (Claude API errors, timeouts, malformed responses)
  - Email delivery (Resend rejections, unhandled bounces)
  - Scheduling/cron (job didn't run, crashed mid-execution)
- Error log format: structured JSON to console `{ stage, userId, error, timestamp }` — captured by Vercel

### Email client testing
- Testing tool: Mail Tester (free tier)
- Must-pass clients (all four are blocking):
  - Gmail (web)
  - Apple Mail (macOS/iOS)
  - Outlook (desktop)
  - Gmail mobile app
- Pass bar: visual output closely matches the React Email template design intent
- Dark mode: out of scope for beta — light mode only

### AI audit process
- Sample size: 10+ briefings across different topic types
- Process: generate a side-by-side comparison document — each AI claim alongside its source article
- Acceptance criteria: zero fabricated facts — every specific claim (names, numbers, events) must be traceable to source articles
- If hallucination found: blocking — fix the summarisation prompt and re-audit 10+ briefings before beta proceeds

### Beta readiness gate
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

</decisions>

<specifics>
## Specific Ideas

- BETA-CHECKLIST.md should live in .planning/ as a standalone file with checkboxes — not embedded in CONTEXT.md or VERIFICATION.md
- The side-by-side AI audit doc should make it easy to open a source article and verify a claim in one step

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-beta-polish*
*Context gathered: 2026-03-07*
