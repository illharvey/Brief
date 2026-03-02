// src/lib/summarisation/assemble.ts
// Assembles BriefingItems into a topic-structured markdown briefing string.
// Format per bullet: "- {summary text} [{Source Name}]({articleUrl})"

import type { BriefingItem } from './types'

/**
 * Assemble a list of BriefingItems into a markdown briefing string.
 *
 * Structure:
 *   ## Topic Name
 *   - bullet summary [Source Name](url)
 *   - ...
 *
 * Topics are rendered in the order they appear in topicOrder.
 * Topics with no items are omitted entirely.
 */
export function assembleBriefing(
  items: BriefingItem[],
  topicOrder: string[],
  failedTopics: string[] = []
): string {
  const sections: string[] = []

  for (const topic of topicOrder) {
    const topicItems = items.filter(i => i.topic === topic)
    if (topicItems.length === 0) continue

    const header = `## ${topic}`
    const bullets = topicItems.map(item => {
      // Append inline source attribution at end of last bullet line
      const summaryLines = item.summary.split('\n')
      const lastIdx = summaryLines.length - 1
      summaryLines[lastIdx] =
        `${summaryLines[lastIdx]} [${item.sourceName}](${item.articleUrl})`
      return summaryLines.join('\n')
    })

    sections.push([header, ...bullets].join('\n'))
  }

  if (failedTopics.length > 0) {
    sections.push(
      `\n> Some topics could not be fetched: ${failedTopics.join(', ')}. Please try again later.`
    )
  }

  return sections.join('\n\n')
}
