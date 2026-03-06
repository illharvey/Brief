"use client"

import { useTransition } from "react"
import { refreshBriefingAction } from "@/actions/briefings"

export function RefreshBriefingButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => refreshBriefingAction())}
      disabled={isPending}
      className="text-sm font-dm-sans text-brief-muted hover:text-espresso disabled:opacity-50 transition-colors"
    >
      {isPending ? "Generating\u2026" : "\u21bb Request fresh briefing"}
    </button>
  )
}
