// src/lib/summarisation/llm.ts
// LLM article summarisation with Redis cache-aside and input truncation.
// Cache hit → return cached. Miss → truncate → call LLM → cache → return.

import OpenAI from 'openai'
import { getSummary, setSummary } from './cache'
import { normaliseUrl } from '@/lib/ingestion/dedup'
import type { ArticleRow } from './types'

// ~4 chars/token English approximation. 2,000 token budget = 8,000 chars.
const MAX_INPUT_CHARS = 8_000

const SYSTEM_PROMPT = `You are a neutral news fact-extraction assistant. \
Extract 1–3 specific, verifiable facts from the article text. \
Each bullet must be concrete: include a name, number, date, event outcome, or decision — not a vague description. \
Good bullets (concrete and specific): \
- Apple pledged $500 billion in US investment over four years, the company announced Monday. \
- The Fed raised interest rates by 0.25 percentage points to a target range of 5.25–5.5%. \
- Manchester City beat Arsenal 3–1 at the Emirates Stadium on Saturday. \
Bad bullets (too vague — never write these): \
- The company made a significant announcement. \
- Officials discussed the ongoing situation. \
- The event took place over the weekend. \
If the article contains a direct quote that adds factual value, include it with attribution. \
Return only the bullet points, each starting with "- ". \
Do not include a headline, source name, or URL — those are added separately. \
IMPORTANT: Only state facts explicitly present in the provided text. \
Do not infer, extrapolate, or supplement with background knowledge — not even plausible details. \
If no specific facts are present in the text, return the single most concrete statement available. \
Do not add commentary about what the source text does or does not contain.`

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

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function summariseArticle(
  article: ArticleRow
): Promise<{ summary: string; fromCache: boolean; sourceSnapshot: string }> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set — cannot call LLM')
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
  const isTitleOnly = sourceSnapshot.trim() === article.title.trim()
  const userMessage = isTitleOnly
    ? `Title only — no article body available. Summarise only what the title explicitly states. Do not add any names, figures, dates, or details not present in the title.\n\nTitle: ${article.title}`
    : `Title: ${article.title}\n\n${sourceSnapshot}`

  const response = await client.chat.completions.create({
    model: process.env.SUMMARISATION_MODEL ?? 'google/gemini-2.0-flash-lite',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  })
  const summary = response.choices[0]?.message?.content?.trim() ?? ''

  // 4. Cache the result before returning
  if (summary) {
    await setSummary(normUrl, summary)
  }

  return { summary, fromCache: false, sourceSnapshot }
}
