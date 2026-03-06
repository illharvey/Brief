# Phase 6: Web App - Research

**Researched:** 2026-03-06
**Domain:** Next.js 16 App Router — briefing viewer, archive, topic suggestions, public landing page
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary**
Briefing viewer (read today's and past briefings in the web app), 14-day archive, adjacent topic suggestions surfaced within the briefing view, and a public marketing landing page. Settings were delivered in Phase 5.1 and are out of scope here.

**Briefing viewer**
- Content is divided into distinct topic sections with clear headers (e.g. "AI", "Finance", "Sport") — not continuous prose or card-per-topic
- Source attribution links are inline within the summary text — woven into prose, not listed separately at the bottom
- Briefing header shows: date + a one-line editorial headline summarising the day (not just a date, not full stats)
- When today's briefing hasn't been generated yet: show a "Your briefing is on the way" placeholder with a link to yesterday's briefing below it

**Archive / Briefings list**
- The "Briefings" nav link IS the archive — a reverse-chronological list of all 14 days, with today's briefing pinned at the top as the current entry
- No separate "Archive" link in the sidebar; no calendar view
- Each row in the list shows: date + editorial headline only (no topic pills, no source count)
- Empty state for new users: "Your first briefing arrives tomorrow" message, with delivery time shown

**Topic suggestions**
- Suggestions appear below the briefing content — after all topic sections, at the bottom of the reader view
- Logic: hardcoded topic graph — predefined adjacency relationships (e.g. "if you follow AI, suggest: Machine Learning, Robotics, Tech Policy"). No collaborative filtering or ML for v1.
- When a user clicks "Add" on a suggestion: topic is added immediately in-place with a "Topic added" toast — no navigation to Settings
- Suggestion pill becomes a checkmark or disappears after adding

**Public landing page**
- Exact design from the reference HTML provided in discussion (see Specific Ideas below)
- Lives at the root URL `/`; logged-in users are redirected to `/dashboard`
- Primary CTA: email input + button — clicking carries the email to `/signup?email=...` so the signup form is pre-filled
- Sign up directly — no waitlist, no gating

### Claude's Discretion
- Exact topic graph adjacency relationships (which topics suggest which others)
- Loading skeleton design for the briefing viewer
- Error states (failed to load briefing, failed to add topic)
- Exact typography scale and spacing within the briefing viewer sections
- How many suggestion pills to show at once (3-5 is reasonable)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PREF-03 | User can update topics and delivery time at any time from the web app | Already complete (Phase 5.1) — `/dashboard/settings` exists and works. Phase 6 must NOT re-implement; settings link in sidebar already points to it. |
| PREF-04 | Brief suggests adjacent topics based on a user's existing selections | Hardcoded topic graph pattern. `userTopics` table (normalized rows) already exists for DB reads. Server action to add a topic reuses `saveTopicsAction` from Phase 5.1. |
| WEB-01 | User can read today's briefing via the web app | `briefings` + `briefingItems` tables exist. Dashboard `/dashboard` page is currently a placeholder — Phase 6 replaces it with the briefing viewer. Content is stored as markdown; render with react-markdown. |
| WEB-02 | User can browse past briefings in an archive | 14-day reverse-chronological list at `/dashboard` (list view) with drill-down to `/dashboard/briefings/[id]`. DB query: `briefings` table filtered by userId, ordered by `generatedAt` DESC, limited to 14 days. |
| WEB-03 | User can manage topics, delivery time, and account details from a settings page | Already complete (Phase 5.1). No new work. Sidebar "Settings" link active. |
| WEB-04 | A public landing page explains Brief and captures beta signup interest | New standalone layout at `/` — unauthenticated public page. Must migrate `middleware.ts` → `proxy.ts` and update `authorized` callback to allow unauthenticated access to `/`. Libre Baskerville font must be added to `layout.tsx`. |

</phase_requirements>

---

## Summary

Phase 6 builds the user-facing web app on top of a fully functional backend pipeline. The DB schema already contains everything needed: `briefings` stores assembled markdown content, `briefingItems` stores per-article summaries with source URLs, and `userTopics` stores normalized rows ready for topic graph operations. The dashboard page at `/dashboard` is a confirmed placeholder — Phase 6 fully replaces it.

The most significant structural challenge is the **public landing page at `/`**. Currently `src/app/page.tsx` redirects all visitors (including unauthenticated) to `/dashboard`. The existing `middleware.ts` protects `/dashboard/*` routes but the `authorized` callback returns `true` for all non-dashboard routes. Phase 6 needs: (1) a new public layout route group `(public)` for the landing page, (2) update the root `page.tsx` to serve the landing page rather than redirect, and (3) add auth-based redirect in the root page so logged-in users go to `/dashboard`. Phase 6 also needs to migrate `middleware.ts` → `proxy.ts` because the project runs Next.js 16.1.6 where `middleware` is deprecated.

The briefing viewer renders markdown stored in the `briefings.content` field. The markdown format is already defined by `assembleBriefing()`: `## Topic Name` headers with `- bullet [Source](url)` lines. The viewer must render this structure as styled sections. `react-markdown` with `remark-gfm` is the standard approach — it handles the existing markdown format, allows custom component renderers for inline link styling, and requires no new custom parsing logic.

**Primary recommendation:** Build three distinct UI surfaces — briefings list + viewer (replacing `/dashboard` placeholder), public landing page (new route at `/`), topic suggestion widget (appended to briefing viewer) — using existing DB schema, server actions, and design system tokens already in place.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App Router, server components, routing | Already in project |
| react | 19.2.3 | UI rendering | Already in project |
| drizzle-orm | ^0.45.1 | DB queries for briefings/topics | Already in project |
| next-auth | ^5.0.0-beta.30 | Session/auth in server components | Already in project |
| sonner | ^2.0.7 | Toast notifications (add topic success) | Already in project, Toaster in root layout |
| tailwindcss | ^4 | Styling + animation (ticker) | Already in project |

### New Dependencies Required
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| react-markdown | ^10.1.0 | Render briefing markdown content | Handles `##` headers + `[link](url)` inline links natively with custom component renderers |
| remark-gfm | ^4.0.1 | GFM plugin for react-markdown | Enables correct link rendering and autolinks in markdown content |

**Note on Libre Baskerville:** The landing page design spec requires Libre Baskerville for the editorial subtitle. Playfair Display and DM Sans are already loaded in `layout.tsx` — Libre Baskerville must be added there too (via `next/font/google`).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | Custom markdown parser | react-markdown handles all the existing `##` header + `[source](url)` format; hand-rolling a parser is unnecessary complexity |
| react-markdown | Next.js MDX | MDX is for static content authored as MDX files — not for rendering dynamic string content from DB |
| Tailwind keyframe animation (ticker) | Framer Motion / Motion | Pure CSS ticker with Tailwind custom keyframes is simpler, has no JS overhead, matches existing tw-animate-css pattern in project |

**Installation:**
```bash
npm install react-markdown remark-gfm
```

---

## Architecture Patterns

### Recommended Route Structure
```
src/app/
├── page.tsx                          # Landing page (REPLACE redirect with full landing page)
├── (public)/                         # Public layout group (no sidebar, no auth required)
│   └── layout.tsx                    # Standalone layout for marketing pages
├── dashboard/
│   ├── layout.tsx                    # Existing — sidebar + auth guard (unchanged)
│   ├── page.tsx                      # REPLACE placeholder with briefings list + today's viewer
│   └── briefings/
│       └── [id]/
│           └── page.tsx              # Individual past briefing viewer
│   └── settings/                     # Existing (unchanged from Phase 5.1)
src/components/
├── briefing/
│   ├── briefing-viewer.tsx           # Renders markdown briefing with styled sections
│   ├── briefing-list.tsx             # 14-day archive list (reverse chronological)
│   └── topic-suggestions.tsx         # Suggestion pills + add action
├── landing/
│   ├── nav.tsx                       # Fixed nav with logo + links
│   ├── hero.tsx                      # Two-column hero section
│   ├── ticker.tsx                    # CSS marquee ticker strip
│   ├── how-it-works.tsx              # 3-step section
│   ├── topics-grid.tsx               # 12-topic card grid
│   └── footer.tsx                    # Footer
src/actions/
├── topics.ts                         # addTopicAction (PREF-04 — append single topic)
src/lib/
├── topic-graph.ts                    # Hardcoded adjacency map for PREF-04
```

### Pattern 1: Server Component Data Fetch + Client Render

The dashboard briefing viewer follows the established Phase 5.1 pattern: server component fetches data from DB (async, uses `auth()` + drizzle), passes to client component for interactive rendering.

**What:** Server page fetches today's briefing + 14-day list. Client component renders the markdown with interactive suggestion pills.
**When to use:** Whenever data requires auth + DB access, but UI needs client interactivity.

```typescript
// src/app/dashboard/page.tsx (Server Component)
// Source: existing Phase 5.1 pattern (settings/page.tsx)
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db/client"
import { briefings } from "@/lib/db/schema"
import { eq, desc, gte } from "drizzle-orm"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const recentBriefings = await db
    .select()
    .from(briefings)
    .where(eq(briefings.userId, userId))
    // Note: gte requires generatedAt to be non-null; handle nullable in client
    .orderBy(desc(briefings.generatedAt))
    .limit(14)

  const todayBriefing = recentBriefings[0] ?? null

  return <BriefingView briefings={recentBriefings} today={todayBriefing} userId={userId} />
}
```

### Pattern 2: react-markdown with Custom Link Renderer

The briefing markdown format uses inline links: `- Summary text [Source Name](https://url)`. React-markdown custom `a` renderer applies the project's link styling.

```typescript
// src/components/briefing/briefing-viewer.tsx
// Source: https://github.com/remarkjs/react-markdown
"use client"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function BriefingViewer({ content }: { content: string }) {
  return (
    <div className="briefing-content font-dm-sans">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ## Topic Name headers
          h2: ({ children }) => (
            <h2 className="font-playfair font-bold text-xl text-espresso mt-8 mb-3 pb-2 border-b border-steam">
              {children}
            </h2>
          ),
          // Bullet point lines
          li: ({ children }) => (
            <li className="text-espresso text-sm leading-relaxed mb-2">{children}</li>
          ),
          // Inline source attribution links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-beeswax hover:text-beeswax-deep underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}
```

### Pattern 3: CSS Ticker / Marquee Animation

Pure CSS infinite horizontal scroll using Tailwind custom keyframes. No JS, no library. Pattern: duplicate content div so the loop is seamless.

```typescript
// src/components/landing/ticker.tsx
// Source: verified pattern from https://cruip.com/create-an-infinite-horizontal-scroll-animation-with-tailwind-css/
// CSS animation defined in globals.css @theme block

// globals.css addition (inside existing @theme inline block):
// --animate-ticker: ticker 25s linear infinite;
// @keyframes ticker {
//   0% { transform: translateX(0); }
//   100% { transform: translateX(-50%); }
// }

export function Ticker() {
  const items = [
    "No doomscrolling",
    "Curated just for you",
    "Fresh every morning",
    "100+ topics available",
    "No algorithms. No noise.",
    "Just what matters",
  ]
  const text = items.join(" ✦ ") + " ✦ "

  return (
    <div className="bg-espresso overflow-hidden py-3">
      <div className="flex whitespace-nowrap animate-[ticker_25s_linear_infinite]">
        {/* Duplicate for seamless loop */}
        <span className="text-milk font-dm-sans text-sm mr-4">{text}</span>
        <span className="text-milk font-dm-sans text-sm mr-4">{text}</span>
      </div>
    </div>
  )
}
```

### Pattern 4: Public Landing Page — Root Route + Auth Redirect

**Critical:** The current `src/app/page.tsx` unconditionally redirects to `/dashboard`. For the landing page, it must become the landing page itself — but logged-in users should be sent to `/dashboard`.

The `authorized` callback in `auth.config.ts` currently only guards `/dashboard`. The root `/` is NOT protected, so unauthenticated visitors already pass through. The root `page.tsx` just needs to check session and redirect logged-in users client-side OR use a server component auth check.

**Approach:** Server Component with session check:

```typescript
// src/app/page.tsx — replaces the current redirect stub
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LandingPage } from "@/components/landing/landing-page"

export default async function RootPage() {
  const session = await auth()
  if (session?.user) {
    redirect("/dashboard")
  }
  return <LandingPage />
}
```

**No layout changes needed** — `src/app/layout.tsx` applies to all routes including `/`. The landing page sections will be direct children without the dashboard sidebar.

### Pattern 5: proxy.ts Migration (Next.js 16 requirement)

The project runs Next.js 16.1.6. `middleware.ts` is deprecated; Next.js shows a warning and will remove support. Phase 6 must rename to `proxy.ts` and rename the exported function.

```typescript
// proxy.ts (replaces middleware.ts — same logic, renamed)
// Source: https://nextjs.org/docs/app/guides/upgrading/version-16#middleware-to-proxy
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export const { auth: proxy } = NextAuth(authConfig)

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

**Note:** The `authorized` callback in `auth.config.ts` already correctly allows unauthenticated access to non-`/dashboard` routes by only checking `nextUrl.pathname.startsWith("/dashboard")`. The landing page at `/` is already permitted through — no callback change needed.

### Pattern 6: addTopicAction (PREF-04)

Topic suggestions need a server action that appends a single topic without replacing all topics. The existing `saveTopicsAction` replaces everything atomically. A new action is needed.

```typescript
// src/actions/topics.ts
"use server"
import { db } from "@/lib/db/client"
import { userTopics } from "@/lib/db/schema"
import { auth } from "@/lib/auth"

export async function addTopicAction(topic: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "unauthenticated" }

  // Simple insert — if topic already exists for this user, ignore silently
  await db
    .insert(userTopics)
    .values({ userId: session.user.id, topic })
    .onConflictDoNothing() // userTopics has no unique constraint on (userId, topic)
    // so this will just insert; duplicate handling done client-side

  return { success: true }
}
```

**Note:** `userTopics` has no unique constraint on `(userId, topic)` — the schema only has `id` PK and FK to users. Adding the same topic twice creates two rows. The suggestion logic should check existing topics client-side before showing a suggestion pill, preventing duplicates from the UI layer.

### Pattern 7: Briefings List Query

14-day archive with today's briefing pinned at top. Briefings are ordered by `generatedAt` DESC.

```typescript
// Drizzle query for briefing archive
import { desc, eq, gte } from "drizzle-orm"

const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

const recentBriefings = await db
  .select({
    id: briefings.id,
    generatedAt: briefings.generatedAt,
    content: briefings.content,
    topicCount: briefings.topicCount,
    itemCount: briefings.itemCount,
  })
  .from(briefings)
  .where(eq(briefings.userId, userId))
  .orderBy(desc(briefings.generatedAt))
  .limit(14)
```

**Editorial headline:** The briefing content does not contain a pre-generated one-line headline. The briefing viewer header must either: (a) generate a headline from the first topic section heading in the content, or (b) fall back to a formatted date if no topics are found. Extract the first `## Topic` heading as the headline prefix, e.g. "AI, Finance, Sport — and 2 more".

### Anti-Patterns to Avoid

- **Don't replace `saveTopicsAction` for add-topic:** It deletes all existing topics first. Use a new `addTopicAction` that inserts a single row.
- **Don't use MDX for briefing content:** The briefing markdown is a runtime string from the DB, not a static file. MDX requires static compilation.
- **Don't use `<marquee>` HTML element:** It is deprecated. Use CSS `animation: ticker` with a duplicated span for the infinite scroll ticker.
- **Don't add the Libre Baskerville font only in the landing page component:** It must be loaded in `src/app/layout.tsx` via `next/font/google` so it is available as a CSS variable across all routes.
- **Don't render the landing page in the `(auth)` route group layout:** The `(auth)` layout centers content in a max-w-md container. The landing page needs its own full-width layout.
- **Don't call `auth()` in `proxy.ts` for the root page redirect:** The proxy/middleware handles `/dashboard` protection. Root-page redirect to `/dashboard` for logged-in users is handled in the server component itself (`src/app/page.tsx`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom `##` header and `[link](url)` parser | react-markdown + remark-gfm | react-markdown handles the exact format assembleBriefing() produces; handles edge cases (nested items, escaped chars) |
| Infinite CSS ticker | JavaScript-driven position tracking | Tailwind custom keyframe animation (pure CSS) | CSS `animation: translateX(-50%)` with duplicated DOM node is native, performant, and matches tw-animate-css already in project |
| Topic dedup on add | DB unique constraint | Client-side check before showing pill | The `userTopics` table has no composite unique — adding a DB constraint is a schema migration; checking existing topics in the component is simpler and sufficient for v1 |
| Editorial headline extraction | Dedicated headline generation (LLM call) | Parse first `##` heading from content string | The content already has topic headings; concatenate them for a headline without extra LLM cost |

**Key insight:** The pipeline has already done all the hard work. Phase 6 is purely a presentation layer on top of structured data that already exists in the correct format.

---

## Common Pitfalls

### Pitfall 1: middleware.ts Deprecation Warning in Next.js 16
**What goes wrong:** Builds and dev server emit deprecation warnings. The `export const { auth: middleware }` pattern no longer works — the exported name must be `proxy`.
**Why it happens:** Next.js 16 renamed the file convention from `middleware.ts` to `proxy.ts` and the export from `middleware` to `proxy`.
**How to avoid:** In Phase 6 Wave 0: rename `middleware.ts` to `proxy.ts` and change `export const { auth: middleware }` to `export const { auth: proxy }`.
**Warning signs:** Console warning `[next] [middleware] middleware.ts has been renamed to proxy.ts` during `next dev`.

### Pitfall 2: Root Page Server Component Calling auth() — Edge Runtime Conflict
**What goes wrong:** `src/app/page.tsx` calling `auth()` may trigger Edge runtime issues if the root route is somehow caught by the proxy/middleware.
**Why it happens:** `auth()` uses Node.js crypto (bcrypt) which is incompatible with Edge runtime. This is why `authorize` is undefined in `auth.config.ts`.
**How to avoid:** The root page is a Server Component running in the Node.js runtime (not Edge). `auth()` is safe to call there. The `proxy.ts` runs on Node.js too in Next.js 16 (Edge runtime is NOT supported in proxy). No conflict.
**Warning signs:** Error "does not support Node.js 'crypto' module" — only happens if accidentally imported in an Edge context.

### Pitfall 3: Briefing Content Has No Editorial Headline Column
**What goes wrong:** The briefings list shows "date + editorial headline" per the spec, but the `briefings` table has no `headline` column.
**Why it happens:** Phase 4 generates markdown content but no separate headline field.
**How to avoid:** Extract headline from content at read time. Parse the first `## TopicName` line from `content`. Build a display headline like "AI, Finance, Sport" from the first 2-3 topic headings found. Do this in a utility function, not inline in JSX.
**Warning signs:** Displaying raw dates only, or blank headlines in the briefings list.

### Pitfall 4: Topic Suggestions Showing Already-Followed Topics
**What goes wrong:** Suggestion pills display topics the user already follows.
**Why it happens:** The topic graph returns all adjacent topics; no filter for existing subscriptions.
**How to avoid:** Pass `userTopics` list to the suggestion component. Filter `adjacentTopics.filter(t => !existingTopics.includes(t))` before rendering pills.
**Warning signs:** User sees "Add: AI" when they already follow AI.

### Pitfall 5: CTA Email Pre-fill on Signup Page
**What goes wrong:** Landing page email input carries value to `/signup?email=...` but the signup form doesn't read the `email` searchParam.
**Why it happens:** The existing signup page (`/signup/page.tsx`) is a plain `<Input>` with no default value from searchParams.
**How to avoid:** The signup page must read `searchParams.email` and set it as the default value of the email input. In Next.js 16, `searchParams` on page.tsx is async: `const { email } = await props.searchParams`.
**Warning signs:** Clicking "Get Brief." from landing page opens signup with empty email field.

### Pitfall 6: react-markdown `ul` vs `li` Component Customization
**What goes wrong:** Custom `li` renderer doesn't apply because the markdown bullets are inside a `ul` that has default margin/padding from browser stylesheet.
**Why it happens:** react-markdown renders `ul > li` structure. Without overriding `ul`, browser UA stylesheet adds left padding that shifts bullets.
**How to avoid:** Override both `ul` (remove list-style, padding) and `li` in the components prop, or add Tailwind `prose` reset class on the container.
**Warning signs:** Bullet points have unexpected indentation or visible disc bullets.

### Pitfall 7: Duplicate Brief History Rows
**What goes wrong:** The same user has multiple briefing rows for the same day (one from GitHub Actions cron, one from a retry or manual trigger).
**Why it happens:** The `deliveries` table has a unique constraint on `(userId, deliveryDate)` but the `briefings` table does NOT — it only has `(userId, generatedAt)`. Multiple briefings can exist per user per day.
**How to avoid:** When fetching "today's briefing", use the most recent `generatedAt` for today (`.limit(1)` with `orderBy desc`). The briefings list should deduplicate by date (take the latest per day) if multiple rows exist.
**Warning signs:** Two entries for the same date in the archive list.

---

## Code Examples

### Fetching the 14-day briefing archive

```typescript
// Source: drizzle-orm docs + existing Phase 5 pattern
import { db } from "@/lib/db/client"
import { briefings } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"

const recentBriefings = await db
  .select()
  .from(briefings)
  .where(eq(briefings.userId, userId))
  .orderBy(desc(briefings.generatedAt))
  .limit(14)
```

### Fetching a single briefing by ID with auth guard

```typescript
// src/app/dashboard/briefings/[id]/page.tsx
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db/client"
import { briefings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export default async function BriefingPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  // Next.js 16: params is async
  const { id } = await props.params

  const briefing = await db.query.briefings.findFirst({
    where: and(
      eq(briefings.id, id),
      eq(briefings.userId, session.user.id)  // ownership guard
    )
  })

  if (!briefing) notFound()

  return <BriefingViewer briefing={briefing} />
}
```

**Critical:** In Next.js 16, `params` in `page.tsx` is a `Promise` (async Request APIs change). Always `await props.params` before accessing values.

### Deriving editorial headline from markdown content

```typescript
// src/lib/utils.ts addition
export function extractBriefingHeadline(content: string): string {
  const headings = content
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.replace('## ', '').trim())

  if (headings.length === 0) return "Your briefing"
  if (headings.length <= 3) return headings.join(', ')
  return `${headings.slice(0, 2).join(', ')} — and ${headings.length - 2} more`
}
```

### Topic graph adjacency lookup

```typescript
// src/lib/topic-graph.ts
// Hardcoded per CONTEXT.md decision — no ML/collaborative filtering for v1
const TOPIC_ADJACENCY: Record<string, string[]> = {
  "AI": ["Machine Learning", "Robotics", "Tech Policy", "Data Science"],
  "Technology": ["AI", "Cybersecurity", "Startups", "Software"],
  "Finance": ["Economics", "Crypto", "Business", "Investing"],
  "Politics": ["Policy", "International Relations", "Economics"],
  "Climate": ["Environment", "Energy", "Science", "Policy"],
  "Science": ["Space", "Health", "Technology", "Climate"],
  "Health": ["Science", "Nutrition", "Mental Health", "Medicine"],
  "Sport": ["Football", "Cricket", "Tennis", "Olympics"],
  "Culture": ["Film", "Music", "Books", "Art"],
  "Business": ["Finance", "Startups", "Economics", "Technology"],
  // ... Claude's discretion for full adjacency list
}

export function getAdjacentTopics(
  userTopics: string[],
  limit = 4
): string[] {
  const suggestions = new Set<string>()
  const userTopicSet = new Set(userTopics.map(t => t.toLowerCase()))

  for (const topic of userTopics) {
    const adjacent = TOPIC_ADJACENCY[topic] ?? []
    for (const suggestion of adjacent) {
      if (!userTopicSet.has(suggestion.toLowerCase())) {
        suggestions.add(suggestion)
      }
    }
    if (suggestions.size >= limit) break
  }

  return Array.from(suggestions).slice(0, limit)
}
```

### Landing page CTA email form (pre-fill pattern)

```typescript
// src/components/landing/hero.tsx (Client Component for form interaction)
"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function HeroCTA() {
  const [email, setEmail] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    router.push(`/signup?email=${encodeURIComponent(email)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 px-4 py-2 font-dm-sans text-espresso bg-milk border border-warm-brown/30 rounded-[2px]"
      />
      <button
        type="submit"
        className="px-6 py-2 bg-beeswax hover:bg-beeswax-deep text-milk font-dm-sans font-medium rounded-[2px] transition-colors"
      >
        Get Brief.
      </button>
    </form>
  )
}
```

### Signup page reading pre-filled email (Next.js 16 async searchParams)

```typescript
// src/app/(auth)/signup/page.tsx — add email pre-fill
// Next.js 16: searchParams is async
export default async function SignUpPage(props: { searchParams: Promise<{ email?: string }> }) {
  const { email: prefillEmail } = await props.searchParams
  // Pass prefillEmail as default value to the "email" input in the client component
  return <SignUpForm prefillEmail={prefillEmail ?? ""} />
}
```

### Libre Baskerville font setup

```typescript
// src/app/layout.tsx — add to existing font imports
import { Libre_Baskerville } from "next/font/google"

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
})

// Add to body className: ${libreBaskerville.variable}

// globals.css @theme inline block — add:
// --font-libre-baskerville: var(--font-libre-baskerville);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export const middleware` | `proxy.ts` + `export const proxy` | Next.js 16 (this project: 16.1.6) | Must rename before Phase 6 dev to avoid deprecation warnings |
| Synchronous `params` in page.tsx (`props.params.id`) | Async params (`const { id } = await props.params`) | Next.js 16 (breaking change) | All dynamic routes `[id]` must await params |
| Synchronous `searchParams` in page.tsx | Async searchParams (`await props.searchParams`) | Next.js 16 (breaking change) | Signup page pre-fill must await searchParams |
| `experimental.turbopack` in next.config | `turbopack` at top level | Next.js 16 | No impact — `next.config.ts` is currently empty object |

**Deprecated/outdated:**
- `middleware.ts` with `export const middleware`: deprecated, warn in Next.js 16, will be removed
- Synchronous `params`/`searchParams` access on page/layout: removed in Next.js 16 — must be awaited

---

## Open Questions

1. **Does `briefings.generatedAt` reliably map to "today's" briefing?**
   - What we know: `generatedAt` defaults to `now()` at insert time; briefings are generated once per day per user by the cron job
   - What's unclear: If a briefing fails and is retried, two rows may exist for the same day. The `deliveries` table has idempotency but `briefings` does not have a unique constraint on `(userId, date)`
   - Recommendation: Always `.limit(1).orderBy(desc(generatedAt))` for "today's" briefing. Deduplicate by calendar date (user's local timezone) when building the archive list if multiple rows appear for one day.

2. **Should the briefings list route replace `/dashboard` or be a separate `/dashboard/briefings` route?**
   - What we know: CONTEXT.md says "The Briefings nav link IS the archive" — the sidebar link is `/dashboard`. The current sidebar has "Briefings" pointing to `/dashboard`.
   - What's unclear: Whether `/dashboard` shows the list+today combined, or just today's briefing with a separate list view.
   - Recommendation: Make `/dashboard` the combined view — today's briefing above the fold, archive list below (or as a collapsible panel). Individual past briefings open at `/dashboard/briefings/[id]`. This matches "today pinned at top" pattern from CONTEXT.md.

3. **How should empty-state "Your briefing is on the way" link to "yesterday's briefing"?**
   - What we know: CONTEXT.md specifies showing a link to yesterday's briefing when today's hasn't generated yet.
   - What's unclear: "Yesterday" relative to which timezone (user's timezone vs UTC)? User's timezone is stored in `deliveryPreferences.timezone`.
   - Recommendation: Fetch `deliveryPreferences.timezone` in the dashboard server component. Use `Intl.DateTimeFormat` with the user's timezone to determine yesterday's date, then find the most recent briefing before today.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (https://nextjs.org/docs/app/guides/upgrading/version-16) — Next.js 16 breaking changes: async params, proxy.ts rename, verified 2026-02-27
- Drizzle-ORM + existing project schema (`src/lib/db/schema.ts`) — briefings/briefingItems/userTopics table structure
- Existing Phase 5.1 implementation (`src/app/dashboard/settings/`, `src/actions/preferences.ts`) — established patterns for server component + client form + server actions
- `src/lib/summarisation/assemble.ts` — exact markdown format that briefing viewer must render

### Secondary (MEDIUM confidence)
- react-markdown GitHub (https://github.com/remarkjs/react-markdown) — version 10.1.0, `components` prop API for custom renderers
- remark-gfm npm (https://www.npmjs.com/package/remark-gfm) — version 4.0.1, GFM support
- Cruip CSS marquee tutorial (https://cruip.com/create-an-infinite-horizontal-scroll-animation-with-tailwind-css/) — pure CSS ticker pattern with duplicated content

### Tertiary (LOW confidence)
- Web search result claiming Next.js 16 renamed `middleware.ts` to `proxy.ts` — verified HIGH via official Next.js upgrade docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified against official docs and npm; existing project packages confirmed in package.json
- Architecture: HIGH — patterns derived from existing Phase 5.1 code in the same repo; route structure follows Next.js 16 App Router conventions verified in official docs
- Pitfalls: HIGH — async params/searchParams is a documented Next.js 16 breaking change; proxy.ts rename is official; other pitfalls derived from actual schema inspection
- Topic graph adjacency: MEDIUM — exact adjacency relationships are Claude's discretion per CONTEXT.md; sample entries are reasonable but the full map is for the planner/implementer to finalize

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (Next.js 16 is stable; react-markdown 10.x is stable; 30-day window)
