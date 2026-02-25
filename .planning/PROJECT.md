# Brief

## What This Is

Brief is a personalised daily news briefing product delivered via email and a web app. Users select topics they care about, and Brief aggregates content from quality sources (RSS feeds, news APIs), summarises it with AI, and delivers a clean, noise-free digest at a time they choose. It exists to replace doomscrolling through X with signal-only information.

## Core Value

A person picks their interests once, and every day at their chosen time, Brief delivers everything they need to know — without toxicity, ads, or algorithmic manipulation.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can sign up and create an account
- [ ] Users can select topics of interest (any topic, user-driven)
- [ ] Users can set a daily delivery time
- [ ] Brief aggregates relevant content from RSS feeds and news APIs per topic
- [ ] AI summarises and composes a personalised briefing per user
- [ ] Briefing is delivered by email at the specified time
- [ ] Users can read their briefing via a web app
- [ ] Web app allows users to update topic preferences and delivery time

### Out of Scope

- X/Twitter API integration — expensive ($100-$5k/month), unreliable, and defeats the anti-toxicity purpose
- Paid subscription billing — v1 is a proof of concept; payments come after validation
- Mobile app — web-first for now
- Real-time notifications — daily digest is the core format

## Context

- Proof of concept targeting a small closed beta (10-20 users) to validate the core loop before scaling
- Long-term model is paid subscription
- Content sources: RSS feeds (BBC, Reuters, Guardian, topic-specific), NewsAPI, Guardian API, Reddit API — all free or low-cost at PoC scale
- AI layer (Claude or GPT-4o) summarises and stitches content into a personalised briefing; cost is pennies per user per day at beta scale
- Adjacent topic suggestions ("you follow Tech — you might like AI Policy") are a stretch goal

## Constraints

- **Cost**: PoC must be runnable cheaply — no expensive APIs (no X, no premium data sources)
- **Scale**: Designed for tens of users initially, not thousands
- **Stack**: Not yet decided — open to whatever fits the use case

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No X/Twitter integration | API cost prohibitive; also conflicts with anti-toxicity goal | — Pending |
| Closed beta for PoC | Validates with real users without full public infrastructure | — Pending |
| RSS + AI summarisation for content | Best quality/cost ratio at small scale | — Pending |

---
*Last updated: 2026-02-25 after initialization*
