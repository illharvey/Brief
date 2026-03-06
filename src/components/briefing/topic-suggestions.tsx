"use client"
import { useState } from "react"
import { toast } from "sonner"
import { addTopicAction } from "@/actions/topics"

interface TopicSuggestionsProps {
  suggestions: string[]
}

export function TopicSuggestions({ suggestions }: TopicSuggestionsProps) {
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)

  if (suggestions.length === 0) return null

  async function handleAdd(topic: string) {
    setLoading(topic)
    const result = await addTopicAction(topic)
    setLoading(null)
    if (result.success) {
      setAdded(prev => new Set(prev).add(topic))
      toast.success(`"${topic}" added to your topics`)
    } else {
      toast.error("Failed to add topic. Please try again.")
    }
  }

  const visible = suggestions.filter(t => !added.has(t))
  if (visible.length === 0) return null

  return (
    <div className="mt-10 pt-6 border-t border-steam">
      <p className="text-brief-muted font-dm-sans text-xs uppercase tracking-wider mb-3">
        You might also like
      </p>
      <div className="flex flex-wrap gap-2">
        {visible.map(topic => (
          <button
            key={topic}
            onClick={() => handleAdd(topic)}
            disabled={loading === topic}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-dm-sans text-espresso border border-warm-brown/30 rounded-full hover:border-beeswax hover:text-beeswax transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {loading === topic ? "Adding\u2026" : `+ ${topic}`}
          </button>
        ))}
      </div>
    </div>
  )
}
