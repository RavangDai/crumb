import { COMPRESSION_PROMPT } from './prompt'

export async function compressConversation(conversation: string): Promise<string> {
  const wordCount = conversation.trim().split(/\s+/).length

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${COMPRESSION_PROMPT}\n\nHere is the conversation to compress (approximately ${wordCount} words):\n\n${conversation}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      })
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Gemini API error')
  }

  const data = await response.json()
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!result) throw new Error('No response from Gemini')

  return result
}