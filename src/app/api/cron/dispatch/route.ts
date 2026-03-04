import type { NextRequest } from 'next/server'
import { runDispatch } from '@/lib/dispatch'

// 5 minutes — Pro plan maximum with fluid compute (supports serial dispatch for ~20 users)
export const maxDuration = 300

export async function GET(request: NextRequest) {
  // Verify request is from Vercel Cron (or authorised caller in dev)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startedAt = new Date().toISOString()
  try {
    const result = await runDispatch()
    console.log(JSON.stringify({ event: 'cron_handler_complete', startedAt, ...result }))
    return Response.json({ ok: true, startedAt, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(JSON.stringify({ event: 'cron_handler_error', startedAt, error: message }))
    return Response.json({ ok: false, startedAt, error: message }, { status: 500 })
  }
}
