import { NextRequest, NextResponse } from 'next/server'
import { analyzeRepo } from '@/lib/craft-repo'
import type { AIProvider } from '@/lib/ai'
import { rateLimit, getClientIP } from '@/lib/ratelimit'

const VALID_PROVIDERS: AIProvider[] = ['gemini', 'openai', 'anthropic']

export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers)
  const rl = rateLimit(`craft-repo:${ip}`, 10)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const { repoUrl, apiKey, provider = 'gemini' } = await req.json()

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 })
    }

    if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.includes('github.com')) {
      return NextResponse.json({ error: 'A valid GitHub repository URL is required.' }, { status: 400 })
    }

    const result = await analyzeRepo(repoUrl, apiKey || undefined, provider as AIProvider)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    console.error('Craft-repo error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
