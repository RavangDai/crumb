# CrumbCraft

Two tools for working smarter with AI — built together, used separately.

**Crumb** compresses AI conversations into portable context files you can carry into any new session.
**Craft** turns rough descriptions into polished, expert-level prompts.

---

## Tools

### Crumb — AI Memory Compression

Paste a conversation from ChatGPT, Claude, Gemini, or anywhere else. Crumb compresses it into a structured `.crumb` file with seven sections: Mission, Current State, Decisions Made, Dead Ends, Key Context, Open Questions, and Next Step.

Start a new AI session, paste the crumb file, and continue exactly where you left off — with full context, zero re-explaining.

**Features**
- Three compression depths: Snapshot, Memory, Full
- Rolling context — update an existing crumb with new conversation instead of starting over
- Confidence score showing how well the compression captured the original
- Context Vault — save and reload up to 50 crumbs locally
- Export vault as JSON for backup

### Craft — AI Prompt Builder

Describe what you want, even vaguely. Craft generates a structured, expert-level prompt with persona, constraints, output format, and chain-of-thought where appropriate. Also improves prompts you already have.

**Features**
- Generate from scratch — works well even from brief or vague descriptions
- Improve an existing prompt — sharpens specificity, adds missing context slots, upgrades output format
- Block-based prompt builder with drag-and-drop reordering
- Prompt DNA visualization — radar chart scoring role, task, context, constraints, format
- Built-in linter that flags weak patterns before you use the prompt
- History — last 50 generated prompts saved locally

---

## Bring Your Own API Key

By default both tools use a shared Gemini key (rate-limited). To bypass rate limits, open the API Key panel and add your own key for any supported provider.

| Provider  | Model                     |
|-----------|---------------------------|
| Gemini    | gemini-2.5-flash          |
| OpenAI    | gpt-4o-mini               |
| Anthropic | claude-haiku-4-5-20251001 |

Keys are stored in your browser's localStorage and forwarded through the server to reach the AI provider. They are never stored or logged server-side.

---

## Stack

- **Framework** — Next.js 16 (App Router)
- **UI** — Tailwind CSS v4, Framer Motion, Lucide React
- **Fonts** — Sora, DM Sans, JetBrains Mono (via `next/font`)
- **AI** — Gemini 2.5 Flash (default), OpenAI, Anthropic via a unified `callAI()` abstraction
- **Storage** — localStorage only, no database

---

## Running Locally

```bash
git clone https://github.com/RavangDai/crumb.git
cd crumb/crumb
npm install
```

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_key_here

# Optional: additional keys for load distribution
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  page.tsx              # Landing page
  crumb/
    page.tsx            # Crumb tool
    layout.tsx          # Page metadata
  craft/
    page.tsx            # Craft tool
    layout.tsx          # Page metadata
  api/
    compress/route.ts   # Compression endpoint
    generate/route.ts   # Prompt generation endpoint
    improve/route.ts    # Prompt improvement endpoint

lib/
  ai.ts                 # Unified provider abstraction (Gemini, OpenAI, Anthropic)
  apikey.ts             # Per-provider key storage helpers
  compress.ts           # Compression logic + prompts
  generate.ts           # Prompt generation logic
  improve.ts            # Prompt improvement logic
  ratelimit.ts          # In-memory sliding-window rate limiter
  vault.ts              # Vault CRUD (localStorage)
  prompt.ts             # Compression prompt templates

components/
  ApiKeyModal.tsx        # Multi-provider API key input
  VaultModal.tsx         # Saved crumbs browser
  ConversationInput.tsx
  BrainFileOutput.tsx
  CompressionVisualizer.tsx
```

---

## Environment Variables

| Variable           | Required | Description                                 |
|--------------------|----------|---------------------------------------------|
| `GEMINI_API_KEY`   | Yes      | Primary Gemini key used when no user key is set |
| `GEMINI_API_KEY_2` | No       | Additional key, randomly selected to distribute load |
| `GEMINI_API_KEY_3` | No       | Additional key, randomly selected to distribute load |

---

## License

MIT
