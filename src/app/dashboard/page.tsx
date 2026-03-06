import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db/client"
import { briefings, userTopics as userTopicsTable, deliveryPreferences } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { BriefingViewer } from "@/components/briefing/briefing-viewer"
import { BriefingList } from "@/components/briefing/briefing-list"
import { TopicSuggestions } from "@/components/briefing/topic-suggestions"
import { RefreshBriefingButton } from "@/components/briefing/refresh-button"
import { getAdjacentTopics } from "@/lib/topic-graph"
import { extractBriefingHeadline } from "@/lib/utils"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  // Fetch data in parallel
  const [recentBriefings, topicRows, prefs] = await Promise.all([
    db.select().from(briefings).where(eq(briefings.userId, userId)).orderBy(desc(briefings.generatedAt)).limit(14),
    db.select().from(userTopicsTable).where(eq(userTopicsTable.userId, userId)),
    db.select().from(deliveryPreferences).where(eq(deliveryPreferences.userId, userId)).limit(1),
  ])

  const userTopicNames = topicRows.map(t => t.topic)
  const deliveryTime = prefs[0]?.deliveryTime ?? "08:00"
  const timezone = prefs[0]?.timezone ?? "UTC"

  // Determine if today's briefing exists
  const mostRecent = recentBriefings[0] ?? null
  const now = new Date()
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now) // YYYY-MM-DD
  const mostRecentDateStr = mostRecent?.generatedAt
    ? new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(mostRecent.generatedAt)
    : null
  const hasTodayBriefing = mostRecentDateStr === todayStr

  // Topic suggestions: adjacent topics minus already-followed
  const suggestions = getAdjacentTopics(userTopicNames, 4).filter(
    t => !userTopicNames.map(u => u.toLowerCase()).includes(t.toLowerCase())
  )

  // Briefing list — all 14 for the archive; today's is [0] if hasTodayBriefing
  const headline = mostRecent ? extractBriefingHeadline(mostRecent.content) : ""
  const formattedDate = mostRecent?.generatedAt
    ? new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(mostRecent.generatedAt)
    : ""

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Briefing header */}
      {hasTodayBriefing && mostRecent ? (
        <>
          <div className="mb-4">
            <p className="text-brief-muted font-dm-sans text-xs uppercase tracking-wider mb-1">{formattedDate}</p>
            <h1 className="font-playfair font-bold text-2xl text-espresso">{headline}</h1>
          </div>
          <div className="flex justify-end mb-4">
            <RefreshBriefingButton />
          </div>
          <BriefingViewer content={mostRecent.content} />
          {suggestions.length > 0 && <TopicSuggestions suggestions={suggestions} />}
        </>
      ) : (
        <div className="py-12">
          <div className="border border-steam rounded-lg p-8 text-center bg-cream/30 mb-8">
            <h1 className="font-playfair font-bold text-xl text-espresso mb-2">Your briefing is on the way</h1>
            <p className="text-brief-muted font-dm-sans text-sm">
              {"It'll be ready at "}{deliveryTime}
            </p>
            {mostRecent && !hasTodayBriefing && (
              <Link
                href={`/dashboard/briefings/${mostRecent.id}`}
                className="inline-block mt-4 text-beeswax font-dm-sans text-sm hover:text-beeswax-deep underline underline-offset-2"
              >
                Read yesterday&apos;s briefing
              </Link>
            )}
          </div>
          <div className="flex justify-end">
            <RefreshBriefingButton />
          </div>
        </div>
      )}

      {/* Archive list — shown below the viewer always */}
      <div className="mt-12 pt-6 border-t border-steam">
        <h2 className="font-playfair font-semibold text-base text-espresso mb-4">Past briefings</h2>
        <BriefingList briefings={recentBriefings} deliveryTime={deliveryTime} />
      </div>
    </div>
  )
}
