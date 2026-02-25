# Feature Research

**Domain:** Personalised daily news briefing / email newsletter
**Researched:** 2026-02-25
**Confidence:** MEDIUM (web search and fetch unavailable; analysis based on training knowledge of named competitors through mid-2025; flagged per section)

---

## Competitive Landscape Overview

Products analysed:

| Product | Type | Key differentiator | Status |
|---------|------|--------------------|--------|
| Morning Brew | Editorial email newsletter | Strong brand voice, curated by editors | Active |
| The Skimm | Editorial email newsletter | Female-skewing voice, calendar integration | Active |
| Feedly | RSS aggregator + AI filter | Source-based following, Leo AI prioritisation | Active |
| Artifact | AI news feed app | Personalised ranking, AI rewrites | Shut down Feb 2024 |
| Refind | Algorithmic daily email | 5 links/day, quality-over-quantity | Active |
| Mailbrew | DIY digest builder | User-composed digest from any source | Active |
| Briefing | Personalised digest | Similar to Mailbrew concept | Active (LOW confidence) |

**Note on Artifact shutdown:** Artifact's Feb 2024 closure is instructive. The team cited the market size limitation of news aggregation as a standalone business. Their AI features were excellent technically but did not overcome the monetisation problem. Brief should note this as a cautionary signal — the AI layer alone is not a moat.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Account creation (email + password) | Any personalised product requires identity | LOW | OAuth optional; email/password sufficient for PoC |
| Topic selection / interest setup | Core personalisation promise — every competitor has this | MEDIUM | Must feel responsive; empty state must be handled well |
| Configurable delivery time | Users have different morning routines; fixed time is a dealbreaker for many | LOW | Timezone-aware scheduling is the tricky part |
| Email delivery of briefing | This is the product — the email IS the product for most users | MEDIUM | HTML email rendering across clients is harder than it looks |
| Clean, readable email format | Users compare to Morning Brew — if it looks broken or ugly, they churn | MEDIUM | Mobile-first email template; tested across Gmail, Apple Mail, Outlook |
| Web view of briefing | Users want to share, revisit, or read on desktop; email-only feels incomplete | MEDIUM | Archive/history page per user; not just a duplicate of email |
| Briefing history / archive | Users expect to retrieve yesterday's briefing | LOW | Simple date-indexed storage per user |
| Unsubscribe / opt-out | Legal requirement (CAN-SPAM, GDPR); users expect one-click | LOW | Standard list-unsubscribe header + landing page |
| Preference editing | Users' interests change; inability to update = churn | LOW | Settings page for topics and delivery time |
| Source quality signal | Users trust the product to surface good sources, not spam | HIGH | Source curation is editorial work, not just technical |

**Confidence: MEDIUM** — Derived from direct competitor observation across multiple established products. The email + web view + preference editing pattern is consistent across all named competitors.

---

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required at launch, but where Brief wins or loses against incumbents.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| True AI summarisation (not headlines) | Feedly/Mailbrew pull headlines; Brief synthesises full content into a narrative digest — fundamentally different product | HIGH | Requires LLM call per topic per user per day; cost and quality are both risks |
| Noise-free curation (no ads, no algo manipulation) | Explicit anti-thesis to X/algorithmic feeds; users who've left toxic feeds are the target | LOW (positioning) | This is a product philosophy, not a feature — but must be upheld consistently |
| Freeform topic entry (not category picker) | Competitors offer predefined categories; user-typed topics ("Scottish independence", "Formula 1 team radio") feel genuinely personalised | MEDIUM | Requires topic-to-source mapping logic; may need fuzzy matching or AI topic resolution |
| Adjacent topic suggestions | "You follow Tech — you might like AI Policy" increases content surface and reduces churn from thin topics | MEDIUM | Needs topic taxonomy; can start simple with rule-based suggestions |
| Briefing tone / reading level customisation | Some users want executive summary bullet points; others want narrative prose | MEDIUM | Prompt-level feature; requires UX to expose the setting |
| Source transparency | Show which sources each summary drew from; builds trust that Mailbrew (headlines-only) and editorial newsletters (opaque) don't offer | LOW | Per-story source attribution in email/web view |
| Per-section feedback ("more like this" / "less like this") | Inline signals improve future briefings without a separate preference session | MEDIUM | Requires feedback capture in email (difficult) or web view (easier) |
| Digest-level feedback / rating | Weekly prompt asking "how was this week?" drives retention and provides training signal | LOW | Simple 1-5 star in email or web view |

**Confidence: MEDIUM** — AI summarisation as a differentiator is well-supported by the Artifact and Feedly Leo comparison. Freeform topic entry is observed as absent from most competitors (most use category pickers). Source transparency is a gap in the editorial newsletter category.

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems — explicitly avoid these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Social / sharing feed | Users want to share interesting stories | Requires community moderation, shifts product from tool to platform, enormous scope increase; Artifact tried it and it didn't save them | Add share-to-link for individual briefings (static web URL, shareable) |
| Real-time news alerts / push notifications | "Breaking news" feels urgent | Contradicts Brief's core value of signal-over-noise daily digest; creates a news dependency loop; requires mobile app or browser push infrastructure | Stick to scheduled daily delivery; let urgency be someone else's problem |
| Full RSS reader / "read it later" | Power users request it | Feedly does this better and it's a different product entirely; scope creep that dilutes the briefing core | Brief is for people who don't want to manage a feed reader; recommend Feedly to power users |
| Social login only (no email/password) | Simpler onboarding | OAuth dependency; Google/Apple account linking adds failure modes; email/password is more reliable for a beta product and aligns with email-first delivery | Support OAuth as optional addition post-v1 |
| Weekly digest option | Users who prefer lower frequency | Weekly cadence reduces feedback loop, makes personalisation harder to improve, and reduces the daily habit formation that drives retention | Let users disable delivery on specific days rather than switching to weekly mode |
| Comment sections on briefings | Community engagement | Moderation burden, requires notification system, shifts focus from content to community | If community is wanted, link to a Discord/Slack instead |
| Podcast / audio briefing | "Morning commute" use case | TTS quality for AI-generated text is passable but adds infra cost; market is dominated by established players (Audm, Artifact had this) | Text-first; audio is a v2+ stretch if demand is validated |
| Advertiser-sponsored sections | Revenue | Corrupts the "no ads, no manipulation" core value proposition; users will notice and distrust curation | Paid subscription is the correct monetisation path |
| Infinite scroll / "keep reading" | Engagement maximisation | This is exactly what Brief is replacing; dark pattern that contradicts the product ethos | Hard stop after briefing ends; link to full articles for those who want depth |

**Confidence: MEDIUM** — Anti-feature rationale is derived from competitor outcomes (Artifact shutdown, Feedly complexity) and Brief's explicit PROJECT.md constraints (no X API, no mobile app, anti-algorithmic positioning).

---

## Feature Dependencies

```
[User Account]
    └──requires──> [Topic Selection]
                       └──requires──> [Source Aggregation per Topic]
                                          └──requires──> [AI Summarisation]
                                                             └──requires──> [Email Delivery]
                                                             └──requires──> [Web View / Archive]

[Delivery Time Configuration]
    └──requires──> [User Account]
    └──requires──> [Timezone handling in scheduler]

[Source Transparency]
    └──enhances──> [AI Summarisation]
    (needs source metadata passed through summarisation pipeline)

[Per-Section Feedback]
    └──requires──> [Web View / Archive]
    (email click-tracking for feedback is fragile; web view is the reliable capture surface)

[Adjacent Topic Suggestions]
    └──requires──> [Topic Selection] (need existing topics to suggest from)
    └──enhances──> [Source Aggregation per Topic]

[Briefing History]
    └──requires──> [Email Delivery] (briefings must be stored, not just sent)

[Preference Editing]
    └──requires──> [User Account]
    └──requires──> [Topic Selection]

[Digest-Level Feedback]
    └──requires──> [Web View / Archive] OR [Email Delivery] (can be a link in email)
```

### Dependency Notes

- **Email Delivery requires AI Summarisation:** Brief sends synthesised content, not headlines. The delivery mechanism is downstream of the summarisation pipeline.
- **Web View is not optional:** It's required for reliable feedback capture, briefing history, and preference management. Email-only is incomplete.
- **Source Aggregation per Topic is the hardest dependency:** Mapping freeform user topics to quality RSS/API sources is editorial + technical work and must precede everything downstream.
- **Timezone handling is a silent dependency:** Delivery time configuration sounds simple but requires correct timezone storage and scheduler execution — a common source of bugs.

---

## MVP Definition

### Launch With (v1 — PoC to validate core loop)

- [ ] User account (email/password signup) — required for personalisation
- [ ] Topic selection (freeform text, minimum 1, suggested max 5 for PoC) — core personalisation mechanism
- [ ] Delivery time configuration (hour + timezone) — the daily habit formation hook
- [ ] Source aggregation per topic (RSS feeds + NewsAPI/Guardian API) — content backbone
- [ ] AI summarisation per topic into a unified briefing (Claude or GPT-4o) — the core differentiator
- [ ] Email delivery at scheduled time (via Resend/SendGrid/Postmark) — the product delivery mechanism
- [ ] Web view per briefing (accessible via link in email) — required for readable archive
- [ ] Briefing history (last 7-14 days) — basic expectation
- [ ] Preference editing (topics + delivery time) — retention requirement
- [ ] Source attribution in briefing — low-cost trust builder, differentiates from editorial newsletters
- [ ] One-click unsubscribe — legal requirement (CAN-SPAM, GDPR)

### Add After Validation (v1.x — once 10-20 beta users are active)

- [ ] Adjacent topic suggestions — trigger: users report topics feeling thin or irrelevant
- [ ] Digest-level feedback (star rating in web view) — trigger: need signal for improving summarisation quality
- [ ] Per-section "more/less like this" in web view — trigger: feedback suggests topic mix issues
- [ ] Briefing tone option (bullets vs prose) — trigger: user feedback on readability preferences
- [ ] OAuth login (Google) — trigger: friction complaints during onboarding

### Future Consideration (v2+ — post product-market fit)

- [ ] Paid subscription billing — explicitly out of scope for PoC per PROJECT.md
- [ ] Mobile app — out of scope per PROJECT.md
- [ ] Audio/podcast briefing — high cost, validates only if text briefing retention is strong
- [ ] Team/shared briefings — B2B angle, validates only if individual product works first
- [ ] Custom source addition (user-supplied RSS URL) — power user feature, validates after core is stable
- [ ] Referral program — growth mechanism, requires stable product first
- [ ] Weekly frequency option — defer; risks daily habit weakening

---

## Feature Prioritisation Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| User account + auth | HIGH | LOW | P1 |
| Topic selection (freeform) | HIGH | MEDIUM | P1 |
| Delivery time + timezone | HIGH | MEDIUM | P1 |
| Source aggregation (RSS + NewsAPI) | HIGH | MEDIUM | P1 |
| AI summarisation into briefing | HIGH | HIGH | P1 |
| Email delivery | HIGH | MEDIUM | P1 |
| Web view (briefing page) | HIGH | MEDIUM | P1 |
| Preference editing | HIGH | LOW | P1 |
| Unsubscribe / opt-out | HIGH (legal) | LOW | P1 |
| Briefing history (14 days) | MEDIUM | LOW | P1 |
| Source attribution | MEDIUM | LOW | P1 |
| Adjacent topic suggestions | MEDIUM | MEDIUM | P2 |
| Per-section feedback | MEDIUM | MEDIUM | P2 |
| Digest-level rating | LOW | LOW | P2 |
| Tone / reading level option | LOW | LOW | P2 |
| OAuth login | LOW | MEDIUM | P2 |
| Custom RSS source input | MEDIUM | MEDIUM | P3 |
| Audio briefing | LOW | HIGH | P3 |
| Referral program | MEDIUM | MEDIUM | P3 |
| Paid billing / subscription | HIGH (business) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (PoC closes beta loop)
- P2: Should have, add when PoC is validated
- P3: Future — only after product-market fit

---

## Competitor Feature Analysis

| Feature | Morning Brew / Skimm | Feedly | Mailbrew | Refind | Brief (our approach) |
|---------|----------------------|--------|----------|--------|----------------------|
| Personalisation method | None (same for all) | Source/topic following, AI filter | User-built digest from sources | Algorithmic + community | AI summarisation from user-defined topics |
| Email delivery | Yes, fixed time | No | Yes, user-set time | Yes, daily | Yes, user-set time + timezone |
| Web archive | Yes | Yes (reader) | Yes | Partial | Yes (per-briefing URL) |
| AI summarisation | No (editorial) | Yes (Leo, prioritisation) | No (headlines only) | No (link curation) | Yes (full narrative synthesis) |
| Source transparency | No | Yes (source attribution) | Yes (source shown) | Yes (links are the product) | Yes (per-section attribution) |
| Freeform topics | No (fixed sections) | No (category browser) | No (source-picker) | Partial | Yes (user-typed) |
| Noise-free positioning | Implicit | No | Partial | Yes ("5 links, no noise") | Explicit (anti-algorithm) |
| Paid model | Free + sponsor | Free + paid tiers | Paid ($9.99-$24.99/mo) | Free + paid | Free PoC → paid later |
| Feedback loop | No | Yes (likes/saves) | No | Yes (upvotes) | Target: web view ratings |

**Confidence: MEDIUM** — Feature matrix drawn from training knowledge of these products. Mailbrew and Feedly features are HIGH confidence (well-documented); Morning Brew/Skimm editorial stance is HIGH confidence; Refind details are MEDIUM; Briefing (the product) is LOW confidence (limited training data).

---

## Key Observations for Brief

**1. The AI summarisation gap is real.** No named competitor synthesises full-article content into a unified prose briefing per topic. Feedly's Leo re-ranks; Mailbrew pulls headlines; editorial newsletters curate by human editors. Brief's proposed approach — LLM synthesis from full article content — is genuinely differentiated if executed well.

**2. Freeform topic input is underexplored.** Almost all competitors use category browsers or source pickers. User-typed topics ("Scottish independence") with AI-driven source resolution is an unoccupied niche that matches how people actually think about their interests.

**3. Artifact's failure is a warning, not a death sentence.** Artifact failed due to business model issues (news aggregation at scale without sustainable revenue) and concentration in a mobile-app-only format. Brief avoids both risks by targeting email (high retention) and a paid subscription model post-PoC.

**4. Source quality is a hidden editorial burden.** The hardest part of this product isn't the AI layer — it's ensuring the RSS/API sources feeding the LLM are high quality, not spam or clickbait. This is ongoing editorial work, not a one-time technical task.

**5. Email rendering is harder than it looks.** HTML email is a decade behind web standards. Testing across Gmail (web/app), Apple Mail, Outlook, and mobile clients is non-negotiable before any beta launch.

---

## Sources

- Morning Brew (morningbrew.com) — training knowledge, HIGH confidence, product observed through mid-2025
- The Skimm (theskimm.com) — training knowledge, HIGH confidence
- Feedly (feedly.com) — training knowledge, HIGH confidence, well-documented product with stable feature set
- Artifact — training knowledge, HIGH confidence (publicly documented shutdown Feb 2024, feature set well-covered in press)
- Refind (refind.com) — training knowledge, MEDIUM confidence
- Mailbrew (mailbrew.com) — training knowledge, HIGH confidence (product widely discussed in indie maker/newsletter communities through 2024)
- Briefing — training knowledge, LOW confidence (limited coverage)
- Brief PROJECT.md — /Users/willharveynats/conductor/repos/brief/.planning/PROJECT.md (constraints and scope directly inform anti-features)

**Note:** WebSearch, Bash, and WebFetch tools were unavailable in this session. All findings are from training data. Recommend validating Mailbrew and Refind current feature sets against their live products before finalising roadmap decisions, as both products actively iterate.

---

*Feature research for: Personalised daily news briefing / email newsletter*
*Researched: 2026-02-25*
