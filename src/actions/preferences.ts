"use server"
import { db } from "@/lib/db/client"
import { userTopics, deliveryPreferences, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { topicsSchema, deliveryPreferenceSchema } from "@/lib/validations/preferences"

// -------------------------------------------------------------------------
// resolveUserId
// Helper: resolve userId from session (logged in) or onboarding cookie
// (mid-onboarding — set after Step 1, cleared after Step 3).
// -------------------------------------------------------------------------
async function resolveUserId(): Promise<string | null> {
  // Try session first (post-onboarding)
  const session = await auth()
  if (session?.user?.id) return session.user.id

  // Fall back to onboarding cookie (set after Step 1, cleared after Step 3)
  const cookieStore = await cookies()
  return cookieStore.get("onboarding_user_id")?.value ?? null
}

// -------------------------------------------------------------------------
// saveTopicsAction (PREF-01)
// Atomically replaces all user topics — delete old rows, insert new ones in a
// transaction. Using normalized rows (not jsonb) to support Phase 6
// co-occurrence queries (PREF-04).
// -------------------------------------------------------------------------
export async function saveTopicsAction(formData: FormData) {
  const userId = await resolveUserId()
  if (!userId) return { error: "unauthenticated" }

  const rawTopics = formData.get("topics")
  let topicsArray: string[]
  try {
    topicsArray = JSON.parse(rawTopics as string)
  } catch {
    return { error: "invalid_input" }
  }

  const parsed = topicsSchema.safeParse({ topics: topicsArray })
  if (!parsed.success) {
    return { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  await db.transaction(async (tx) => {
    // Delete existing topics for this user
    await tx.delete(userTopics).where(eq(userTopics.userId, userId))
    // Insert new topics
    await tx.insert(userTopics).values(
      parsed.data.topics.map((topic) => ({
        userId,
        topic,
      }))
    )
  })

  return { success: true }
}

// -------------------------------------------------------------------------
// saveDeliveryPreferenceAction (PREF-02)
// Upserts the delivery time and timezone — one row per user.
// deliveryTime stored as "HH:MM" in user's local timezone; NOT converted to UTC
// here. DST-safe: pipeline converts at schedule time using IANA timezone.
// Also marks onboardingComplete = true (final onboarding step).
// Returns userId so delivery page can pass it as ?uid= query param to
// confirmation page, which displays the user's actual topics and delivery time.
// -------------------------------------------------------------------------
export async function saveDeliveryPreferenceAction(formData: FormData) {
  const userId = await resolveUserId()
  if (!userId) return { error: "unauthenticated" }

  const raw = {
    deliveryTime: formData.get("deliveryTime"),
    timezone: formData.get("timezone"),
  }

  const parsed = deliveryPreferenceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // Upsert: insert or update the single delivery_preferences row for this user
  await db
    .insert(deliveryPreferences)
    .values({
      userId,
      deliveryTime: parsed.data.deliveryTime,
      timezone: parsed.data.timezone,
    })
    .onConflictDoUpdate({
      target: deliveryPreferences.userId,
      set: {
        deliveryTime: parsed.data.deliveryTime,
        timezone: parsed.data.timezone,
        updatedAt: new Date(),
      },
    })

  // Mark onboarding complete after final step
  await db
    .update(users)
    .set({ onboardingComplete: true })
    .where(eq(users.id, userId))

  return { success: true, userId }
}
