import { NextRequest, NextResponse } from 'next/server'
import { improvePrompt } from '@/lib/improve'
import type { AIProvider } from '@/lib/ai'
import { rateLimit, getClientIP } from '@/lib/ratelimit'

const VALID_PROVIDERS: AIProvider[] = ['gemini', 'openai', 'anthropic']

export async function POST(req: NextRequest) {
  // Rate limit: 15 requests per IP per minute
  const ip = getClientIP(req.headers)
  const rl = rateLimit(`improve:${ip}`, 15)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const { prompt, apiKey, provider = 'gemini' } = await req.json()

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 })
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (prompt.length > 20000) {
      return NextResponse.json({ error: 'Prompt too long. Max 20,000 characters.' }, { status: 400 })
    }

    const result = await improvePrompt(prompt, apiKey || undefined, provider as AIProvider)
    return NextResponse.json(result)

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    console.error('Improve error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
