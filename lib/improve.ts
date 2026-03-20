const IMPROVE_SYSTEM_PROMPT = `You are an expert prompt engineer. Rewrite the user's prompt so it produces noticeably better AI output.

## Your job

Make every sentence do more work. The improved prompt should get a meaningfully different (better) response from an AI than the original would. If your rewrite would produce roughly the same output as the original, you haven't improved it — push harder.

## How to improve

1. **Sharpen the role.** "Senior UX designer" is fine. But "senior UX designer who has shipped 50+ mobile apps" gives the AI a much stronger voice. Add 3-5 words of specificity to the persona — don't rewrite it into a paragraph.

2. **Make the task concrete.** "Critique this design" → "Identify the 3 biggest usability problems in this design and for each one, explain why it fails and propose a specific fix with a rough wireframe description." The AI needs to know what "done" looks like.

3. **Add missing context slots.** If the prompt references "this design" or "this code" but has no [PASTE YOUR DESIGN/CODE HERE] placeholder, add one. Without it, the AI will hallucinate.

4. **Strengthen constraints into behavioral rules.** "Be concrete, not vague" → "Every recommendation must include: what to change, where in the design, and why it improves the user experience. No general advice." Turn wishes into hard requirements.

5. **Upgrade the output format.** "Step-by-step" is weak. "For each issue: (1) Screenshot/location reference (2) The problem (3) Design principle violated (4) Specific fix" gives the AI a template to fill.

6. **Cut dead weight.** Remove anything that doesn't change the AI's behavior. "Rate your confidence (1-10)" on a subjective design critique adds noise, not signal — cut it unless it genuinely helps.

## Constraints on YOU

- The improved prompt should be 1x to 1.5x the original length — not 3x.
- Keep the user's tone and intent. Casual stays casual. Technical stays technical.
- Do NOT add JSON schemas, numbered phases, or evaluation frameworks.
- Do NOT add "Think step by step" unless the task involves multi-step reasoning.
- Every change must make the AI's output meaningfully different. Cosmetic rewording is not improvement.

Return ONLY valid JSON with no markdown wrapper:
{
  "improved": "<the full rewritten prompt>",
  "changes": ["<what you changed and why it produces better output>", "<change 2>", "<change 3>"]
}

The "changes" array must have exactly 3 entries. Each explains a specific change and why it leads to better AI output. No vague claims like "enhanced clarity" — say what the AI will do differently.`

// ─── Multi-strategy JSON extraction ──────────────────────────────────────────

function extractResult(raw: string): { improved: string; changes: string[] } | null {
  const candidates: string[] = [
    raw,
    // strip multiline code fences
    raw.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/gi, '$1').trim(),
  ]

  // Also extract the first {...} block found anywhere in the text
  const jsonBlock = raw.match(/\{[\s\S]*\}/)
  if (jsonBlock) candidates.push(jsonBlock[0])

  for (const s of candidates) {
    if (!s) continue
    try {
      const p = JSON.parse(s)
      // Accept direct shape or one level of nesting
      const node = typeof p.improved === 'string' ? p : (p.result ?? p.output ?? p.data ?? null)
      if (!node) continue
      if (typeof node.improved === 'string' && Array.isArray(node.changes)) {
        return { improved: node.improved, changes: (node.changes as string[]).slice(0, 3) }
      }
    } catch {
      // try next
    }
  }
  return null
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function improvePrompt(rawPrompt: string): Promise<{ improved: string; changes: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Use systemInstruction so the model treats it as a system prompt,
        // not as part of the user message
        systemInstruction: {
          parts: [{ text: IMPROVE_SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Here is the prompt to improve:\n\n${rawPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          thinkingConfig: {
            thinkingBudget: 1024,
          },
        }
      })
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Gemini API error')
  }

  const data = await response.json()

  // Same part-access pattern as the working compress.ts
  const parts: Array<{ text?: string; thought?: boolean }> =
    data.candidates?.[0]?.content?.parts ?? []

  // Skip thought parts (thinking trace), take first real output
  const outputText =
    parts.find(p => !p.thought && typeof p.text === 'string')?.text ??
    parts[0]?.text

  console.log('[improve] parts count:', parts.length)
  console.log('[improve] outputText snippet:', outputText?.slice(0, 400))

  if (!outputText) throw new Error('No response from Gemini')

  const result = extractResult(outputText)
  if (!result) {
    throw new Error(
      `Could not parse improvement response — model returned: ${outputText.slice(0, 300)}`
    )
  }
  return result
}
