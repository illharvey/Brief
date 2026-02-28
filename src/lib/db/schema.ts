import {
  pgTable,
  text,
  timestamp,
  boolean,
  primaryKey,
  integer,
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
