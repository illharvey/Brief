// src/lib/summarisation/llm.ts
// LLM article summarisation with Redis cache-aside and input truncation.
// Cache hit → return cached. Miss → truncate → call Haiku → cache → return.

import Anthropic from '@anthropic-ai/sdk'
import { getSummary, setSummary } from './cache'
import { normaliseUrl } from '@/lib/ingestion/dedup'
import type { ArticleRow } from './types'

// ~4 chars/token English approximation. 2,000 token budget = 8,000 chars.
const MAX_INPUT_CHARS = 8_000

const SYSTEM_PROMPT = `You are a neutral news summarisation assistant. \
Summarise the article in 1–3 concise bullet points. \
Use a factual, journalistic tone — no editorialising or opinion. \
If the article contains a direct quote that adds value, include it with attribution. \
Return only the bullet points, each starting with "- ". \
Do not include a headline, source name, or URL — those are added separately.`

function truncate(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text
  const cut = text.slice(0, MAX_INPUT_CHARS)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + ' [truncated]'
}

function buildSourceSnapshot(article: ArticleRow): string {
  // Prefer body, fall back to title + description, fall back to title only
  const raw = article.body
    ?? [article.title, article.description].filter(Boolean).join('\n\n')
    ?? article.title
  return truncate(raw)
}

export async function summariseArticle(
  article: ArticleRow
): Promise<{ summary: string; fromCache: boolean; sourceSnapshot: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — cannot call Anthropic API')
  }

  const normUrl = normaliseUrl(article.url)

  // 1. Cache check — global hit means skip LLM entirely
  const cached = await getSummary(normUrl)
  if (cached) {
    return { summary: cached, fromCache: true, sourceSnapshot: '' }
  }

  // 2. Build and truncate source text
  const sourceSnapshot = buildSourceSnapshot(article)

  // 3. LLM call
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: process.env.SUMMARISATION_MODEL ?? 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Title: ${article.title}\n\n${sourceSnapshot}` }],
  })

  const summary = response.content[0]?.type === 'text'
    ? response.content[0].text.trim()
    : ''

  // 4. Cache the result before returning
  if (summary) {
    await setSummary(normUrl, summary)
  }

  return { summary, fromCache: false, sourceSnapshot }
}
