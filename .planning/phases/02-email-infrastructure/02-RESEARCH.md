# Phase 2: Email Infrastructure - Research

**Researched:** 2026-03-01
**Domain:** Transactional email — Resend SDK, DNS authentication (SPF/DKIM/DMARC), React Email templates, webhook handling, suppression/unsubscribe
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Styled HTML emails with a plain text alternative (required for compliance and deliverability)
- Both parts sent in every transactional email — HTML for clients that render it, plain text as fallback

### Claude's Discretion
- Branding (logo vs text wordmark), tone (friendly/concise is appropriate for a consumer briefing product), and template scope (transactional emails only for this phase — verification + password reset)
- Keep templates simple and clean — no heavy styling, no image assets unless straightforward to host

### Deferred Ideas (OUT OF SCOPE)
- Briefing email template — Phase 5 (scheduling and delivery)
- Admin suppression list UI — not in scope for this phase; suppression is background/automatic
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-07 | User can unsubscribe via one-click link with immediate processing (CAN-SPAM/GDPR) | Signed token pattern + `/api/unsubscribe` POST endpoint + `emailSuppressions` DB table |
| MAIL-02 | Email domain is configured with SPF, DKIM, and DMARC before first send | Resend dashboard domain setup + DNS record types + DMARC p=none minimum |
| MAIL-03 | Bounce and complaint events are handled automatically via webhooks | Resend webhook events (email.bounced, email.complained) + svix signature verification + suppression table |
| MAIL-04 | Every email includes a plain text alternative | react-email render() with plainText option + Resend emails.send() text + react fields |
</phase_requirements>

---

## Summary

The project already has Resend v6.9.3 installed and a minimal `src/lib/email.ts` exporting the client. Phase 1 email sending uses plain text only (`text:` field). This phase upgrades all transactional emails to use React Email for HTML+text rendering, adds DNS authentication records in the Resend dashboard, wires up webhook handling for bounces/complaints, and implements a one-click unsubscribe mechanism backed by a database suppression table.

The architecture has three distinct parts: (1) DNS authentication — purely a dashboard/DNS ops task, verified on MXToolbox before any real email is sent; (2) React Email templates for email verification and password reset, replacing the current bare-text sends; (3) a suppression system combining an `emailSuppressions` table in Postgres, a signed-token unsubscribe URL pattern for AUTH-07, and a webhook handler at `/api/webhooks/resend` for MAIL-03.

Resend automatically suppresses delivery to known-bounced/complained addresses at the infrastructure level. The project's own `emailSuppressions` table gives the application layer a pre-send check and provides the single source of truth for CAN-SPAM/GDPR compliance. The webhook handler must receive raw body text (not parsed JSON) for signature verification.

**Primary recommendation:** Install `@react-email/components` + `@react-email/render`, build two templates (VerifyEmail, ResetPassword), upgrade existing sends in `auth.ts` to use `react:` + `text:` fields, add `List-Unsubscribe` headers, create the suppression table migration, implement the webhook route, and complete DNS setup in the Resend dashboard.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^6.9.3 (already installed) | Send transactional emails + webhook verification | Already in project; official Node SDK |
| @react-email/components | ^0.0.36 / latest | React components for email templates (Html, Head, Body, Text, Button, Hr, etc.) | Built by Resend team; cross-client compatible; official pairing |
| @react-email/render | ^1.x / latest | Converts React Email components to HTML string or plain text string | Required for `react:` + `text:` fields in Resend send call |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-email (CLI) | latest | Local preview server for email templates (`email dev`) | Dev-time only; not a production dependency |
| svix | latest | Webhook signature verification (alternative to resend.webhooks.verify) | Only needed if not using resend SDK's built-in verify; prefer built-in |
| crypto (Node built-in) | n/a | HMAC signing for unsubscribe tokens | Already used in project (crypto.randomUUID()) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Email | Handlebars / MJML | React Email has better TypeScript integration, is maintained by Resend, and is already idiomatic for this stack |
| Custom suppression table | Resend Audience unsubscribe | Audiences are for broadcast/marketing sends; transactional suppression requires your own DB record for pre-send checks |
| HMAC signed token | JWT (jsonwebtoken) | HMAC with Node crypto is sufficient for unsubscribe tokens and avoids an extra dependency; tokens are single-use with DB validation |

**Installation:**
```bash
npm install @react-email/components @react-email/render
npm install --save-dev react-email
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── emails/                        # React Email templates (server-only)
│   ├── verify-email.tsx           # Email verification template
│   ├── reset-password.tsx         # Password reset template
│   └── _components/               # Shared layout/header (optional)
├── lib/
│   ├── email.ts                   # Resend client (already exists; extend with send helper)
│   └── db/
│       └── schema.ts              # Add emailSuppressions table
├── app/
│   └── api/
│       ├── webhooks/
│       │   └── resend/
│       │       └── route.ts       # Webhook handler (bounce, complaint)
│       └── unsubscribe/
│           └── route.ts           # One-click POST + GET unsubscribe endpoint
└── actions/
    └── auth.ts                    # Upgrade existing sends to use React Email
```

### Pattern 1: React Email Template with HTML + Plain Text Render

**What:** Build email content as a React component, then render it to both HTML string and plain text string. Pass both to `resend.emails.send()`.
**When to use:** Every outgoing transactional email (MAIL-04 requirement).

```typescript
// src/emails/verify-email.tsx
// Source: https://resend.com/docs/send-with-nextjs
import {
  Html, Head, Body, Container, Heading,
  Text, Button, Hr, Font,
} from "@react-email/components"

interface VerifyEmailProps {
  verifyUrl: string
}

export function VerifyEmail({ verifyUrl }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9f9f9" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ fontSize: "20px", color: "#111" }}>
            Verify your Brief email address
          </Heading>
          <Text style={{ color: "#444" }}>
            Click the button below to verify your address. The link expires in 24 hours.
          </Text>
          <Button
            href={verifyUrl}
            style={{
              backgroundColor: "#111",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Verify email address
          </Button>
          <Hr style={{ borderColor: "#eee", marginTop: "24px" }} />
          <Text style={{ fontSize: "12px", color: "#999" }}>
            If you did not create a Brief account, ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

```typescript
// src/lib/email.ts — upgrade with typed send helper
// Source: https://resend.com/docs/send-with-nextjs + https://react.email/docs/utilities/render
import { Resend } from "resend"
import { render } from "@react-email/render"
import { VerifyEmail } from "@/emails/verify-email"

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, verifyUrl: string) {
  const html = await render(<VerifyEmail verifyUrl={verifyUrl} />)
  const text = await render(<VerifyEmail verifyUrl={verifyUrl} />, { plainText: true })

  return resend.emails.send({
    from: "Brief <noreply@mail.brief.app>",
    to: email,
    subject: "Verify your Brief email address",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${process.env.APP_URL}/api/unsubscribe?token=${generateUnsubscribeToken(email)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })
}
```

### Pattern 2: Webhook Route Handler (Bounce + Complaint)

**What:** App Router route at `/api/webhooks/resend` that receives Resend webhook events, verifies the signature using the built-in `resend.webhooks.verify()`, then upserts the sender's address into `emailSuppressions`.
**When to use:** MAIL-03 — automatic bounce/complaint suppression.

```typescript
// src/app/api/webhooks/resend/route.ts
// Source: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
import { NextRequest, NextResponse } from "next/server"
import { resend } from "@/lib/email"
import { db } from "@/lib/db/client"
import { emailSuppressions } from "@/lib/db/schema"

export async function POST(req: NextRequest) {
  // CRITICAL: use req.text() — req.json() re-serialises and breaks sig verification
  const payload = await req.text()

  let event: ReturnType<typeof resend.webhooks.verify>
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    })
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 400 })
  }

  const { type, data } = event as { type: string; data: { to: string[] } }

  if (type === "email.bounced" || type === "email.complained") {
    const email = data.to?.[0]
    if (email) {
      await db
        .insert(emailSuppressions)
        .values({ email, reason: type, suppressedAt: new Date() })
        .onConflictDoNothing()
    }
  }

  return new NextResponse("OK", { status: 200 })
}
```

### Pattern 3: One-Click Unsubscribe Endpoint

**What:** `/api/unsubscribe` accepts both GET (browser link click — show confirmation page or redirect) and POST (RFC 8058 one-click from email client). Both update the `emailSuppressions` table immediately.
**When to use:** AUTH-07 — user clicks unsubscribe link in email.

```typescript
// src/app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { emailSuppressions } from "@/lib/db/schema"

// POST — RFC 8058 one-click (email client fires this automatically)
export async function POST(req: NextRequest) {
  const { email } = await validateUnsubscribeToken(req)
  if (!email) return new NextResponse("Invalid token", { status: 400 })

  await db
    .insert(emailSuppressions)
    .values({ email, reason: "unsubscribe", suppressedAt: new Date() })
    .onConflictDoNothing()

  // RFC 8058 requires 200 or 202 with empty/minimal body
  return new NextResponse(null, { status: 200 })
}

// GET — browser click; redirect to a simple "You've been unsubscribed" page
export async function GET(req: NextRequest) {
  const { email } = await validateUnsubscribeToken(req)
  if (!email) return NextResponse.redirect(new URL("/", req.url))

  await db
    .insert(emailSuppressions)
    .values({ email, reason: "unsubscribe", suppressedAt: new Date() })
    .onConflictDoNothing()

  return NextResponse.redirect(new URL(`/unsubscribed?email=${encodeURIComponent(email)}`, req.url))
}
```

### Pattern 4: Signed Unsubscribe Token

**What:** HMAC-SHA256 token encodes `email + timestamp`. Verified on the endpoint. Short-lived (30 days) since emails typically read within days.
**Why not JWT:** Avoids extra dependency; Node crypto is already used in the project.

```typescript
// src/lib/email.ts — token helpers
import { createHmac } from "crypto"

function generateUnsubscribeToken(email: string): string {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  const payload = `${email}|${expires}`
  const sig = createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
    .update(payload)
    .digest("hex")
  return Buffer.from(`${payload}|${sig}`).toString("base64url")
}

async function validateUnsubscribeToken(
  req: NextRequest
): Promise<{ email: string | null }> {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return { email: null }

  try {
    const decoded = Buffer.from(token, "base64url").toString()
    const [email, expires, sig] = decoded.split("|")
    if (Date.now() > parseInt(expires)) return { email: null }

    const expected = createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
      .update(`${email}|${expires}`)
      .digest("hex")
    if (sig !== expected) return { email: null }

    return { email }
  } catch {
    return { email: null }
  }
}
```

### Pattern 5: Pre-Send Suppression Check

**What:** Before sending any email, query `emailSuppressions` to avoid sending to suppressed addresses. This is the application-layer guard (Resend also blocks at infrastructure level, but the app should be aware).
**When to use:** In the send helper in `src/lib/email.ts` before calling `resend.emails.send()`.

```typescript
// src/lib/email.ts
import { emailSuppressions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function isSuppressed(email: string): Promise<boolean> {
  const row = await db.query.emailSuppressions.findFirst({
    where: eq(emailSuppressions.email, email),
    columns: { id: true },
  })
  return !!row
}
```

### Pattern 6: Database Migration — emailSuppressions Table

```typescript
// Add to src/lib/db/schema.ts
export const emailSuppressions = pgTable("email_suppressions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(), // unique: one row per address
  reason: text("reason").notNull(), // "email.bounced" | "email.complained" | "unsubscribe"
  suppressedAt: timestamp("suppressed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})
```

### Anti-Patterns to Avoid

- **Parsing webhook body as JSON before verification:** `resend.webhooks.verify()` requires the raw string body. Calling `req.json()` re-serialises and breaks the HMAC signature. Always use `req.text()` first.
- **Sending to suppressed address via webhook/action:** The app MUST check `emailSuppressions` before sending. Resend suppresses at infrastructure level too, but relying on that alone means the project has no authoritative suppression record.
- **Storing unsubscribe tokens in the database:** Signed tokens are stateless — no lookup table needed. The signature + expiry embedded in the token is sufficient.
- **Using `react:` field without installing @react-email/render:** Resend SDK's `react:` field requires the consuming app to render the component to HTML. You must call `render()` manually and pass `html:` + `text:` fields. (As of Resend SDK v4+, `react:` is supported natively but still requires `@react-email/render` to be installed.)
- **DMARC p=reject immediately:** Start with `p=none` for observation. Once reports confirm clean alignment (SPF + DKIM both pass), progress to `p=quarantine`. Brief is a small sender so `p=none` is sufficient for Phase 2 compliance.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email template rendering to HTML | Custom HTML string builder | `@react-email/render` | React Email handles CSS inlining, cross-client compatibility, plain text stripping |
| Webhook signature verification | Custom HMAC re-implementation | `resend.webhooks.verify()` (built into SDK) | Handles svix timestamp window (5-minute replay protection), saves 30+ lines of crypto code |
| DNS authentication records | Manual SPF/DKIM record construction | Resend dashboard domain setup | Resend generates exact record values; any manual construction risks auth failures |
| Email client CSS compatibility | Custom inline-style calculations | React Email components with style props | Extensive cross-client testing baked in |

**Key insight:** The complexity in email infrastructure is in the details (CSS inlining, MIME multipart, svix timestamp windows, DNS propagation). All of these are solved problems with well-maintained tooling — the project's job is wiring them together correctly.

---

## Common Pitfalls

### Pitfall 1: Webhook Body Parsing Breaks Signature Verification
**What goes wrong:** Calling `await req.json()` before passing to `resend.webhooks.verify()` results in a `WebhookVerificationError` because JSON serialisation can reorder keys and alter whitespace.
**Why it happens:** The svix HMAC is computed over the exact raw bytes. Any transformation invalidates it.
**How to avoid:** Always `const payload = await req.text()` as the first line of the webhook handler.
**Warning signs:** Webhook verification always fails even with correct secret; works when tested with curl but fails in production.

### Pitfall 2: DNS Propagation Delays
**What goes wrong:** DNS records are added but MXToolbox check fails. SPF/DKIM/DMARC show as "not found".
**Why it happens:** DNS TTL — propagation can take up to 24–48 hours globally.
**How to avoid:** Add all DNS records at least 24 hours before testing. Use Resend dashboard "Check DNS" button to confirm server-side verification. Use MXToolbox specifically (not dig locally) as the acceptance test.
**Warning signs:** Resend domain shows "Pending" status.

### Pitfall 3: Missing `RESEND_WEBHOOK_SECRET` Environment Variable
**What goes wrong:** Webhook verification throws with an opaque error; all webhook events return 400.
**Why it happens:** The secret is separate from the API key; it's generated per webhook endpoint in the Resend dashboard.
**How to avoid:** After creating the webhook endpoint in the Resend dashboard, immediately copy the signing secret and add it to `.env.local` as `RESEND_WEBHOOK_SECRET`.
**Warning signs:** `webhookSecret` passed as `undefined` — TypeScript `!` assertion won't catch undefined at runtime without null check.

### Pitfall 4: List-Unsubscribe-Post Header Missing
**What goes wrong:** Gmail/Yahoo/Microsoft treat the email as lacking RFC 8058 one-click support; they show a regular "Report spam" button instead of "Unsubscribe".
**Why it happens:** Both `List-Unsubscribe` (with HTTPS URL) and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers are required together.
**How to avoid:** Always set both headers as a pair in every outgoing email helper.
**Warning signs:** Testing with Gmail shows no unsubscribe UI in the message.

### Pitfall 5: Unsubscribe Token Timing Attack
**What goes wrong:** Naive string comparison of HMAC signatures is vulnerable to timing attacks.
**Why it happens:** JavaScript string `===` short-circuits on first mismatched character.
**How to avoid:** Use `crypto.timingSafeEqual()` from Node's built-in crypto module when comparing the expected and provided signatures.
**Warning signs:** Not applicable during dev testing; surfaces in security audit.

### Pitfall 6: React Email `react:` Field vs. Manual Render
**What goes wrong:** Passing a React component to Resend's `react:` field without rendering first results in a plain `[object Object]` email.
**Why it happens:** The `react:` field in older SDK versions required pre-rendered HTML; in newer versions it may render server-side but requires `@react-email/render` to be installed.
**How to avoid:** Always call `await render(<Template />)` and `await render(<Template />, { plainText: true })` explicitly, then pass results to `html:` and `text:` fields. This is explicit, testable, and version-agnostic.

### Pitfall 7: Sending Domain Must Match `from:` Address Domain
**What goes wrong:** SPF/DKIM verification fails because `from: "noreply@mail.brief.app"` is used but the domain verified in Resend is `brief.app`.
**Why it happens:** DNS authentication is scoped to the exact domain/subdomain. `mail.brief.app` is a subdomain — it requires its own DNS records or must be verified as a subdomain under `brief.app`.
**How to avoid:** The Phase 1 code already uses `noreply@mail.brief.app` — verify `mail.brief.app` as the sending domain in Resend, not `brief.app`.

---

## Code Examples

### Sending with HTML + Text (MAIL-04 Pattern)

```typescript
// Source: https://resend.com/docs/send-with-nextjs
// Source: https://react.email/docs/utilities/render
import { render } from "@react-email/render"
import { VerifyEmail } from "@/emails/verify-email"

const html = await render(<VerifyEmail verifyUrl={url} />)
const text = await render(<VerifyEmail verifyUrl={url} />, { plainText: true })

await resend.emails.send({
  from: "Brief <noreply@mail.brief.app>",
  to: recipientEmail,
  subject: "Verify your Brief email address",
  html,
  text,
  headers: {
    "List-Unsubscribe": `<${process.env.APP_URL}/api/unsubscribe?token=${token}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
})
```

### Webhook Handler Skeleton

```typescript
// Source: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
// CRITICAL: req.text() — not req.json()
const payload = await req.text()

const event = resend.webhooks.verify({
  payload,
  headers: {
    id: req.headers.get("svix-id") ?? "",
    timestamp: req.headers.get("svix-timestamp") ?? "",
    signature: req.headers.get("svix-signature") ?? "",
  },
  webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
})
```

### emailSuppressions Schema

```typescript
// Source: Drizzle ORM pattern matching existing schema.ts conventions
export const emailSuppressions = pgTable("email_suppressions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  reason: text("reason").notNull(), // "email.bounced" | "email.complained" | "unsubscribe"
  suppressedAt: timestamp("suppressed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})
```

### Pre-Send Suppression Check

```typescript
// Source: existing Drizzle query pattern from auth.ts
const suppressed = await db.query.emailSuppressions.findFirst({
  where: eq(emailSuppressions.email, recipientEmail),
  columns: { id: true },
})
if (suppressed) return // skip send
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `renderAsync()` from react-email | `render()` (async by default) | January 2025 | `renderAsync` is deprecated; use `render()` everywhere |
| Manual HTML string templates | React Email components | 2022–present | Cross-client compatibility automated |
| Svix library directly for verification | `resend.webhooks.verify()` built into SDK | Resend SDK v3+ | One fewer dependency |
| p=none DMARC optional | p=none DMARC required by Gmail, Yahoo, Microsoft | May 2025 (Microsoft enforced) | DMARC record is now mandatory, not optional |

**Deprecated/outdated:**
- `renderAsync`: Replaced by `render()` which is async by default as of January 2025 — do not use.
- Installing `svix` separately for webhook verification: SDK has `resend.webhooks.verify()` built in — prefer that.

---

## DNS Authentication Reference

### Records to Add in Resend Dashboard → Domain Setup

Resend generates exact values in its dashboard. The record types are:

| Record Type | Purpose | Notes |
|-------------|---------|-------|
| TXT (SPF) | Declares Resend's servers as authorised senders for `mail.brief.app` | Resend generates the value; one SPF record per (sub)domain |
| TXT (DKIM) | Public key for signature verification | Resend generates a subdomain selector (e.g., `resend._domainkey.mail.brief.app`) |
| MX | Enables bounce feedback routing | Set on `mail.brief.app` or a dedicated subdomain |
| TXT (DMARC) | Policy for authentication failures | Add manually: `_dmarc.mail.brief.app` → `v=DMARC1; p=none; rua=mailto:dmarc-reports@brief.app` |

### DMARC Minimum for Phase 2

```
v=DMARC1; p=none; rua=mailto:dmarc-reports@brief.app
```

`p=none` means no action on failures — just monitoring. This satisfies Gmail, Yahoo, and Microsoft 2025 requirements for all sender volumes. Progress to `p=quarantine` once alignment is confirmed in reports.

### Verification Checklist (MXToolbox)

Before sending any real email:
1. `https://mxtoolbox.com/spf.aspx` — enter `mail.brief.app` → must show "SPF Record Found"
2. `https://mxtoolbox.com/dkim.aspx` — enter domain + Resend selector → must show valid DKIM
3. `https://mxtoolbox.com/dmarc.aspx` — enter `mail.brief.app` → must show DMARC record

---

## New Environment Variables Required

| Variable | Purpose | Source |
|----------|---------|--------|
| `RESEND_WEBHOOK_SECRET` | Verify webhook signatures (from Resend dashboard webhook detail page) | Resend dashboard → Webhooks → [endpoint] → Signing Secret |
| `UNSUBSCRIBE_SECRET` | HMAC key for signing unsubscribe tokens | Generate: `openssl rand -hex 32` |

These must be added to `.env.local` and Vercel/deployment environment.

---

## Open Questions

1. **Does `mail.brief.app` subdomain already exist in DNS?**
   - What we know: Phase 1 sends from `noreply@mail.brief.app`; this was decided prior to this phase.
   - What's unclear: Whether the domain is registered and whether DNS access is available to add records.
   - Recommendation: Verify domain ownership and DNS access before starting MAIL-02 work. If `brief.app` is not registered, the registrar and DNS provider must be known.

2. **Resend free tier limits for Phase 2 testing**
   - What we know: Free tier = 100 emails/day, 3,000/month. Brief is a closed beta targeting 10-20 users.
   - What's unclear: Whether verification + password reset volumes could hit daily limits during load testing.
   - Recommendation: Free tier is adequate for closed beta. Monitor usage in Resend dashboard; upgrade to paid ($20/mo for 50k emails) when approaching limits.

3. **Should the unsubscribe page `/unsubscribed` be built in Phase 2?**
   - What we know: AUTH-07 requires "immediate processing." The POST endpoint returns 200 immediately. The GET redirect needs a destination.
   - What's unclear: CONTEXT.md says "Admin suppression list UI — not in scope" but a minimal public-facing `/unsubscribed` confirmation page (not admin) may be needed for the GET flow.
   - Recommendation: Build a minimal static `/unsubscribed` page (no admin functionality) in Phase 2 to complete the GET unsubscribe flow. This is not a suppression list UI.

---

## Sources

### Primary (HIGH confidence)
- https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests — webhook signature verification, svix headers, `resend.webhooks.verify()` API
- https://resend.com/docs/dashboard/webhooks/event-types — all 17 webhook event types including `email.bounced`, `email.complained`, `email.suppressed`
- https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails — `List-Unsubscribe` + `List-Unsubscribe-Post` headers, RFC 8058 requirements
- https://resend.com/docs/send-with-nextjs — Next.js App Router integration, `headers:` field usage in SDK
- https://react.email/docs/utilities/render — `render()` async function API, `plainText: true` option
- https://resend.com/blog/react-email-5 — React Email 5.0 release (Nov 2025), current recommended packages
- https://resend.com/docs/knowledge-base/account-quotas-and-limits — free tier: 100/day, 3,000/month, 2 req/sec API rate limit

### Secondary (MEDIUM confidence)
- https://resend.com/blog/microsoft-bulk-sending-requirements-2025 — Microsoft's DMARC p=none enforcement from May 5, 2025
- https://resend.com/blog/email-authentication-a-developers-guide — SPF/DKIM handled by Resend; DMARC is add-your-own
- https://resend.com/docs/dashboard/emails/email-suppressions — automatic suppression on hard bounce/complaint; suppression is per-region across all domains
- https://www.npmjs.com/package/@react-email/components — version 1.0.8 (as of search date, updated ~daily)

### Tertiary (LOW confidence)
- WebSearch: "DMARC p=none transactional email sender 2025" — multiple sources agree p=none is minimum required; not verified against Resend-specific docs but consistent across industry.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Resend SDK already installed; react-email packages verified on npm; render API verified
- Architecture: HIGH — webhook pattern verified against official Resend docs; unsubscribe token pattern uses Node built-ins
- Pitfalls: HIGH — raw body requirement verified from official docs; DNS pitfalls from Resend domain docs; timing attack is standard security knowledge
- DNS authentication: MEDIUM — exact record values come from Resend dashboard (not static); types and process verified from docs

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (Resend SDK and react-email are actively maintained; check npm for latest patch versions before installing)
