import { NextRequest, NextResponse } from 'next/server'
import { improvePrompt } from '@/lib/improve'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (prompt.length > 20000) {
      return NextResponse.json({ error: 'Prompt too long. Max 20,000 characters.' }, { status: 400 })
    }

    const result = await improvePrompt(prompt)
    return NextResponse.json(result)

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    console.error('Improve error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
