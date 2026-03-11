"use server"

import { auth } from "@/lib/auth"
import { ingestForUser } from "@/lib/ingestion"
import { enrichForUser } from "@/lib/ingestion/enrich"
import { generateBriefingForUser } from "@/lib/summarisation"
import { revalidatePath } from "next/cache"

export async function refreshBriefingAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthenticated")

  const userId = session.user.id
  await ingestForUser(userId)
  await enrichForUser(userId)
  await generateBriefingForUser(userId)
  revalidatePath("/dashboard")
}
