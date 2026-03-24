export type AIProvider = 'gemini' | 'openai' | 'anthropic'

export const PROVIDER_MODELS: Record<AIProvider, string> = {
  gemini:    'gemini-2.5-flash',
  openai:    'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
}

export interface AICallConfig {
  systemPrompt?: string
  userMessage: string
  temperature?: number
  maxTokens?: number
  /** Only used for Gemini — ignored for other providers */
  thinkingBudget?: number
}

export async function callAI(
  config: AICallConfig,
  apiKey: string,
  provider: AIProvider = 'gemini'
): Promise<string> {
  switch (provider) {
    case 'gemini':    return callGemini(config, apiKey)
    case 'openai':    return callOpenAI(config, apiKey)
    case 'anthropic': return callAnthropic(config, apiKey)
    default: throw new Error(`Unknown provider: ${provider}`)
  }
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

async function callGemini(config: AICallConfig, apiKey: string): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: config.userMessage }] }],
    generationConfig: {
      temperature: config.temperature ?? 0.5,
      maxOutputTokens: config.maxTokens ?? 2000,
      ...(config.thinkingBudget != null
        ? { thinkingConfig: { thinkingBudget: config.thinkingBudget } }
        : {}),
    },
  }
  if (config.systemPrompt) {
    body.systemInstruction = { parts: [{ text: config.systemPrompt }] }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDER_MODELS.gemini}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Gemini API error')
  }
  const data = await res.json()
  const parts: Array<{ text?: string; thought?: boolean }> = data.candidates?.[0]?.content?.parts ?? []
  const text = parts.find(p => !p.thought && typeof p.text === 'string')?.text ?? parts[0]?.text
  if (!text) throw new Error('No response from Gemini')
  return text
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function callOpenAI(config: AICallConfig, apiKey: string): Promise<string> {
  const messages: Array<{ role: string; content: string }> = []
  if (config.systemPrompt) messages.push({ role: 'system', content: config.systemPrompt })
  messages.push({ role: 'user', content: config.userMessage })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PROVIDER_MODELS.openai,
      messages,
      temperature: config.temperature ?? 0.5,
      max_tokens: config.maxTokens ?? 2000,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'OpenAI API error')
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('No response from OpenAI')
  return text
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function callAnthropic(config: AICallConfig, apiKey: string): Promise<string> {
  const body: Record<string, unknown> = {
    model: PROVIDER_MODELS.anthropic,
    max_tokens: config.maxTokens ?? 2000,
    temperature: config.temperature ?? 0.5,
    messages: [{ role: 'user', content: config.userMessage }],
  }
  if (config.systemPrompt) body.system = config.systemPrompt

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Anthropic API error')
  }
  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('No response from Anthropic')
  return text
}
