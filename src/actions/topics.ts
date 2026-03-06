"use server"
import { db } from "@/lib/db/client"
import { userTopics } from "@/lib/db/schema"
import { auth } from "@/lib/auth"

export async function addTopicAction(topic: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "unauthenticated" }

  if (!topic || topic.trim().length === 0) return { success: false, error: "invalid_topic" }
  if (topic.trim().length > 80) return { success: false, error: "topic_too_long" }

  await db.insert(userTopics).values({
    userId: session.user.id,
    topic: topic.trim(),
  })
  // No onConflictDoNothing — userTopics has no unique constraint on (userId, topic).
  // Duplicate prevention is handled client-side by filtering existing topics before showing pills.

  return { success: true }
}
