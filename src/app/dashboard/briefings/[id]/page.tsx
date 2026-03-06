import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db/client"
import { briefings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { BriefingViewer } from "@/components/briefing/briefing-viewer"
import { extractBriefingHeadline } from "@/lib/utils"
import Link from "next/link"

export default async function BriefingPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await props.params

  const briefing = await db
    .select()
    .from(briefings)
    .where(and(eq(briefings.id, id), eq(briefings.userId, session.user.id)))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!briefing) notFound()

  const timezone = "UTC" // fallback; could fetch deliveryPreferences if needed
  const formattedDate = briefing.generatedAt
    ? new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(briefing.generatedAt)
    : ""
  const headline = extractBriefingHeadline(briefing.content)

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/dashboard" className="text-brief-muted font-dm-sans text-xs hover:text-beeswax transition-colors">
          &larr; Briefings
        </Link>
        <p className="text-brief-muted font-dm-sans text-xs uppercase tracking-wider mt-3 mb-1">{formattedDate}</p>
        <h1 className="font-playfair font-bold text-2xl text-espresso">{headline}</h1>
      </div>
      <BriefingViewer content={briefing.content} />
    </div>
  )
}
