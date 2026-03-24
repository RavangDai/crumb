import { callAI, AIProvider } from './ai'

const GENERATE_SYSTEM_PROMPT = `You are an elite prompt engineer with deep expertise in getting exceptional results from AI models. The user gives you a description of what they want — sometimes detailed, sometimes just a few vague words. Your job is to produce the most powerful, effective prompt possible regardless of how good or bad their description is.

## When the input is vague or sparse

This is where you shine. A weak description is not a reason to produce a weak prompt — it's an invitation to apply expert judgment. Do the following:

1. **Infer the most likely intent.** "help with emails" → the user probably wants to write professional, persuasive emails. "fix my code" → they want a senior developer reviewing for bugs and quality. Commit to the most reasonable interpretation.
2. **Fill the gaps with expert defaults.** Choose the persona, constraints, and output format that a prompt engineer would pick for this type of task. Don't ask — decide.
3. **Use one [PLACEHOLDER] only when the missing info would completely change the prompt** (e.g. the specific topic, the target audience, or the code to review). Everything else, fill in with smart defaults.
4. **Produce a full, rich prompt.** A vague input is not a signal to write less — it's a signal to write more thoughtfully. Give the AI model everything it needs.

## Techniques to apply (mix and match as the task demands)

- **Persona**: A sharply defined expert role. "Senior backend engineer who has built high-traffic APIs" beats "a developer".
- **Objective**: A concrete, measurable outcome. "Identify the 3 most critical bugs and explain the fix" beats "find bugs".
- **Context slot**: Add [PASTE YOUR X HERE] only when the user clearly needs to supply material the AI can't work without.
- **Chain of thought**: For analytical, multi-step, or reasoning tasks — tell the AI to think before answering.
- **Output format**: Specify exactly what structure the response should take. Name it, show it if helpful.
- **Constraints**: Hard behavioral rules. "Do not suggest rewrites of working code." "Every claim must cite a source." These prevent the most common failure modes.
- **Self-check**: "Before responding, verify your answer for gaps and errors." Adds a quality layer for high-stakes tasks.

## Output quality bar

The generated prompt must be noticeably better than what the user wrote. When you read it back, it should feel like a professional prompt engineer spent time on it. Specific, purposeful, and immediately usable.

Do NOT put markdown code fences (backticks) inside the generated prompt — they break parsing.

Return ONLY valid JSON with no markdown wrapper:
{
  "prompt": "<the full crafted prompt, ready to paste>",
  "approach": ["<specific technique you applied and why>", "<specific technique you applied and why>", "<specific technique you applied and why>"]
}

The "approach" array must have exactly 3 entries. Be concrete — explain what inference or technique you applied and why it makes the prompt meaningfully better.`

function extractResult(raw: string): { prompt: string; approach: string[] } | null {
  const candidates: string[] = [
    raw,
    raw.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/gi, '$1').trim(),
  ]
  const jsonBlock = raw.match(/\{[\s\S]*\}/)
  if (jsonBlock) candidates.push(jsonBlock[0])

  for (const s of candidates) {
    if (!s) continue
    try {
      const p = JSON.parse(s)
      const node = typeof p.prompt === 'string' ? p : (p.result ?? p.output ?? p.data ?? null)
      if (!node) continue
      if (typeof node.prompt === 'string' && Array.isArray(node.approach)) {
        return { prompt: node.prompt, approach: (node.approach as string[]).slice(0, 3) }
      }
    } catch {
      // try next
    }
  }
  return null
}

function getBuiltInGeminiKey(): string | undefined {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[]
  if (keys.length === 0) return undefined
  return keys[Math.floor(Math.random() * keys.length)]
}

export async function generatePrompt(
  description: string,
  userApiKey?: string,
  provider: AIProvider = 'gemini'
): Promise<{ prompt: string; approach: string[] }> {
  const apiKey = userApiKey || getBuiltInGeminiKey()
  if (!apiKey) throw new Error('No API key available. Add your API key in Settings.')

  const userMessage = `Here is what I want the AI to do:\n\n${description}${
    description.trim().split(/\s+/).length < 15
      ? '\n\n[Note: This description is brief — infer intent and produce a full, professional prompt with smart defaults.]'
      : ''
  }`

  const outputText = await callAI({
    systemPrompt: GENERATE_SYSTEM_PROMPT,
    userMessage,
    temperature: 0.6,
    maxTokens: 3000,
    thinkingBudget: 8000,
  }, apiKey, provider)

  const result = extractResult(outputText)
  if (!result) {
    throw new Error(`Could not parse generation response — model returned: ${outputText.slice(0, 300)}`)
  }
  return result
}
