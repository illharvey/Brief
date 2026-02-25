# Stack Research

**Domain:** Personalised daily news briefing / email newsletter SaaS
**Researched:** 2026-02-25
**Confidence:** MEDIUM (WebFetch/WebSearch/Bash restricted; Next.js 15 verified via official blog; remaining from training data August 2025 + ecosystem patterns)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x | Full-stack web framework (web app + API routes) | Verified stable Oct 2024. App Router gives server components for fast briefing pages, API routes for webhooks/cron, and React 19 support. Single repo for web + backend cuts infra complexity at PoC scale. |
| TypeScript | 5.x | Language | Type safety across the entire stack (API schemas, DB queries, email templates). Drizzle and Auth.js are TypeScript-first; fights integration bugs before runtime. |
| React | 19.x | UI rendering | Bundled with Next.js 15. Server Components reduce client JS. Required for React Email. |
| PostgreSQL | 16.x | Primary data store | Relational structure fits users, topics, briefings, subscriptions. Neon (serverless Postgres) provides a free tier suitable for PoC, scales without migration. |
| Drizzle ORM | 0.30.x | Database access layer | TypeScript-native, no code generation, migrations via drizzle-kit. Lighter than Prisma, better edge compatibility for Next.js App Router. As of mid-2025 has overtaken Prisma in community preference for new projects. |
| Tailwind CSS | 4.x | Styling | Released early 2025. Zero-config CSS engine, no PostCSS config needed, excellent with Next.js 15. Fastest path from component to shipped UI. |

### Infrastructure & Services

| Technology | Version / Tier | Purpose | Why Recommended |
|------------|----------------|---------|-----------------|
| Vercel | Hobby/Pro | Hosting (web app + serverless functions) | Native Next.js deployment, edge network, zero-config CI/CD. Cron Jobs built-in (Vercel Cron) eliminates separate scheduler at PoC scale. Free tier covers 10-20 users. |
| Neon | Free tier | Serverless PostgreSQL | Autoscaling, branching for dev/prod isolation, connection pooling via PgBouncer built-in. Free tier: 0.5 GiB storage, sufficient for beta. Integrates directly with Vercel. |
| Upstash Redis | Free tier | Queue backing store + rate limiting | Serverless Redis with REST API — no persistent connections required in serverless environment. Free tier: 10,000 commands/day, sufficient for 10-20 users. Pairs with BullMQ or QStash. |
| Resend | Free tier | Transactional + newsletter email delivery | Developer-first email API by the creator of React Email. Free tier: 3,000 emails/month (150/day), covers 10-20 users at daily sends. Excellent deliverability, built-in React Email support, simple SDK. |
| React Email | 3.x | Email template rendering | Build emails in JSX/React components, render to HTML for Resend. Standard pairing with Resend. Handles cross-client CSS normalisation. |
| Anthropic Claude API (claude-3-5-haiku) | current | AI summarisation | Cheapest capable model for batch summarisation. At 10-20 users and ~10 articles/topic: ~$0.001 per briefing. claude-3-5-haiku is 4x cheaper than Sonnet with sufficient quality for news summaries. |

### Job Scheduling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel Cron Jobs | built-in | Trigger daily briefing generation | Free on Hobby/Pro, defined in `vercel.json`. Fires a secure webhook to an API route that enqueues individual user jobs. Eliminates a separate scheduler service at PoC scale. |
| QStash (Upstash) | Free tier | Per-user job queue + scheduling | Serverless message queue with HTTP delivery. Better fit than BullMQ in a serverless/Edge environment — no persistent worker process needed. At PoC scale, QStash's free tier (500 messages/day) is sufficient. Schedules individual briefing generation per user with retry logic. |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Auth.js (NextAuth) | 5.x (beta.x) | User authentication | The standard Next.js auth solution. v5 is App Router-native (uses middleware, edge-compatible). Supports email magic link + OAuth (Google). Magic link login removes password management entirely — appropriate for a newsletter product where users return infrequently. |

### Content Ingestion

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rss-parser | 3.x | Parse RSS/Atom feeds | Parsing all RSS/Atom sources (BBC, Reuters, Guardian RSS, topic-specific feeds). Node.js-compatible, handles malformed XML gracefully. Use in server-side API routes triggered by QStash. |
| NewsAPI.org client | — | News article fetching | Official JS client for NewsAPI.org REST API. Use when RSS coverage is insufficient for a topic. Free tier: 100 requests/day (sufficient for beta). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 3.x | Schema validation | Validate API request bodies, NewsAPI responses, user preferences. Pairs with TypeScript for end-to-end type safety. |
| date-fns | 3.x | Date/time manipulation | Handling user timezone preferences for delivery time calculation. Lightweight, tree-shakeable. |
| @ai-sdk/anthropic | 1.x | Vercel AI SDK for Claude | Standardised streaming/non-streaming interface to Anthropic API. Simplifies prompt construction and response handling. Vercel AI SDK wraps multiple providers behind one interface — easy to swap to GPT-4o-mini if needed. |
| nuqs | 2.x | URL state management | Sync filter/topic preferences to URL for shareable briefing views in the web app. |
| shadcn/ui | current | UI component library | Copy-paste accessible components built on Radix UI + Tailwind. Zero runtime cost, full ownership. Standard for Next.js + Tailwind apps in 2025-2026. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| drizzle-kit | Database migrations + schema push | `npx drizzle-kit push` for dev, `npx drizzle-kit migrate` for production |
| Biome | Linting + formatting | Replaces ESLint + Prettier in a single Rust-based tool. 10-50x faster than ESLint. Growing standard for Next.js projects in 2025. |
| Playwright | End-to-end testing | Test the briefing web reader flow. Verify email generation output. |
| Vitest | Unit testing | Fast, Vite-based test runner compatible with Next.js. Test summarisation logic, RSS parsing utilities. |

---

## Installation

```bash
# Core framework
npm install next@latest react@latest react-dom@latest

# TypeScript
npm install -D typescript @types/node @types/react @types/react-dom

# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Styling
npm install tailwindcss@latest

# Auth
npm install next-auth@beta @auth/drizzle-adapter

# Email
npm install resend react-email @react-email/components

# AI
npm install @ai-sdk/anthropic ai

# Queuing
npm install @upstash/qstash

# Content ingestion
npm install rss-parser

# Utilities
npm install zod date-fns nuqs

# Dev dependencies
npm install -D vitest @vitejs/plugin-react playwright biome
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 15 | Remix v2 | If you strongly prefer loader/action mental model over Server Components. Roughly equivalent capability; Next.js has larger ecosystem and Vercel deployment parity. |
| Drizzle ORM | Prisma | If team prefers schema-first design and is comfortable with the Prisma Client generation step. Prisma has broader ORM feature set; Drizzle is leaner for this use case. |
| Neon | Supabase | If you want auth + realtime + storage out of the box. Supabase is a larger surface area; adds complexity not needed for this PoC. Use Supabase if you drop Auth.js in favour of Supabase Auth later. |
| QStash | BullMQ | BullMQ if you have a persistent Node.js server (not serverless). BullMQ requires a long-running Redis connection; incompatible with Vercel's serverless functions without a separate worker VM. |
| Resend | Postmark | Postmark has better transactional deliverability reputation for high volume; Resend's DX and free tier are better for PoC. Switch to Postmark if deliverability becomes an issue at scale. |
| Auth.js magic link | Clerk | Clerk is excellent DX but costs $25/month after 10,000 MAU. For a PoC with 10-20 users it's overkill financially. |
| claude-3-5-haiku | GPT-4o-mini | GPT-4o-mini is comparably priced and capable. Use claude-3-5-haiku because the project is built on Anthropic's platform and API costs at beta scale are pennies either way. Swap via AI SDK provider config. |
| Vercel Cron | Temporal.io / Inngest | Inngest is excellent for complex workflow orchestration with retries and fan-out. At PoC scale (10-20 users) it's unnecessary infrastructure. Revisit at 1,000+ users. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| X/Twitter API | $100-$5,000/month for basic access; against the product's anti-toxicity goal | Reddit API (free tier) as stretch goal only |
| Prisma (with Vercel/serverless) | Prisma Client generates large bundles; cold-start issues in serverless; Prisma Accelerate required at extra cost | Drizzle ORM + Neon's built-in connection pooling |
| Sendgrid / Mailchimp | Overcomplicated for transactional email at PoC scale; Mailchimp is newsletter-first but has poor developer API; SendGrid DX is poor | Resend |
| BullMQ on Vercel | Requires persistent Redis connections and a long-running worker — incompatible with serverless functions | QStash (serverless HTTP queue) |
| MongoDB | Document model adds complexity for relational user/topic/briefing data; no advantage over Postgres for this use case | PostgreSQL via Neon |
| next-auth v4 | v4 is incompatible with App Router patterns; breaks with middleware auth | Auth.js v5 (NextAuth beta) |
| GPT-4 (non-mini) / Claude Opus | 10-50x the cost of haiku/mini models for equivalent summarisation quality | claude-3-5-haiku or GPT-4o-mini |
| Redis Cloud (paid) for queuing | Unnecessary cost when Upstash free tier covers PoC needs | Upstash Redis free tier |

---

## Stack Patterns by Variant

**If deploying to Vercel (recommended for PoC):**
- Use Vercel Cron Jobs for scheduling (built-in, free)
- Use QStash for per-user job fan-out
- Use Neon for database (native Vercel integration)
- Connection pooling is handled by Neon's PgBouncer — no extra config

**If self-hosting (VPS/Docker):**
- Replace Vercel Cron with node-cron or a proper cron job
- Replace QStash with BullMQ + Redis (persistent connection viable)
- Replace Neon with self-managed PostgreSQL
- Replace Upstash with self-managed Redis
- Deploy with Docker Compose: Next.js + PostgreSQL + Redis

**If AI costs become a concern at scale:**
- Switch from claude-3-5-haiku to a self-hosted model via Ollama (llama 3.1 8B)
- Implement aggressive article deduplication before sending to API
- Cache summaries for shared content across users following the same topic

**If email volume grows beyond Resend free tier (3K/month):**
- Resend paid: $20/month for 50,000 emails
- Alternatively: Amazon SES at $0.10/1,000 emails (lowest cost at volume, worse DX)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@15.x | react@19.x, react-dom@19.x | Next.js 15 requires React 19 for App Router; Pages Router still supports React 18 |
| next-auth@beta (v5) | next@15.x | Auth.js v5 is specifically designed for Next.js 13+ App Router; v4 is incompatible |
| drizzle-orm@0.30.x | @neondatabase/serverless | Neon's serverless driver works natively with Drizzle; use `neon()` as the Drizzle db driver |
| tailwindcss@4.x | next@15.x | Tailwind v4 removes PostCSS config requirement; uses `@import "tailwindcss"` in CSS |
| @ai-sdk/anthropic | ai@4.x | Vercel AI SDK v4 is the current major version; `@ai-sdk/anthropic` is the provider package |
| react-email@3.x | resend@4.x | Resend SDK v4 accepts React Email components directly via `react` option |

---

## Architecture Summary

The stack composes into three runtime contexts:

1. **Web App** (Next.js, Vercel Edge/Node) — Briefing reader, preferences UI, auth flows
2. **Background Jobs** (Vercel Cron → QStash → Next.js API routes) — RSS fetch, AI summarisation, email send per user
3. **Data Layer** (Neon PostgreSQL + Upstash Redis) — User records, topics, briefings, job queue

All three run within a single Next.js monorepo deployed to Vercel. No separate backend service, no worker VM, no additional infra until 1,000+ users.

---

## Sources

- Next.js 15 official blog (nextjs.org/blog/next-15, Oct 2024) — verified stable release, React 19, App Router, caching changes
- Training data (August 2025 cutoff) — Drizzle ORM adoption trends, Resend positioning, Auth.js v5, QStash, Upstash pricing, AI SDK patterns — **MEDIUM confidence**, flagged where verification needed
- Project context (PROJECT.md) — constraints (cost-sensitive, 10-20 users, no X API), requirements (RSS + news APIs, AI summarise, email + web delivery)

**Confidence by area:**

| Area | Level | Reason |
|------|-------|--------|
| Next.js 15 version/features | HIGH | Verified via official blog |
| Drizzle vs Prisma recommendation | MEDIUM | Training data trend; widely reported but not re-verified Feb 2026 |
| Resend pricing/free tier | MEDIUM | Training data; pricing may have changed — verify at resend.com before committing |
| Auth.js v5 stability | MEDIUM | Was in beta as of Aug 2025; verify stable release status |
| QStash vs BullMQ recommendation | MEDIUM | Architectural reasoning is sound; verify QStash free tier limits |
| claude-3-5-haiku pricing | MEDIUM | Training data; Anthropic pricing changes regularly — verify at anthropic.com/pricing |
| Tailwind v4 release | MEDIUM | Released Q1 2025 per training; verify current stable version |
| NewsAPI free tier limits | LOW | Training data only; verify 100 req/day limit at newsapi.org |

---

*Stack research for: Brief — personalised daily news briefing SaaS*
*Researched: 2026-02-25*
