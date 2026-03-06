import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Derives a display headline from briefing markdown content.
 * Parses ## headings and formats: "AI, Finance" or "AI, Finance — and 2 more"
 * Returns "Your briefing" if no headings found.
 */
export function extractBriefingHeadline(content: string): string {
  const headings = content
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.replace('## ', '').trim())

  if (headings.length === 0) return "Your briefing"
  if (headings.length <= 3) return headings.join(', ')
  return `${headings.slice(0, 2).join(', ')} — and ${headings.length - 2} more`
}
