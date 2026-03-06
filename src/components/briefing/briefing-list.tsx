"use client"
import Link from "next/link"
import { extractBriefingHeadline } from "@/lib/utils"

interface BriefingRow {
  id: string
  generatedAt: Date | null
  content: string
}

interface BriefingListProps {
  briefings: BriefingRow[]
  deliveryTime?: string  // "HH:MM" for empty state display
}

export function BriefingList({ briefings, deliveryTime }: BriefingListProps) {
  if (briefings.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-espresso font-dm-sans text-sm">Your first briefing arrives tomorrow.</p>
        {deliveryTime && (
          <p className="text-brief-muted font-dm-sans text-sm mt-1">
            Scheduled at {deliveryTime}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="divide-y divide-steam">
      {briefings.map((b) => {
        const date = b.generatedAt
          ? new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(b.generatedAt)
          : "Unknown date"
        const headline = extractBriefingHeadline(b.content)

        return (
          <Link
            key={b.id}
            href={`/dashboard/briefings/${b.id}`}
            className="flex items-baseline justify-between gap-4 py-3 px-1 hover:bg-cream/60 transition-colors group"
          >
            <span className="text-brief-muted font-dm-sans text-xs shrink-0">{date}</span>
            <span className="text-espresso font-dm-sans text-sm truncate group-hover:text-beeswax transition-colors">
              {headline}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
