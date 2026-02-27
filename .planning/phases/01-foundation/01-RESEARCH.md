# Phase 1: Foundation - Research

**Researched:** 2026-02-27
**Domain:** Auth.js v5, Drizzle ORM, Neon PostgreSQL, Next.js 15 App Router — authentication, session management, and user preferences data model
**Confidence:** MEDIUM-HIGH (Auth.js v5 APIs verified via official docs; Drizzle/Neon via official docs; architecture patterns verified via multiple community sources; some Auth.js internals have LOW confidence where docs are sparse)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Signup & Onboarding Flow**
- Topics and delivery time are collected during signup — user is fully set up before reaching the app
- Step-by-step flow: Screen 1 (email/password) → Screen 2 (pick topics) → Screen 3 (set delivery time)
- After completing signup: show a confirmation screen ("You're all set — your first Brief arrives at [time]") summarising their topics
- Email verification is required before any briefing is sent — unverified users are signed up but no briefings dispatch until the email link is clicked

**Topic Entry UX**
- Tag/chip input: user types a topic, presses Enter or comma, it becomes a removable chip
- No minimum or maximum topic count — user can add as many as they like
- Suggestions appear as they type (dropdown) to help with consistency (e.g. "AI" vs "Artificial Intelligence"), but user can still add any freeform topic
- Data model must support adjacent topic suggestions for Phase 6 (PREF-04)

**Delivery Time**
- Time picker with browser timezone auto-detected and displayed clearly for user confirmation
- User sees their chosen time alongside their timezone (e.g. "8:00am — Europe/London")

**Session Behaviour**
- Sessions last 30 days rolling — timer resets on each visit
- Multiple devices can be active simultaneously — new login does not invalidate existing sessions
- On session expiry mid-browse: redirect to login page, then redirect back to the page they were on after re-auth

**Auth Error Handling**
- Wrong password: vague message — "Email or password is incorrect" (does not confirm email existence)
- Duplicate email on signup: "An account with this email exists — log in?" with direct link to login
- Rate limiting: soft lock after 5 failed login attempts — 30-second cooldown before next attempt (no account lock)
- Password reset link expires after 1 hour

### Claude's Discretion
- Exact password strength requirements (minimum length, complexity)
- Loading/transition animations between onboarding steps
- Specific colour/style of error states
- Email verification reminder UX (resend link timing/presentation)

### Deferred Ideas (OUT OF SCOPE)
- Adjacent/related topic suggestions UI — Phase 6 (PREF-04)
- OAuth login (Google, GitHub) — v2 backlog
- "Remember me" toggle — session is always 30 days rolling, explicit toggle not needed
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | Credentials provider + custom signup server action; bcrypt for password hashing; Drizzle insert into users table |
| AUTH-02 | User session persists across browser refresh | Auth.js v5 JWT session strategy with 30-day maxAge; stored in HttpOnly cookie; verified via `auth()` in server components |
| AUTH-03 | User can log in with email and password | Auth.js v5 Credentials provider `authorize` function; bcrypt compare; Zod validation |
| AUTH-04 | User can reset password via email link | Custom `password_reset_tokens` table + Resend email; 1-hour expiry; server action validates token and updates hashed password |
| AUTH-05 | User can log out from any page | `signOut()` server action callable from any layout or page component |
| AUTH-06 | Consent timestamp and IP are recorded at signup (GDPR) | Custom `user_consents` table inserted in signup server action; IP extracted from request headers |
| PREF-01 | User can enter freeform topics of interest | `user_topics` table (one row per topic per user); tag chip UI built from shadcn Combobox + Command primitives; stored as text array or normalized rows |
| PREF-02 | User can set a daily delivery time for their briefing | `delivery_preferences` table with `delivery_time` (time), `timezone` (text); browser Intl.DateTimeFormat for auto-detection |
</phase_requirements>

---

## Summary

Phase 1 builds the complete auth and preference data layer that every downstream phase depends on. The stack is locked: Next.js 15 App Router, Auth.js v5 (still in beta but production-ready), Drizzle ORM, and Neon Postgres. The primary complexity in this phase is not the individual pieces — each is well-documented — but their interaction: Auth.js v5 with the Drizzle adapter uses a **JWT session strategy** (not database sessions) because database sessions are incompatible with Next.js Edge Middleware. This is the single most important architectural decision to understand before planning begins.

The 3-step onboarding flow (credentials → topics → delivery time) is implemented as a multi-step client-side form with server actions for final persistence at each step. State between steps lives in client component state or URL search params — not the database — until the user completes each step. Email verification is required but does not block account creation; it only blocks briefing dispatch. Password reset requires a custom `password_reset_tokens` table since Auth.js v5's Credentials provider does not provide built-in password reset.

The topic chip input is composed from shadcn/ui primitives (Combobox + Command + Badge) — no standalone library is needed. The suggestion dropdown can be seeded from a static list initially and swapped for a DB-backed query in Phase 6. GDPR consent recording requires a custom `user_consents` table populated during signup, separate from Auth.js's managed tables.

**Primary recommendation:** Use JWT session strategy (not database) throughout; build all auth-adjacent features (password reset, email verification, consent) as custom Drizzle tables alongside Auth.js's managed schema. Do not fight Auth.js's boundaries.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.x (beta) | Authentication framework — session management, Credentials provider, middleware integration | Only App Router-native auth solution for Next.js; v4 has broken patterns with App Router; v5 is beta but widely adopted in production |
| @auth/drizzle-adapter | latest | Bridges Auth.js to Drizzle ORM for persisting users, accounts, sessions, verification tokens | Official Auth.js adapter; required for any database persistence with Auth.js |
| drizzle-orm | 0.30+ | Type-safe ORM for all database access | Project-wide decision; TypeScript-native, Neon-compatible, no code generation |
| @neondatabase/serverless | latest | Neon Postgres driver | Project-wide decision; the HTTP-based driver is required for Vercel serverless/edge compatibility |
| drizzle-kit | latest | Schema migrations and push | Pairs with drizzle-orm; required for managing schema changes |
| zod | 3.x | Runtime validation for all form inputs and server actions | Type-safe validation that integrates with react-hook-form and server-side validation |
| bcryptjs | 2.x | Password hashing and comparison | Industry standard for server-side credential hashing; bcryptjs is the pure-JS variant (no native bindings required in serverless) |
| react-hook-form | 7.x | Client-side form state and validation for onboarding steps | Works with Zod via @hookform/resolvers; handles multi-step form state cleanly |
| @hookform/resolvers | 3.x | Bridges Zod schemas into react-hook-form | Required companion for Zod + react-hook-form |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| resend | 4.x | Sending email verification and password reset emails | Step 2 onwards of the auth flow requires email sending; Resend is the project-wide email provider |
| @upstash/ratelimit | 2.x | Rate limiting login attempts (5 attempts / 30s cooldown) | Required for AUTH error handling spec; pairs with Upstash Redis which is already in the stack |
| @upstash/redis | 1.x | Redis client for rate limiting store | Required backing store for @upstash/ratelimit; serverless-compatible REST client |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Auth.js v5 | Better Auth | Better Auth is newer (stable release), has built-in password reset, more ergonomic API. Tradeoff: smaller ecosystem, less community documentation, team has no prior familiarity. Auth.js is the locked decision. |
| Auth.js v5 | Clerk | Clerk provides UI components + hosted auth with zero setup. Tradeoff: $25/month after 10K MAU, no self-hosted option. Out of scope for this PoC. |
| bcryptjs | argon2 | argon2 is considered more modern and resistant to GPU attacks. Tradeoff: requires native bindings that can fail in serverless environments. bcryptjs is the safer choice for Vercel deployment. |
| Custom rate limiting | Auth.js built-in | Auth.js v5 Credentials provider has no built-in rate limiting. Must use external solution. |

**Installation:**
```bash
# Auth
npm install next-auth@beta @auth/drizzle-adapter

# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Validation & forms
npm install zod react-hook-form @hookform/resolvers

# Password hashing
npm install bcryptjs
npm install -D @types/bcryptjs

# Email
npm install resend

# Rate limiting
npm install @upstash/ratelimit @upstash/redis
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── app/
│   ├── (auth)/                  # Auth route group — no sidebar/nav layout
│   │   ├── login/
│   │   │   └── page.tsx         # Login form
│   │   ├── signup/
│   │   │   ├── page.tsx         # Step 1: email + password
│   │   │   ├── topics/
│   │   │   │   └── page.tsx     # Step 2: tag chip topic entry
│   │   │   └── delivery/
│   │   │       └── page.tsx     # Step 3: delivery time picker
│   │   ├── verify-email/
│   │   │   └── page.tsx         # Email verification landing
│   │   ├── forgot-password/
│   │   │   └── page.tsx         # Request reset link
│   │   └── reset-password/
│   │       └── page.tsx         # Consume token, set new password
│   └── (dashboard)/             # Protected area — future phases
│       └── layout.tsx           # Auth-guarded layout
├── lib/
│   ├── auth.ts                  # Full Auth.js instance (with Drizzle adapter)
│   ├── auth.config.ts           # Edge-safe auth config (no adapter) — used in middleware
│   └── db/
│       ├── client.ts            # Drizzle db client (Neon HTTP driver)
│       └── schema.ts            # All table definitions (auth + app tables)
├── actions/
│   ├── auth.ts                  # signup, login wrappers, password reset server actions
│   └── preferences.ts           # saveTopics, saveDeliveryTime server actions
├── components/
│   └── ui/
│       ├── topic-input.tsx      # Tag chip input component (shadcn Combobox-based)
│       └── time-picker.tsx      # Delivery time picker with timezone display
middleware.ts                    # Edge-safe auth middleware (uses auth.config.ts only)
```

### Pattern 1: Split Auth Config (Critical for Edge Compatibility)

**What:** Auth.js v5 with a database adapter is incompatible with Next.js Edge Middleware because Edge runtime cannot make TCP connections to Postgres. The solution is to split configuration into two files.

**When to use:** Always when using any database adapter with Auth.js v5 and Next.js middleware.

**Example:**
```typescript
// src/lib/auth.config.ts — Edge-safe, no database, no Node.js-only modules
// Source: https://authjs.dev/guides/edge-compatibility
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { signInSchema } from "@/lib/validations/auth"

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is NOT here — it lives in auth.ts which has DB access
      authorize: undefined,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login
      }
      return true
    },
  },
  pages: {
    signIn: "/login",
  },
}
```

```typescript
// src/lib/auth.ts — Full instance with Drizzle adapter (server-only)
// Source: https://authjs.dev/getting-started/adapters/drizzle
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { signInSchema } from "@/lib/validations/auth"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  session: {
    strategy: "jwt",  // REQUIRED with Credentials provider — database sessions don't work
    maxAge: 30 * 24 * 60 * 60, // 30 days rolling
    updateAge: 24 * 60 * 60,   // Extend session at most once per day
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        })
        if (!user || !user.passwordHash) return null

        const passwordsMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        )
        if (!passwordsMatch) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
})
```

```typescript
// middleware.ts — Uses edge-safe config only
// Source: https://authjs.dev/guides/edge-compatibility
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Pattern 2: Custom Signup Server Action (with GDPR Consent)

**What:** Auth.js v5 does not provide a signup flow for Credentials. You build it as a server action that hashes the password, creates the user, and records consent.

**When to use:** All new user registration.

**Example:**
```typescript
// src/actions/auth.ts
"use server"
import { db } from "@/lib/db/client"
import { users, userConsents } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { headers } from "next/headers"
import { signUpSchema } from "@/lib/validations/auth"

export async function signUpAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const parsed = signUpSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "Invalid credentials" }
  }

  // Check for duplicate email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  })
  if (existing) {
    return { error: "duplicate_email" }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  // Record IP for GDPR consent
  const headersList = await headers()
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown"

  const [newUser] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      passwordHash,
      emailVerified: null, // Set after email verification
    })
    .returning({ id: users.id })

  // AUTH-06: Record GDPR consent
  await db.insert(userConsents).values({
    userId: newUser.id,
    consentType: "marketing_email",
    ipAddress: ip,
    consentedAt: new Date(),
  })

  // TODO: Send verification email via Resend
  return { success: true, userId: newUser.id }
}
```

### Pattern 3: Custom Password Reset (Auth.js Does NOT Provide This for Credentials)

**What:** Auth.js v5 Credentials provider has no built-in password reset. Build it with a custom token table, Resend email, and server actions.

**When to use:** AUTH-04 implementation.

**Example:**
```typescript
// In schema.ts — custom table, not Auth.js managed
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
})

// Server action: request reset link
export async function requestPasswordReset(email: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  // Always return success — don't leak whether email exists
  if (!user) return { success: true }

  const token = crypto.randomUUID() + crypto.randomUUID() // 72 chars entropy
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.insert(passwordResetTokens).values({
    token,
    userId: user.id,
    expiresAt,
  })

  await resend.emails.send({
    from: "noreply@mail.brief.app",
    to: email,
    subject: "Reset your Brief password",
    react: PasswordResetEmail({ resetLink: `${process.env.APP_URL}/reset-password?token=${token}` }),
  })

  return { success: true }
}
```

### Pattern 4: Tag Chip Input (Built from shadcn Primitives)

**What:** No single shadcn component covers the tag chip pattern out of the box. Compose from Command + Popover + Badge + Input.

**When to use:** PREF-01 topic entry (Step 2 of onboarding).

**Example:**
```typescript
// src/components/ui/topic-input.tsx
"use client"
import { useState, KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X } from "lucide-react"

const SEED_SUGGESTIONS = [
  "Artificial Intelligence", "Formula 1", "UK Politics", "Climate Change",
  "Tech Startups", "Cryptocurrency", "Football", "US Politics",
  // Expand from DB in Phase 6 (PREF-04)
]

interface TopicInputProps {
  value: string[]
  onChange: (topics: string[]) => void
}

export function TopicInput({ value: topics, onChange }: TopicInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)

  const addTopic = (topic: string) => {
    const trimmed = topic.trim()
    if (!trimmed || topics.includes(trimmed)) return
    onChange([...topics, trimmed])
    setInputValue("")
  }

  const removeTopic = (topic: string) => {
    onChange(topics.filter((t) => t !== topic))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTopic(inputValue)
    }
    if (e.key === "Backspace" && !inputValue && topics.length > 0) {
      onChange(topics.slice(0, -1))
    }
  }

  const filteredSuggestions = SEED_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !topics.includes(s)
  )

  return (
    <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[80px]">
      {topics.map((topic) => (
        <Badge key={topic} variant="secondary" className="gap-1">
          {topic}
          <button onClick={() => removeTopic(topic)} aria-label={`Remove ${topic}`}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open && filteredSuggestions.length > 0} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <input
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setOpen(true) }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder={topics.length === 0 ? "Type a topic and press Enter..." : "Add another topic..."}
            className="flex-1 min-w-[150px] outline-none bg-transparent text-sm"
          />
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[280px]" align="start">
          <Command>
            <CommandGroup>
              {filteredSuggestions.slice(0, 6).map((s) => (
                <CommandItem key={s} onSelect={() => { addTopic(s); setOpen(false) }}>
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

### Pattern 5: Rate Limiting Login (Upstash)

**What:** Soft-lock after 5 failed login attempts with 30-second cooldown per IP+email combination.

**When to use:** Inside the Credentials `authorize` function or as a server action wrapper.

**Example:**
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "30 s"),
  analytics: false,
})

// Usage in login action:
const { success } = await loginRatelimit.limit(`login:${email}`)
if (!success) {
  return { error: "Too many attempts. Try again in 30 seconds." }
}
```

### Anti-Patterns to Avoid

- **Database session strategy with Credentials provider:** Auth.js v5 requires JWT strategy for Credentials. Using the database session strategy causes a `JWTSessionError` and sessions will not persist. The Drizzle adapter is still used (for storing users/accounts), but session strategy must be `"jwt"`.
- **Authorize logic in auth.config.ts:** The `authorize` function needs `bcrypt` and Drizzle, which require Node.js runtime. Keep `authorize` only in `auth.ts` (not `auth.config.ts`), as `auth.config.ts` is used in Edge Middleware.
- **Relying on Auth.js for password reset or email verification UX:** Auth.js v5 Credentials provider manages sessions only. Password reset tokens, email verification tokens, and consent records must be custom tables.
- **Storing onboarding step progress in the database before completion:** Don't write partial state (e.g., saving topics before delivery time is set). Use client state or URL params across steps, then commit to DB atomically when the step completes.
- **Hashing passwords with a synchronous bcrypt call in a server action without await:** `bcrypt.hash()` is async in `bcryptjs`. Blocking the event loop on password hashing causes request timeouts.

---

## Database Schema

### Auth.js Managed Tables (created via Drizzle migration, structured to match Auth.js expectations)

```typescript
// src/lib/db/schema.ts
import {
  pgTable, text, timestamp, boolean, primaryKey, integer
} from "drizzle-orm/pg-core"

// Auth.js requires these exact column names/types for DrizzleAdapter
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Custom fields (extend beyond Auth.js minimum)
  passwordHash: text("password_hash"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
})

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}))

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}))
```

### Custom App Tables

```typescript
// GDPR consent recording (AUTH-06)
export const userConsents = pgTable("user_consents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(), // "marketing_email" | "terms_of_service"
  consentedAt: timestamp("consented_at").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
})

// Password reset tokens (AUTH-04)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
})

// User topics — PREF-01, and data model foundation for Phase 6 PREF-04
// Normalized rows (not jsonb array) to enable Phase 6 adjacent suggestions query
export const userTopics = pgTable("user_topics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

// Delivery preferences — PREF-02
export const deliveryPreferences = pgTable("delivery_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Stored as "HH:MM" string in user's local timezone
  deliveryTime: text("delivery_time").notNull(), // e.g. "08:00"
  timezone: text("timezone").notNull(),          // IANA tz string e.g. "Europe/London"
  updatedAt: timestamp("updated_at").defaultNow(),
})
```

**Key schema decisions:**
- `userTopics` uses normalized rows (not jsonb) to enable efficient Phase 6 co-occurrence queries for adjacent topic suggestions
- `deliveryPreferences.deliveryTime` stored as text `"HH:MM"` in user's local timezone; delivery pipeline converts to UTC when scheduling
- `users.emailVerified` is null until email verification link is clicked; briefing pipeline checks this before dispatch
- `users.onboardingComplete` flag gates the app — redirects to next onboarding step if false
- `users.passwordHash` is a custom column extending Auth.js's users table — DrizzleAdapter ignores unknown columns

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `bcryptjs` | bcrypt's work factor is calibrated to remain slow against GPU attacks; SHA-256/MD5 are trivially broken |
| Session management | Cookie parsing + JWT signing | Auth.js v5 | JWT signing, cookie rotation, session extension, CSRF protection — all handled; getting any one detail wrong creates security vulnerabilities |
| Email validation | Regex | Zod's `.email()` | Zod handles edge cases in the email spec that most regexes miss |
| Chip input from scratch | Custom contenteditable | shadcn Combobox + Command + Badge | Keyboard accessibility (Escape, Enter, arrow nav, Backspace to remove last chip) is complex to implement correctly |
| Rate limiting data store | In-memory counter | Upstash Redis via @upstash/ratelimit | In-memory counters reset on serverless cold starts, making rate limiting trivially bypassed in Vercel deployments |
| GDPR IP extraction | Custom middleware | `headers()` from `next/headers` | The `x-forwarded-for` header parsing (for proxied requests behind Vercel's edge) has known gotchas; use the established approach |

**Key insight:** Auth and password management have a long tail of security edge cases (timing attacks, token entropy, CSRF, session fixation) that Auth.js has accumulated solutions for over years. Resist the urge to build any of these from scratch.

---

## Common Pitfalls

### Pitfall 1: Database Session Strategy with Credentials Provider

**What goes wrong:** Developer uses `DrizzleAdapter(db)` and expects database sessions to work with the Credentials provider, sees a `JWTSessionError` or sessions not persisting across refreshes.

**Why it happens:** Auth.js defaults to database strategy when an adapter is present. But database sessions require the `sessions` table to be queried on every request, which happens in middleware — and middleware runs on the Edge Runtime which cannot connect to Postgres via TCP.

**How to avoid:** Explicitly set `session: { strategy: "jwt" }` in `auth.ts`. The `DrizzleAdapter` is still needed for storing users and accounts — but session management uses encrypted JWTs in cookies, not DB rows.

**Warning signs:** `sessions` table stays empty; session cookie disappears after first request; `auth()` returns null in server components even after sign-in.

### Pitfall 2: Authorize Logic Leaking Into auth.config.ts

**What goes wrong:** The split-config pattern is misunderstood; developer puts `authorize` (which requires `bcrypt` and `drizzle`) inside `auth.config.ts`, which is imported by Edge Middleware and crashes with "Edge runtime does not support Node.js 'crypto' module."

**Why it happens:** Docs and tutorials don't always make the split-config pattern explicit.

**How to avoid:** `auth.config.ts` must contain ZERO imports of Node.js-only modules. Keep it to providers array (with `authorize: undefined`), callbacks, and pages config. All database/bcrypt logic goes in `auth.ts`.

**Warning signs:** Build warning "The edge runtime does not support Node.js 'crypto' module"; middleware crashes in Vercel preview deployments.

### Pitfall 3: Onboarding Step State Lost on Navigation

**What goes wrong:** Step 1 data (email/password) is not available when the user reaches Step 2 (topics), because Next.js App Router navigation clears client component state by default if you navigate to a different route.

**Why it happens:** Multi-step flows that span separate URL routes cannot share state through component state alone. The user effectively lands on Step 2 as a fresh page.

**How to avoid:** Two valid approaches:
1. Store the userId (created in Step 1) in a cookie or session, then derive subsequent steps from it.
2. Use URL search params to pass minimal state between steps (only user ID, not sensitive data).
3. Use a parent layout with step state managed in the layout's client component.

Recommended: Create the user account in Step 1 server action, store userId in cookie, read it in Step 2 and Step 3. Do not store passwords or sensitive data in URL params.

**Warning signs:** Step 2 page cannot identify which user is completing onboarding; topics are saved to the wrong user.

### Pitfall 4: IP Address Missing in GDPR Consent Record

**What goes wrong:** `userConsents.ipAddress` records "unknown" or `127.0.0.1` for all users in production.

**Why it happens:** In Vercel deployments, the actual client IP is in `x-forwarded-for` header, not the socket IP. Without proper extraction, you log the Vercel edge proxy's IP.

**How to avoid:**
```typescript
const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
         ?? headersList.get("x-real-ip")
         ?? "unknown"
```

**Warning signs:** All consent records show the same IP address; all show `127.0.0.1`.

### Pitfall 5: Password Reset Token Not Invalidated After Use

**What goes wrong:** A password reset link can be used multiple times (or after the password has already been changed), allowing account takeover if the link is intercepted later.

**Why it happens:** Developer inserts the token, validates it, updates the password, but forgets to mark the token as used or delete it.

**How to avoid:** In the reset-password server action, wrap the token validation, password update, and token invalidation in a single Drizzle transaction. Set `usedAt = now()` on the token row, and add a check on validate: `WHERE used_at IS NULL AND expires_at > NOW()`.

**Warning signs:** Clicking a password reset link a second time succeeds; no `usedAt` column or deletion on the token.

### Pitfall 6: Timezone Storage Bug Breaks Delivery Time

**What goes wrong:** Users receive briefings at the wrong time, or delivery time calculations are off after DST changes.

**Why it happens:** Storing delivery time as UTC instead of local time + timezone name. When the user's timezone observes DST, a stored UTC time becomes the wrong local time 6 months later.

**How to avoid:** Store delivery time as `"HH:MM"` string (local time) plus IANA timezone name (e.g., `"Europe/London"`). The scheduling pipeline uses `date-fns-tz` or the `Temporal` API to convert to UTC at schedule time, not at preference-save time. This way DST shifts are handled correctly every day.

**Warning signs:** Users in DST-observing timezones report briefings arriving 1 hour early or late every spring/autumn.

### Pitfall 7: Auth.js v5 Is Still Beta — API May Shift

**What goes wrong:** An npm install of `next-auth@beta` pulls a version with breaking changes from the version documented in tutorials.

**Why it happens:** The beta tag floats across minor/patch releases. API surface has shifted during beta (e.g., `middleware.ts` → `proxy.ts` in Next.js 16, though the project is on Next.js 15 so this may not apply yet).

**How to avoid:** Pin the exact Auth.js version in package.json after verifying it works (`"next-auth": "5.0.0-beta.X"`). Read the [Auth.js releases page](https://github.com/nextauthjs/next-auth/releases) for breaking changes before upgrading.

**Warning signs:** Tutorial code throws TypeScript errors that don't match the installed types; callbacks have unexpected signatures.

---

## Code Examples

Verified patterns from official sources and current documentation:

### Drizzle Client Initialization (Neon HTTP)
```typescript
// src/lib/db/client.ts
// Source: https://orm.drizzle.team/docs/get-started/neon-new
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

### Auth.js v5 Session in Server Component
```typescript
// Any server component
// Source: https://authjs.dev/reference/nextjs
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return <div>Hello {session.user.email}</div>
}
```

### Redirect to Original URL After Login
```typescript
// middleware.ts — preserve callbackUrl
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export const { auth: middleware } = NextAuth({
  ...authConfig,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = nextUrl.pathname.startsWith("/dashboard")
      if (isProtected && !isLoggedIn) {
        const callbackUrl = nextUrl.pathname + nextUrl.search
        const loginUrl = new URL("/login", nextUrl.origin)
        loginUrl.searchParams.set("callbackUrl", callbackUrl)
        return Response.redirect(loginUrl)
      }
      return true
    },
  },
})
```

### Browser Timezone Auto-Detection
```typescript
// src/components/ui/time-picker.tsx (client component)
// Standard browser API — no library needed
const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
// Returns IANA string e.g. "Europe/London", "America/New_York"
```

### Drizzle Config
```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/neon-new
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 with Pages Router | Auth.js v5 with App Router | 2023-2024 | v4 is incompatible with App Router middleware; v5 is required |
| Database sessions for all providers | JWT sessions for Credentials, database sessions for OAuth | Auth.js v5 | Credentials + database sessions cause edge runtime errors; JWT is the correct strategy |
| Prisma as default ORM | Drizzle ORM growing preference | 2024-2025 | Drizzle is TypeScript-native, no code gen, better serverless/edge compat |
| Separate PostCSS config for Tailwind | Tailwind v4 zero-config (`@import "tailwindcss"`) | Q1 2025 | No `tailwind.config.js` required; simpler setup |
| next-auth v5 middleware.ts | next-auth proxy.ts in Next.js 16 | Next.js 16 | Project is on Next.js 15, so `middleware.ts` is still correct |

**Deprecated/outdated:**
- `next-auth@4`: Incompatible with App Router middleware; do not use
- Database session strategy with Credentials provider: Causes Edge runtime errors; always use JWT strategy
- `pages/api/auth/[...nextauth].ts` pattern: v4 Pages Router pattern; App Router uses `app/api/auth/[...nextauth]/route.ts`

---

## Open Questions

1. **Auth.js v5 stable release timeline**
   - What we know: v5 is still on `next-auth@beta` as of February 2026; widely used in production
   - What's unclear: Whether a formal stable release will ship before this phase is implemented, and whether it will contain breaking changes
   - Recommendation: Pin `"next-auth": "5.0.0-beta.X"` to a specific version number verified to work at implementation time; read the [GitHub releases page](https://github.com/nextauthjs/next-auth/releases) immediately before starting

2. **Email verification UX during onboarding (Claude's Discretion)**
   - What we know: Verification is required before briefing dispatch; user must click an emailed link
   - What's unclear: Whether to block the confirmation screen until verified, or show it immediately with a "check your email" prompt and allow access to the app unverified
   - Recommendation: Show confirmation screen immediately after Step 3 with "Check your inbox — verify your email to receive your first Brief." Do not block UI access; only the briefing pipeline checks email verification status.

3. **Rate limiting storage: Upstash Redis vs in-memory**
   - What we know: In-memory rate limiting is bypassed in serverless (cold start resets counter); Upstash Redis is in the stack
   - What's unclear: Upstash free tier limits (was 10,000 commands/day as of Aug 2025) — verify before implementation
   - Recommendation: Use Upstash Redis via `@upstash/ratelimit`; verify free tier is sufficient for beta (10-20 users)

4. **Auth.js Drizzle adapter PostgreSQL schema source of truth**
   - What we know: The schema must match what DrizzleAdapter expects; docs reference it but the tab-based content was not extractable by WebFetch
   - What's unclear: Exact column names for the `accounts` table (particularly OAuth-related columns that may be optional for Credentials-only setup)
   - Recommendation: Cross-reference the official Auth.js Drizzle adapter docs at https://authjs.dev/getting-started/adapters/drizzle directly during implementation, and compare against the `@auth/drizzle-adapter` TypeScript types in node_modules

---

## Sources

### Primary (HIGH confidence)
- https://authjs.dev/getting-started/authentication/credentials — Credentials provider API, authorize function signature, error handling
- https://authjs.dev/guides/edge-compatibility — Split config pattern for edge runtime compatibility
- https://authjs.dev/getting-started/adapters/drizzle — DrizzleAdapter setup, table requirements
- https://authjs.dev/concepts/session-strategies — JWT vs database session strategy tradeoffs
- https://orm.drizzle.team/docs/get-started/neon-new — Drizzle + Neon setup, client initialization, schema syntax

### Secondary (MEDIUM confidence)
- https://authjs.dev/getting-started/migrating-to-v5 — v5 migration guide; session maxAge, updateAge configuration
- https://authjs.dev/getting-started/session-management/protecting — Middleware route protection, callbackUrl redirect pattern
- https://github.com/nextauthjs/next-auth/releases — Auth.js release history; v5 still in beta as of Feb 2026
- Multiple community articles (Jan-Feb 2026) confirming Auth.js v5 credentials + JWT strategy pattern
- https://upstash.com/blog/nextjs-ratelimiting — @upstash/ratelimit sliding window pattern for login rate limiting

### Tertiary (LOW confidence — verify at implementation time)
- Exact column names for Auth.js Drizzle adapter PostgreSQL schema — tab content not extractable; verify in node_modules types
- Upstash Redis free tier limits (was 10,000 commands/day as of Aug 2025) — verify current limits at https://upstash.com/pricing
- Auth.js `session.updateAge` exact behavior for rolling 30-day sessions — documented but not verified with working code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official documentation
- Architecture (split config pattern): HIGH — verified via official Auth.js edge compatibility guide
- Database schema: MEDIUM — DrizzleAdapter table structure verified in principle; exact column names should be cross-checked against library types at implementation time
- Pitfalls: HIGH — JWT/database strategy pitfall verified against official docs and GitHub issues; others cross-verified by multiple community sources
- Tag chip input: MEDIUM — shadcn primitive approach verified; specific component composition is a common pattern but exact implementation will require iteration

**Research date:** 2026-02-27
**Valid until:** 2026-03-13 (14 days — Auth.js is fast-moving in beta; re-verify release notes before implementation)
