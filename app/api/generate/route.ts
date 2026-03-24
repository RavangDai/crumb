import { NextRequest, NextResponse } from 'next/server'
import { generatePrompt } from '@/lib/generate'
import type { AIProvider } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { description, apiKey, provider = 'gemini' } = await req.json()

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
