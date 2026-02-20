export const COMPRESSION_PROMPT = `You are an expert at extracting and compressing the essential meaning from AI conversations.

Analyze the conversation and create a structured "Crumb File" — a portable memory snapshot that allows any AI to instantly understand the full context and continue seamlessly.

Output a Markdown document with exactly these sections:

# 🍞 CRUMB FILE
*Compressed by Crumb — Leave a trail. Never lose context.*

## 🎯 MISSION
What is the core goal being worked on? One clear paragraph.

## 📍 CURRENT STATE
Where exactly did things end? What is done and what is in progress?

## ✅ DECISIONS MADE
Key decisions reached and brief reasoning behind each one.

## ❌ DEAD ENDS
What was tried and failed — so we never repeat it.

## 🧩 KEY CONTEXT
Important background, constraints, preferences, facts the AI needs to know.

## ❓ OPEN QUESTIONS
What is still unresolved or needs to be decided next.

## 🚀 NEXT STEP
The single most important thing to do next. Be specific.

---
*Original: ~[word count] words → Crumb: ~[crumb word count] words*

Rules:
- Be precise and information-dense
- Every word must carry maximum meaning  
- Use bullet points inside sections
- Write so any AI reading this can continue immediately with zero additional context`