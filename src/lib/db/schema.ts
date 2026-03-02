import {
  pgTable,
  text,
  timestamp,
  boolean,
  primaryKey,
  integer,
  unique,
} from "drizzle-orm/pg-core"

// ---------------------------------------------------------------------------
// Auth.js managed tables — must match DrizzleAdapter expectations exactly.
// Additional custom columns (passwordHash, onboardingComplete) are safe;
// DrizzleAdapter ignores unknown columns.
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Custom extensions
  passwordHash: text("password_hash"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
})

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<"oauth" | "oidc" | "email" | "webauthn">()
      .notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

// ---------------------------------------------------------------------------
// Custom app tables
// ---------------------------------------------------------------------------

// GDPR consent recording (AUTH-06)
export const userConsents = pgTable("user_consents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(), // "marketing_email" | "terms_of_service"
  consentedAt: timestamp("consented_at").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
})

// Password reset tokens (AUTH-04) — Auth.js Credentials does not provide built-in reset
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // Set on consumption — prevents reuse
})

// User topics (PREF-01) — normalized rows (not jsonb) to enable Phase 6
// co-occurrence queries for adjacent topic suggestions (PREF-04 foundation)
export const userTopics = pgTable("user_topics", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

// Delivery preferences (PREF-02)
// deliveryTime stored as "HH:MM" in user's local timezone; pipeline converts
// at schedule time to avoid DST bugs
export const deliveryPreferences = pgTable("delivery_preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(), // one row per user
  deliveryTime: text("delivery_time").notNull(), // "HH:MM" e.g. "08:00"
  timezone: text("timezone").notNull(), // IANA tz e.g. "Europe/London"
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Email suppression list (MAIL-03, AUTH-07)
// One row per email address — unique constraint prevents duplicate suppressions.
// reason values: "email.bounced" | "email.complained" | "unsubscribe"
export const emailSuppressions = pgTable("email_suppressions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(), // unique: one row per address
  reason: text("reason").notNull(), // "email.bounced" | "email.complained" | "unsubscribe"
  suppressedAt: timestamp("suppressed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

// Articles ingested from RSS feeds and news APIs (CONT-01, CONT-02, CONT-04)
// Unique constraint on (url, userId): same article may appear for different users
// but never twice for the same user. This is per-user permanent dedup across all runs.
export const articles = pgTable(
  'articles',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    url: text('url').notNull(),
    contentHash: text('content_hash').notNull(), // SHA-256(title::url) — secondary dedup
    title: text('title').notNull(),
    body: text('body'),                          // full article body extracted by Phase 3 (null if extraction failed)
    description: text('description'),            // article description/snippet from RSS or API
    sourceName: text('source_name').notNull(),   // e.g. "BBC News - Technology", "The Guardian"
    sourceUrl: text('source_url'),               // feed/publication homepage URL
    publishedAt: timestamp('published_at'),      // null if feed does not provide date
    fetchedAt: timestamp('fetched_at').defaultNow(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    urlUserUnique: unique().on(table.url, table.userId),
  })
)

// ---------------------------------------------------------------------------
// AI Summarisation tables (Phase 4)
// briefings + briefingItems are defined after articles to avoid forward-reference
// issues (briefingItems.articleId references articles.id).
// ---------------------------------------------------------------------------

// briefings stores the assembled markdown briefing for each user/run (CONT-03)
export const briefings = pgTable('briefings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  generatedAt: timestamp('generated_at').defaultNow(),
  content: text('content').notNull(),         // assembled markdown briefing
  topicCount: integer('topic_count'),          // number of topic sections included
  itemCount: integer('item_count'),            // total number of article bullets
  partialFailure: boolean('partial_failure').default(false), // true if any topic errored
})

// briefingItems stores per-article summaries for grounding audits and Phase 6 display (CONT-03)
export const briefingItems = pgTable('briefing_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  briefingId: text('briefing_id')
    .notNull()
    .references(() => briefings.id, { onDelete: 'cascade' }),
  articleId: text('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  topic: text('topic').notNull(),
  summary: text('summary').notNull(),          // generated bullet text (markdown)
  sourceSnapshot: text('source_snapshot').notNull(), // article text sent to LLM (grounding audit)
  fromCache: boolean('from_cache').default(false),
})
