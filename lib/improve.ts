const IMPROVE_SYSTEM_PROMPT = `You are a world-class prompt engineer. Your job is to take a raw AI prompt and rewrite it into a significantly more effective version.

Analyze the prompt for these failure modes:
- Vague or subjective language ("better", "improve", "nice", "good")
- Weak or generic role definition ("assistant", "helpful AI")
- Missing output format — AI will choose arbitrarily
- No constraints — AI will pad and drift
- Contradictory instructions
- Ambiguous pronouns or undefined references ("this", "it", "the thing")
- Missing context that the AI needs to give a precise answer
- No reasoning chain for complex tasks (chain-of-thought missing)
- Too short to constrain behavior meaningfully

Rewrite it applying these prompt engineering principles:
- Role: Specific expert with years and domain (not "a helpful assistant")
- Objective: Concrete, measurable outcome — not vibes
- Output format: Explicit structure (bullet list / JSON / step-by-step / etc.)
- Constraints: Hard rules, not suggestions. Use "Do not" not "try to avoid"
- Chain of thought: Add "Think step by step before answering" for reasoning tasks
- Tone calibration: Match to domain (technical, mentor, concise, etc.)
- Anti-patterns: Explicitly ban the bad behavior you want to avoid

Return ONLY valid JSON with no markdown wrapper, in exactly this shape:
{
  "improved": "<the full rewritten prompt, ready to paste into any AI>",
  "changes": ["<specific change 1 and why>", "<specific change 2 and why>", "<specific change 3 and why>"]
}

The "changes" array must have exactly 3 entries. Each must be concrete — name what was wrong and what you did to fix it. No generic claims like "made it clearer".`

export async function improvePrompt(rawPrompt: string): Promise<{ improved: string; changes: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{
              text: `${IMPROVE_SYSTEM_PROMPT}\n\nHere is the prompt to improve:\n\n${rawPrompt}`
            }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
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
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) throw new Error('No response from Gemini')

  // Strip markdown code fences if Gemini wraps in ```json ... ```
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (!parsed.improved || !Array.isArray(parsed.changes)) {
      throw new Error('Unexpected response shape')
    }
    return { improved: parsed.improved, changes: parsed.changes.slice(0, 3) }
  } catch {
    throw new Error('Could not parse improvement response. Try again.')
  }
}
