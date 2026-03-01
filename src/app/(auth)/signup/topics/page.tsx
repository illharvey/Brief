"use client"
import { useState, useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TopicInput } from "@/components/ui/topic-input"
import { saveTopicsAction } from "@/actions/preferences"

async function saveTopicsWrapper(prevState: unknown, formData: FormData) {
  return await saveTopicsAction(formData)
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<string[]>([])
  const [state, formAction, isPending] = useActionState(saveTopicsWrapper, null)
  const router = useRouter()

  useEffect(() => {
    if (state && "success" in state && state.success) {
      router.push("/signup/delivery")
    }
  }, [state, router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">What are you interested in?</h1>
        <p className="text-sm text-muted-foreground mt-1">Step 2 of 3 — Add topics, press Enter or comma to confirm</p>
      </div>

      <form action={formAction} className="space-y-4">
        <TopicInput value={topics} onChange={setTopics} />
        {/* Pass topics as JSON string — saveTopicsAction parses it */}
        <input type="hidden" name="topics" value={JSON.stringify(topics)} />

        {state?.error === "unauthenticated" && (
          <p className="text-sm text-destructive">Session expired. <a href="/signup" className="underline">Start over</a></p>
        )}
        {topics.length === 0 && (
          <p className="text-sm text-muted-foreground">Add at least one topic to continue.</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending || topics.length === 0}>
          {isPending ? "Saving..." : "Continue"}
        </Button>
      </form>
    </div>
  )
}
