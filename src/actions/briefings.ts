"use server"

import { auth } from "@/lib/auth"
import { generateBriefingForUser } from "@/lib/summarisation"
import { revalidatePath } from "next/cache"

export async function refreshBriefingAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthenticated")

  await generateBriefingForUser(session.user.id)
  revalidatePath("/dashboard")
}
