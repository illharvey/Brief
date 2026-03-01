# Phase 2: Email Infrastructure - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure the email sending channel so it is fully authenticated and legally compliant before any real email reaches a user inbox. This covers: DNS authentication records (SPF, DKIM, DMARC), transactional email templates (email verification, password reset), compliance headers (plain text alternative, List-Unsubscribe), one-click unsubscribe suppression, and bounce/complaint webhook handling. Briefing email content and scheduling are Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Email Template Format
- Styled HTML emails with a plain text alternative (required for compliance and deliverability)
- Both parts sent in every transactional email — HTML for clients that render it, plain text as fallback

### Branding, Tone, and Scope
- Claude's Discretion: branding (logo vs text wordmark), tone (friendly/concise is appropriate for a consumer briefing product), and template scope (transactional emails only for this phase — verification + password reset)
- Keep templates simple and clean — no heavy styling, no image assets unless straightforward to host

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for transactional email in a Next.js/Resend stack.

</specifics>

<deferred>
## Deferred Ideas

- Briefing email template — Phase 5 (scheduling and delivery)
- Admin suppression list UI — not in scope for this phase; suppression is background/automatic

</deferred>

---

*Phase: 02-email-infrastructure*
*Context gathered: 2026-03-01*
