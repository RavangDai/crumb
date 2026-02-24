import { CompressionDepth, getCompressionPrompt } from './prompt'

export async function compressConversation(
  conversation: string,
  server: number = 1,
  depth: CompressionDepth = 'memory'
): Promise<string> {
  const wordCount = conversation.trim().split(/\s+/).length

  // Dynamically select the API key based on the server choice
  let apiKey = process.env.GEMINI_API_KEY
  if (server === 2 && process.env.GEMINI_API_KEY_2) {
    apiKey = process.env.GEMINI_API_KEY_2
  } else if (server === 3 && process.env.GEMINI_API_KEY_3) {
    apiKey = process.env.GEMINI_API_KEY_3
  }

  if (!apiKey) {
    throw new Error(`Server ${server} API key is not configured.`)
  }

  const prompt = getCompressionPrompt(depth)

  // Scale output tokens based on input size — large conversations need more room
  // The confidence JSON block alone takes ~200 tokens
  let baseTokens = 2500
  if (depth === 'snapshot') baseTokens = 1500
  if (depth === 'full') baseTokens = 5000

  // For larger inputs, scale up proportionally (roughly 1 output token per 4 input words)
  const scaledTokens = Math.round(wordCount / 4)
  let maxTokens = Math.max(baseTokens, Math.min(scaledTokens, depth === 'full' ? 8000 : depth === 'memory' ? 5000 : 2500))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\n\nHere is the conversation to compress (approximately ${wordCount} words):\n\n${conversation}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: maxTokens,
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