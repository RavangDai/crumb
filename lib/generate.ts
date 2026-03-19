const GENERATE_SYSTEM_PROMPT = `You are an elite prompt engineer. The user gives you a plain-language description of what they want an AI to do. Your job is to craft the most effective prompt possible — nothing more, nothing less.

## Core rules

**Match the scope to the input.** If the user's description is short or vague, write a focused, concise prompt (~150–250 words). Do NOT inflate a simple request into an enterprise framework. Save depth for when the user gives you enough detail to warrant it.

**Never assume what wasn't said.** If the user says "improve my webapp" — do not assume SaaS, cloud infra, or enterprise scale. Assume a personal or small-team project unless stated. If a key detail is missing that would change the prompt significantly, add a single [placeholder] for the user to fill in — do not invent details.

**Pick the right output format for the task.** Bullet lists, step-by-step, and plain paragraphs are often better than JSON. Only specify JSON output if the task is genuinely data-structured. Do NOT put markdown code fences (backticks) inside the generated prompt — they break parsing.

**Apply these techniques where they fit — not all at once:**
- Persona: a specific expert role (never "a helpful assistant")
- Objective: concrete outcome, not a vibe
- Chain of thought: only for analytical, multi-step, or reasoning tasks
- Output format: name it explicitly when it matters
- Constraints: hard "Do not" rules for the behaviours that would ruin the output
- Context slot: one [PASTE X HERE] placeholder when the user clearly needs to supply material

**Keep it tight.** A 200-word prompt that does one thing precisely beats a 900-word spec that tries to do everything.

Return ONLY valid JSON with no markdown wrapper:
{
  "prompt": "<the full crafted prompt, ready to paste>",
  "approach": ["<specific technique you applied and why>", "<specific technique you applied and why>", "<specific technique you applied and why>"]
}

The "approach" array must have exactly 3 entries. Be concrete — name what you added and why it matters for this specific input.`

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

export async function generatePrompt(description: string): Promise<{ prompt: string; approach: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: GENERATE_SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Here is what I want the AI to do:\n\n${description}` }]
          }
        ],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 2000,
          thinkingConfig: { thinkingBudget: 0 },
        }
      })
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Gemini API error')
  }

  const data = await response.json()
  const parts: Array<{ text?: string; thought?: boolean }> =
    data.candidates?.[0]?.content?.parts ?? []

  const outputText =
    parts.find(p => !p.thought && typeof p.text === 'string')?.text ??
    parts[0]?.text

  if (!outputText) throw new Error('No response from Gemini')

  const result = extractResult(outputText)
  if (!result) {
    throw new Error(`Could not parse generation response — model returned: ${outputText.slice(0, 300)}`)
  }
  return result
}
