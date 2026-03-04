import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db/client"
import { userTopics, deliveryPreferences } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [topicRows, deliveryPref] = await Promise.all([
    db.query.userTopics.findMany({
      where: eq(userTopics.userId, userId),
      columns: { topic: true },
    }),
    db.query.deliveryPreferences.findFirst({
      where: eq(deliveryPreferences.userId, userId),
      columns: { deliveryTime: true, timezone: true },
    }),
  ])

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-playfair font-black text-3xl text-espresso mb-1">
          Settings
        </h1>
        <p className="font-dm-sans text-brief-muted text-sm">
          Update your topics and delivery preferences.
        </p>
      </div>
      <SettingsForm
        initialTopics={topicRows.map((r) => r.topic)}
        initialDeliveryTime={deliveryPref?.deliveryTime ?? "08:00"}
        initialTimezone={deliveryPref?.timezone ?? ""}
      />
    </div>
  )
}
