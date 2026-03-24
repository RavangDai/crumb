import { NextRequest, NextResponse } from 'next/server'
import { compressConversation } from '@/lib/compress'
import type { AIProvider } from '@/lib/ai'
import { rateLimit, getClientIP } from '@/lib/ratelimit'

const VALID_PROVIDERS: AIProvider[] = ['gemini', 'openai', 'anthropic']

export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per IP per minute (compression is heavier)
  const ip = getClientIP(req.headers)
  const rl = rateLimit(`compress:${ip}`, 10)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const { conversation, server = 1, depth = 'memory', existingCrumb, apiKey, provider = 'gemini' } = await req.json()

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 })
    }

    if (!conversation || conversation.trim().length === 0) {
      return NextResponse.json(
        { error: 'Conversation is required' },
        { status: 400 }
      )
    }

    if (conversation.length > 50000) {
      return NextResponse.json(
        { error: 'Conversation too long. Max 50,000 characters.' },
        { status: 400 }
      )
    }

    const crumbFile = await compressConversation(
      conversation,
      server,
      depth,
      existingCrumb || undefined,
      apiKey || undefined,
      provider as AIProvider
    )

    return NextResponse.json({ crumbFile })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    console.error('Compression error:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
