import { db } from "@/lib/db/client"
import { userTopics, deliveryPreferences } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Format "HH:MM" as "8:00am" or "2:30pm"
function formatTimeDisplay(time: string): string {
  if (!time) return time
  const [hourStr, minuteStr] = time.split(":")
  const hour = parseInt(hourStr, 10)
  const period = hour >= 12 ? "pm" : "am"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minuteStr}${period}`
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>
}) {
  const { uid } = await searchParams

  // Query actual user data if we have a uid — the delivery page passes this as ?uid= on redirect
  let topics: string[] = []
  let deliveryTime: string | null = null
  let timezone: string | null = null

  if (uid) {
    const [topicRows, prefRow] = await Promise.all([
      db.query.userTopics.findMany({
        where: eq(userTopics.userId, uid),
        columns: { topic: true },
      }),
      db.query.deliveryPreferences.findFirst({
        where: eq(deliveryPreferences.userId, uid),
        columns: { deliveryTime: true, timezone: true },
      }),
    ])
    topics = topicRows.map((r) => r.topic)
    deliveryTime = prefRow?.deliveryTime ?? null
    timezone = prefRow?.timezone ?? null
  }

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <div className="text-4xl">&#x2713;</div>
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re all set</h1>
        {deliveryTime && timezone ? (
          <p className="text-muted-foreground">
            Your first Brief arrives at{" "}
            <strong>{formatTimeDisplay(deliveryTime)} — {timezone}</strong>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Check your inbox — verify your email to receive your first Brief.
          </p>
        )}
      </div>

      {topics.length > 0 && (
        <div className="rounded-lg border p-4 text-left space-y-3">
          <p className="text-sm font-medium">Your topics</p>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Badge key={topic} variant="secondary">{topic}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 text-left space-y-2">
        <p className="text-sm text-muted-foreground">
          Check your inbox to verify your email. Briefings will start arriving once verified.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Already verified?</p>
        <Button asChild className="w-full">
          <Link href="/login">Log in to Brief</Link>
        </Button>
      </div>
    </div>
  )
}
