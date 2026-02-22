export type CompressionDepth = 'snapshot' | 'memory' | 'full'

export const getCompressionPrompt = (depth: CompressionDepth = 'memory') => {
    let depthInstructions = ''
    if (depth === 'snapshot') {
        depthInstructions = 'EXTREME COMPRESSION REQUIRED (Snapshot Mode): Be brutally concise. Focus only on absolute bare-minimum essential facts. Aim for around ~500 tokens of output.'
    } else if (depth === 'memory') {
        depthInstructions = 'BALANCED COMPRESSION (Memory Mode): Capture key context, decisions, and current state efficiently. Aim for around ~1000 tokens of output.'
    } else if (depth === 'full') {
        depthInstructions = 'RICH COMPRESSION (Full Context Mode): Preserve nuances, code snippets, detailed constraints, and conversational flow. Aim for richly detailed information up to ~3000 tokens.'
    }

    return `You are an expert at extracting and compressing the essential meaning from AI conversations.

Analyze the conversation and create a structured "Crumb File" — a portable memory snapshot that allows any AI to instantly understand the full context and continue seamlessly.

${depthInstructions}

CRITICAL: In your output, you MUST tag important extracted points with the following tags where applicable (this will help visualize intelligence):
[Decision] - For key choices or architectural decisions made
[Goal] - For overarching objectives
[Code] - For technical implementations, variables, or functions
[Constraint] - For limitations, requirements, or dependencies

Output a Markdown document with exactly these sections:

# 🍞 CRUMB FILE
*Compressed by Crumb — Leave a trail. Never lose context.*

## 🎯 MISSION
What is the core goal being worked on? One clear paragraph. Use tags like [Goal] or [Constraint].

## 📍 CURRENT STATE
Where exactly did things end? What is done and what is in progress? Use tags like [Code].

## ✅ DECISIONS MADE
Key decisions reached and brief reasoning behind each one. Use [Decision] tags heavily here.

## ❌ DEAD ENDS
What was tried and failed — so we never repeat it.

## 🧩 KEY CONTEXT
Important background, constraints, preferences, facts the AI needs to know. Use [Constraint] tags.

## ❓ OPEN QUESTIONS
What is still unresolved or needs to be decided next.

## 🚀 NEXT STEP
The single most important thing to do next. Be specific.

---
*Original: ~[word count] words → Crumb: ~[crumb word count] words*

IMPORTANT — CONFIDENCE ASSESSMENT:
After the main crumb file content, you MUST append a JSON block wrapped in \`\`\`json fences with the following structure. Assess how well the compression captured the original conversation:
\`\`\`json
{
  "confidence": 94,
  "breakdown": {
    "goals_captured": 98,
    "decisions_preserved": 95,
    "technical_context": 90,
    "constraints_noted": 92
  },
  "sections_filled": 7,
  "key_topics_found": 5
}
\`\`\`
- "confidence" is overall 0-100 score of how well all critical context was preserved
- Each breakdown value is 0-100 for that specific category
- "sections_filled" is how many of the 7 sections had meaningful content
- "key_topics_found" is how many distinct topics/threads were identified

Rules:
- Be precise and information-dense
- Every word must carry maximum meaning  
- Use bullet points inside sections
- Write so any AI reading this can continue immediately with zero additional context`
}