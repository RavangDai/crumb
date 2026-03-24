import { NextRequest, NextResponse } from 'next/server'
import { generatePrompt } from '@/lib/generate'
import type { AIProvider } from '@/lib/ai'
import { rateLimit, getClientIP } from '@/lib/ratelimit'

const VALID_PROVIDERS: AIProvider[] = ['gemini', 'openai', 'anthropic']

export async function POST(req: NextRequest) {
  // Rate limit: 15 requests per IP per minute
  const ip = getClientIP(req.headers)
  const rl = rateLimit(`generate:${ip}`, 15)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const { description, apiKey, provider = 'gemini' } = await req.json()

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 })
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    if (description.trim().split(/\s+/).length < 5) {
      return NextResponse.json({ error: 'Tell me a bit more — at least a sentence.' }, { status: 400 })
    }

    if (description.length > 5000) {
      return NextResponse.json({ error: 'Description too long. Max 5,000 characters.' }, { status: 400 })
    }

    const result = await generatePrompt(description, apiKey || undefined, provider as AIProvider)
    return NextResponse.json(result)

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    console.error('Generate error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
