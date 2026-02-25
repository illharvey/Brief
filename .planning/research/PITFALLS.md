# Pitfalls Research

**Domain:** Personalised news briefing / email newsletter SaaS
**Researched:** 2026-02-25
**Confidence:** MEDIUM (training knowledge; web verification unavailable in this session — flags noted per pitfall)

---

## Critical Pitfalls

### Pitfall 1: Email Deliverability Collapse from Skipping Authentication

**What goes wrong:**
Emails land in spam or are silently dropped by major providers (Gmail, Outlook, Yahoo). Open rates crater. Users think the product is broken, or never realise they signed up at all. At scale, the sending domain gets blocklisted and recovery takes weeks.

**Why it happens:**
Developers focus on "emails are sending" (the SMTP transaction succeeds) and never verify that emails are *arriving in the inbox*. SPF, DKIM, and DMARC are seen as DNS busywork and left until "later." Later never comes until a user complains.

Additionally: as of February 2024, Google and Yahoo enforced mandatory DMARC policies for bulk senders (>5,000 emails/day), and both continue tightening policies. Even at PoC scale, bad auth habits get established early.

**How to avoid:**
- Set up SPF, DKIM, and DMARC records on the sending domain *before the first email is sent* — not after.
- Use a dedicated sending subdomain (e.g. `mail.brief.app`) rather than the root domain; this isolates reputation.
- Use a reputable transactional email provider (Resend, Postmark, or SendGrid) rather than self-hosting SMTP — they handle DKIM signing and pool reputation.
- Add one-click unsubscribe header (RFC 8058) and a visible unsubscribe link in every email. Gmail now requires this.
- Keep an eye on Google Postmaster Tools from day one — it surfaces reputation and spam rate signals.

**Warning signs:**
- Emails to your own test address land in spam/promotions tab.
- Open rates below 20% in early beta with engaged users (engaged users should open >50%).
- Bounce rates above 2% within the first 100 sends.
- Google Postmaster Tools shows "bad" domain reputation.

**Phase to address:** Core Infrastructure (phase 1 or 2) — before any email is sent to beta users.

---

### Pitfall 2: AI Cost Runaway — Per-User Summarisation is Expensive at Scale

**What goes wrong:**
At 10-20 beta users, AI costs are negligible (pennies). At 1,000 users with 10 topics each and 20 articles per topic, each summarisation pass becomes expensive. Engineers wire up the AI call inside the per-user loop without caching or batching, and costs scale linearly with users x topics x articles.

**Why it happens:**
"It works fine in dev" — dev has 1-2 test users. The architecture decision to call the LLM once per user-topic pair is never questioned because the failure mode is invisible until the first monthly invoice.

Concretely: if summarising 5 articles per topic costs $0.005 per call (GPT-4o at ~$0.01/1K tokens) and a user has 5 topics, that's $0.025/user/day = $9/user/year. At 1,000 users that's $9,000/year just for AI — before hosting, email sending, or anything else. At v1 with free tiers, this destroys the unit economics.

**How to avoid:**
- Summarise at the *article level*, not the *user level* — a given article may appear in multiple users' briefings. Cache the article summary (keyed on article URL + a short freshness window).
- Separate the "collect + summarise articles" pipeline from the "personalise + stitch briefing" pipeline. The former is topic-scoped (shared), the latter is user-scoped (cheap, since it's just template/prompt assembly on pre-summarised content).
- Implement hard token limits per briefing. Set `max_tokens` on every LLM call.
- Add cost alerting before launch: set a hard spend cap in the LLM provider dashboard.
- For v1, use smaller models (Claude Haiku or GPT-4o-mini) for summarisation; reserve the larger models only if quality is provably insufficient.

**Warning signs:**
- Daily AI spend is $X per user rather than $X per article.
- No caching layer between the feed fetch and the LLM call.
- Same article URL appearing in multiple users' briefings but the LLM being called separately for each.

**Phase to address:** Content Pipeline (whichever phase builds the summarisation engine) — the caching architecture must be designed in, not bolted on.

---

### Pitfall 3: RSS Feed Reliability — Treating Feeds as Stable APIs

**What goes wrong:**
RSS feeds go down, return malformed XML, silently change their URL, throttle crawlers, or return HTTP 200 with an error page body. Without resilience, the content pipeline crashes silently and users receive empty or stale briefings — with no error surfaced to operators.

**Why it happens:**
RSS is treated like a REST API contract. It is not. Feeds are maintained with varying care levels — a BBC feed and a niche blog feed behave very differently. Developers test against the happy path (valid XML, 200 response) and never test against feed errors.

**How to avoid:**
- Wrap every feed fetch in try/catch with per-feed error tracking. Never let one bad feed crash the whole pipeline run.
- Store the last-known-good response per feed. If a fetch fails, fall back to the cached version with a staleness flag rather than producing an empty briefing.
- Implement exponential backoff and a circuit breaker: if a feed fails 3 consecutive times, pause polling it for 24h before retrying.
- Validate parsed XML before storing — check for required fields (title, link, pubDate).
- Normalise feed content: strip HTML entities, handle encoding differences (UTF-8 vs latin-1), handle missing pubDate by using fetch time.
- Use a feed user-agent string that identifies your crawler (per RSS etiquette and to avoid bot-blocking).
- For PoC scale, a lightweight Node library like `rss-parser` or Python's `feedparser` handles most normalisation edge cases — don't write your own parser.

**Warning signs:**
- Pipeline logs show 200 responses with HTML content (feed URL has redirected to a webpage).
- Briefings occasionally arrive with fewer articles than expected, with no corresponding error log.
- Duplicate articles appearing because `guid`/`link` deduplication is not implemented.

**Phase to address:** Content Pipeline — resilience patterns must be in the feed fetching layer from the start.

---

### Pitfall 4: GDPR / CAN-SPAM Non-Compliance Treated as an Afterthought

**What goes wrong:**
The product ships without a functioning unsubscribe mechanism, without a privacy policy, without audit-quality records of user consent, or stores EU user data without proper legal basis. Any of these can result in GDPR fines, email provider suspension, or being labelled as spam.

**Why it happens:**
"It's just a small beta." Legal compliance feels like a large-company concern. Developers focus on the product and defer the compliance work indefinitely. The beta users are friends, so nobody complains — until the product grows or one person hits "report spam."

**How to avoid:**
- One-click unsubscribe in every email (both a link in the body and the `List-Unsubscribe` header). This is mandatory under CAN-SPAM and strongly enforced by Gmail/Yahoo bulk sender requirements.
- Process unsubscribes within 10 business days (CAN-SPAM) — but in practice, process immediately (within seconds of click) to avoid sending to someone who already unsubscribed.
- Privacy policy must exist and be linked from signup. It must state what data is collected, how it is used, and how users can request deletion.
- Log the explicit consent event at signup (timestamp, IP, what the user agreed to). Store this in a `user_consents` table. Required to demonstrate lawful basis under GDPR Art.6.
- For EU users: ensure data processing agreement (DPA) with any third-party processor (email provider, AI provider, analytics).
- Right to erasure: implement a user data deletion flow before the beta, even if it's a manual process initially.

**Warning signs:**
- No `List-Unsubscribe` header in email headers (check with any email header viewer).
- Unsubscribe link leads to a dead page or requires logging in.
- No consent timestamp recorded at account creation.
- User data stored in a region with no DPA coverage.

**Phase to address:** Auth / Account phase — consent recording and unsubscribe infrastructure must be in place at user onboarding, not added later.

---

### Pitfall 5: AI Hallucination and Fabricated News Content

**What goes wrong:**
The AI summarisation layer invents facts, misattributes quotes, combines details from different articles, or — worst case — fabricates a story that never happened. A user receives a "news briefing" that contains false information and attributes it to a real publication.

**Why it happens:**
The LLM is prompted to "summarise these articles" but is not constrained to only use information from the provided source material. Models will fill gaps from training data, confidently combining context-window content with memorised facts. The problem is invisible during development because developers read the output looking for coherence, not factual accuracy.

**How to avoid:**
- Ground the summarisation prompt explicitly: "You must only use information from the provided article text. Do not add facts from external knowledge. If the article does not contain enough information, say so."
- Include the full article text in the prompt (not just the title + description). RSS feeds often contain only a teaser; fetch the full article body for summarisation.
- Add a post-summarisation validation step: check that key named entities (people, organisations, numbers) from the summary also appear in the source text.
- Display source attribution prominently in every briefing item — the source URL and publication name. This creates accountability and lets users verify.
- Avoid chaining summaries (summarising a summary) — information loss compounds hallucination risk.

**Warning signs:**
- Summary contains specific numbers, quotes, or people not present in the source article text.
- LLM output mentions events or context that "fills in" beyond the article scope.
- No source URL displayed next to each summary in the briefing.

**Phase to address:** AI Summarisation phase — the grounding prompt and attribution display must be designed together, not separately.

---

### Pitfall 6: Uncontrolled Email Bounce and Complaint Rates

**What goes wrong:**
Hard bounces (invalid email addresses) and spam complaints accumulate silently. Once a sending domain's bounce rate exceeds ~2% or complaint rate exceeds ~0.08% (Google's threshold), reputation tanks and deliverability collapses across all users — even valid ones.

**Why it happens:**
Developers wire up the email send but don't wire up the webhooks from the email provider that report bounces, spam complaints, and unsubscribes. Without webhooks, the database still has the email address marked as active, and sends continue — digging the reputation hole deeper.

**How to avoid:**
- Implement bounce and complaint webhooks from the email provider (Resend, Postmark, SendGrid all provide these) on day one.
- On hard bounce: immediately mark the address as undeliverable in the database and never send to it again.
- On spam complaint: immediately suppress the address (treat as unsubscribe).
- On soft bounce: mark it, and after 3 consecutive soft bounces, suppress it.
- Use a double opt-in flow for new signups — this eliminates typo addresses and bot signups, both of which cause hard bounces.

**Warning signs:**
- Email provider dashboard shows growing bounce list but the application database still shows those addresses as active/subscribed.
- No webhook endpoint exists in the application for the email provider's events.
- Postmaster Tools domain reputation degrades over time despite low send volume.

**Phase to address:** Email Delivery phase — webhook handling must be built alongside the sending logic, not as a later enhancement.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Calling LLM per user instead of per article | Simpler code | Cost scales linearly with users; rewrites required at scale | Never — design article-level caching from the start |
| Skipping double opt-in | Faster signup UX | Bounce rates spike from typo addresses; damages sender reputation | Never for email products |
| Hardcoding RSS feed URLs in config | No database required for v1 | Adding/editing sources requires code deploys; users can't customise sources | Only if sources are truly static and user-customisable sources are explicitly out of scope |
| Storing full article HTML in the database | Easy to implement | Storage bloat; stale content; 100x the data you need | Never — store article metadata + summary only; fetch body on demand |
| No idempotency on briefing generation | Simpler queue logic | Duplicate emails sent on job retry; users receive the same briefing twice | Never for email sends |
| Processing all users synchronously in one job | Simple cron logic | Job timeout at 50+ users; no partial failure recovery | PoC only — refactor to per-user queued jobs before any public beta |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Resend / SendGrid / Postmark | Not configuring webhooks for bounces and complaints | Wire up event webhooks on day one, before first send |
| RSS feeds | Trusting the HTTP 200 status code as success | Parse response body; validate XML structure; check for error pages masquerading as 200 |
| NewsAPI / Guardian API | Not respecting rate limits or pagination | Implement rate-limit-aware fetching with backoff; cache results; store `page` cursor for pagination |
| OpenAI / Anthropic API | Not setting `max_tokens` per call | Always set a token budget; LLM calls without limits will use maximum context and maximise cost |
| OpenAI / Anthropic API | Retrying failed calls without exponential backoff | Rate limit errors require backoff + jitter; tight retry loops will exhaust the rate limit cap |
| Any news API | Storing raw API responses | APIs change schema; store only the normalised data you need in your own schema |
| Email HTML rendering | Using modern CSS expecting full support | Email clients (especially Outlook) have severe CSS limitations; test with Litmus or Email on Acid, or use a battle-tested template like MJML |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| All-users-in-one-cron-job | Job timeout; partial send; no retry for failed users | Queue-based architecture with one job per user | ~50 users (2-minute job timeout threshold) |
| Synchronous LLM calls in the email pipeline | Pipeline stalls when LLM API is slow or rate-limited | Async job queue; decouple LLM calls from email send | From day one — LLM latency is 2-30s per call |
| Fetching all feeds on every run without caching | Feed hosts get hammered; throttling/blocking | Respect `Cache-Control` / `ETag` headers; store `last_fetched` and `etag` per feed | ~20 feeds polling every 15 minutes |
| N+1 database queries in briefing assembly | Slow briefing generation as article count grows | Eager load articles + topics per user in one query | ~100 articles in DB |
| No deduplication of articles across topics | Same article appears multiple times in a briefing | Track seen `guid`/`url` per user per run | Any user with overlapping topics |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Unsubscribe link with predictable token (e.g. `?user_id=123`) | Anyone can unsubscribe any user by guessing IDs | Use cryptographically random, single-use or HMAC-signed unsubscribe tokens |
| Storing API keys (LLM, email, news) in version control | Full key exposure; financial and data liability | Environment variables only; rotate keys before first commit; use `.gitignore` for `.env` |
| Rendering AI-generated content as raw HTML in the web app | XSS if AI output contains injected script tags | Always sanitise or render AI output as plain text / escaped HTML |
| No rate limiting on the briefing generation API endpoint | Abuse can trigger large LLM bills | Rate limit by user; add per-user daily cap in DB; set hard spend cap in LLM dashboard |
| Exposing internal article IDs in URLs without auth check | Users can view other users' personalised content | Verify ownership on every article/briefing fetch; never rely on obscure IDs |
| Logging full email content in application logs | Privacy violation; GDPR risk | Log metadata only (user_id, briefing_id, status); never log email body or PII |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Sending the first briefing immediately after signup | User gets a briefing before they've finished setting up preferences | Queue the first briefing for the next scheduled send cycle; show a "your first briefing arrives tomorrow" confirmation |
| No web preview of the email | Users don't know what they'll receive until it arrives; high unsubscribe rates | Provide a web-viewable version of each briefing (hosted URL); link from the email |
| Topic selection with no feedback | User picks "Artificial Intelligence" but doesn't know if that will find good content | Show a source preview / sample article count during topic setup |
| Briefing arrives at wrong time due to timezone bugs | Users receive email at 3am instead of 8am | Store delivery time in user's local timezone; convert to UTC on the server; test across DST changes |
| Generic subject lines ("Your Daily Brief") | Low open rates; email feels like a product notification, not a curated read | Generate subject lines from the day's top story using the AI layer |
| No read confirmation or "briefing received" signal | Users don't know if their briefing is coming; anxiety / support requests | Show "Next briefing: tomorrow at 8am" on the web dashboard |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Email authentication:** SPF, DKIM, and DMARC records set AND verified with an external checker (mxtoolbox.com) — just adding them is not enough; they must pass validation.
- [ ] **Unsubscribe:** Unsubscribe link works, processes immediately, and the address is suppressed within the same database transaction — not just a dead link.
- [ ] **Bounce handling:** Webhook endpoint exists AND is registered in the email provider's dashboard AND is processing events into the database — all three must be true.
- [ ] **AI cost cap:** Spend cap configured in the LLM provider dashboard, not just estimated in a spreadsheet — alerts fire before the cap is hit.
- [ ] **Feed resilience:** A failing feed does not prevent briefings from being generated for other topics — test by deliberately pointing one feed URL at a 500 endpoint.
- [ ] **Timezone delivery:** Delivery time is stored and processed in UTC with timezone offset per user — test by creating a user in UTC+12 and UTC-8 and verifying send times.
- [ ] **Duplicate emails:** Job retries do not send duplicate briefings — test by re-running the job with the same date and verifying idempotency.
- [ ] **Consent record:** Signup creates a consent record in the database with timestamp — not just a `created_at` on the user row.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Domain blocklisted due to spam complaints | HIGH | Switch to new subdomain; warm up slowly; audit and clean list; submit delisting requests to major blocklists (MXToolbox) |
| LLM bill runaway | MEDIUM | Immediately disable job queue; add per-user rate limits and spend cap; audit which user/topic caused the spike; consider switching to smaller model |
| Feed producing malformed content pollutes briefings | LOW | Disable the specific feed; re-run briefing generation without it; add feed validation before the next run |
| GDPR deletion request received | MEDIUM | Execute deletion across all tables (user, consents, briefings, article cache tied to user); confirm deletion in writing to requestor within 30 days |
| AI hallucination published to users | MEDIUM | Temporarily disable affected topic/source; send correction email to affected users; add source-grounding validation to prompt before re-enabling |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Email authentication failure | Infrastructure / Email Setup | Check MX Toolbox for SPF/DKIM/DMARC pass before first send |
| Bounce / complaint webhook gap | Email Delivery phase | Trigger a test bounce and confirm database suppression |
| AI cost runaway | Content Pipeline / AI Summarisation | Confirm article-level caching; verify per-user cost in staging with 10 simulated users |
| RSS feed unreliability | Content Pipeline / Feed Fetching | Inject a 500-returning feed URL and verify the pipeline continues for other feeds |
| GDPR / consent gap | Auth / User Onboarding phase | Confirm consent record created on signup; verify unsubscribe flow before any user added to beta |
| AI hallucination | AI Summarisation phase | Manual audit of 20+ summaries against source text; add grounding instruction to prompt |
| Duplicate email sends | Job Queue / Scheduling phase | Run the briefing job twice for the same date; verify only one email sent |
| Timezone delivery bugs | Scheduling / Delivery phase | Create test users across UTC+12, UTC, UTC-8; verify emails arrive at correct local time |
| Email HTML rendering issues | Email Template phase | Test HTML template in Litmus or Mail Tester across Gmail, Outlook, Apple Mail before first send |

---

## Sources

- Confidence: MEDIUM — drawn from training knowledge (cutoff August 2025) covering Google/Yahoo 2024 bulk sender requirements (official announcements), CAN-SPAM Act requirements (FTC official documentation), GDPR Art.6/Art.17 (official EU regulation text), and observed patterns in newsletter SaaS post-mortems and engineering blog posts.
- Google Bulk Sender Requirements (2024): https://support.google.com/mail/answer/81126 — verify current enforcement thresholds (0.08% complaint rate, 2% bounce rate).
- Yahoo Sender Requirements (2024): https://senders.yahooinc.com/best-practices/ — verify current requirements in parallel with Google.
- CAN-SPAM Act (FTC): https://www.ftc.gov/tips-advice/business-center/guidance/can-spam-act-compliance-guide-business — authoritative, stable reference.
- GDPR Art.6 (lawful basis) and Art.17 (right to erasure): https://gdpr-info.eu/ — authoritative.
- RFC 8058 (one-click unsubscribe): https://datatracker.ietf.org/doc/html/rfc8058 — required by Gmail as of 2024.
- Note: Web verification was unavailable in this research session. All claims should be spot-checked against current provider documentation (Google Postmaster Tools, Resend/Postmark docs) before roadmap finalisation.

---
*Pitfalls research for: personalised news briefing / email newsletter SaaS (Brief)*
*Researched: 2026-02-25*
