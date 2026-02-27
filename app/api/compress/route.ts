import { NextRequest, NextResponse } from 'next/server'
import { compressConversation } from '@/lib/compress'

export async function POST(req: NextRequest) {
  try {
    const { conversation, server = 1, depth = 'memory', existingCrumb } = await req.json()

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

    const crumbFile = await compressConversation(conversation, server, depth, existingCrumb || undefined)

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