// src/lib/summarisation/llm.ts
// LLM article summarisation with Redis cache-aside and input truncation.
// Cache hit → return cached. Miss → truncate → call Haiku → cache → return.

import { GoogleGenerativeAI } from '@google/generative-ai'
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
Do not include a headline, source name, or URL — those are added separately. \
IMPORTANT: Only state facts that are explicitly present in the provided text. \
Do not infer, extrapolate, or supplement with background knowledge — not even plausible details. \
If a specific fact (name, number, organisation, date) is not in the text, omit it entirely — never use placeholder text like [Name] or [Amount]. \
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

export async function summariseArticle(
  article: ArticleRow
): Promise<{ summary: string; fromCache: boolean; sourceSnapshot: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set — cannot call Gemini API')
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
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: process.env.SUMMARISATION_MODEL ?? 'gemini-2.5-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })
  const isTitleOnly = sourceSnapshot.trim() === article.title.trim()
  const userMessage = isTitleOnly
    ? `Title only — no article body available. Summarise only what the title explicitly states. Do not add any names, figures, dates, or details not present in the title.\n\nTitle: ${article.title}`
    : `Title: ${article.title}\n\n${sourceSnapshot}`
  const result = await model.generateContent(userMessage)
  const summary = result.response.text().trim()

  // 4. Cache the result before returning
  if (summary) {
    await setSummary(normUrl, summary)
  }

  return { summary, fromCache: false, sourceSnapshot }
}
