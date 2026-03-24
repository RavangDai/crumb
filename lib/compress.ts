import { CompressionDepth, getCompressionPrompt, getUpdatePrompt } from './prompt'
import { callAI, AIProvider } from './ai'

export async function compressConversation(
  conversation: string,
  server: number = 1,
  depth: CompressionDepth = 'memory',
  existingCrumb?: string,
  userApiKey?: string,
  provider: AIProvider = 'gemini'
): Promise<string> {
  const wordCount = conversation.trim().split(/\s+/).length

  let apiKey = userApiKey || null
  let activeProvider = provider

  // If no user key provided, fall back to built-in Gemini keys
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || null
    if (server === 2 && process.env.GEMINI_API_KEY_2) apiKey = process.env.GEMINI_API_KEY_2
    else if (server === 3 && process.env.GEMINI_API_KEY_3) apiKey = process.env.GEMINI_API_KEY_3
    activeProvider = 'gemini'
  }

  if (!apiKey) throw new Error('No API key available. Add your API key in Settings.')

  const promptText = existingCrumb
    ? getUpdatePrompt(existingCrumb, conversation)
    : `${getCompressionPrompt(depth)}\n\nHere is the conversation to compress (approximately ${wordCount} words):\n\n${conversation}`

  let baseTokens = 2500
  if (depth === 'snapshot') baseTokens = 1500
  if (depth === 'full') baseTokens = 5000

  const scaledTokens = Math.round(wordCount / 4)
  let maxTokens = Math.max(baseTokens, Math.min(scaledTokens, depth === 'full' ? 8000 : depth === 'memory' ? 5000 : 2500))
  if (existingCrumb) maxTokens = Math.max(3000, maxTokens)

  return callAI({
    userMessage: promptText,
    temperature: 0.3,
    maxTokens,
  }, apiKey, activeProvider)
}
