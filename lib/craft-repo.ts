import { callAI, AIProvider } from './ai'

const REPO_PROMPT_SYSTEM = `You are an elite prompt engineer specializing in developer tools and AI coding assistants. You receive structured information about a GitHub repository and craft the most effective system prompt for an AI assistant working with that specific codebase.

Your generated prompt must make the AI:
1. Instantly aware of the tech stack, architecture patterns, and conventions
2. Behave as a seasoned contributor who has deep familiarity with this repo
3. Respond in the right language, style, and patterns for this project
4. Follow conventions visible from the repo structure and README

Include these elements naturally (do not label them with headers):
- A sharply defined expert persona scoped to this exact stack
- Project-specific context grounding the AI in what this repo does
- Behavioral constraints derived from the repo's style and conventions
- Output format guidance matching the project's norms (e.g. TypeScript types, test style, PR conventions)

Do NOT use markdown code fences inside the prompt. Do NOT use generic phrases like "I am an AI assistant". Be specific to this repository.

Return ONLY valid JSON with no markdown wrapper:
{
  "prompt": "<the full crafted system prompt, ready to paste>",
  "approach": [
    "<specific inference you made from the repo and why it improves the prompt>",
    "<specific technique you applied and why>",
    "<specific constraint or convention you encoded and why>"
  ],
  "repoSummary": "<one sentence: what this repo does and its main tech>"
}`

function getBuiltInGeminiKey(): string | undefined {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[]
  if (keys.length === 0) return undefined
  return keys[Math.floor(Math.random() * keys.length)]
}

function extractResult(raw: string): { prompt: string; approach: string[]; repoSummary: string } | null {
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
      if (typeof p.prompt === 'string' && Array.isArray(p.approach)) {
        return {
          prompt: p.prompt,
          approach: (p.approach as string[]).slice(0, 3),
          repoSummary: typeof p.repoSummary === 'string' ? p.repoSummary : '',
        }
      }
    } catch {
      // try next
    }
  }
  return null
}

export interface RepoMeta {
  name: string
  owner: string
  fullName: string
  description: string
  language: string
  stars: number
  topics: string[]
  fileCount: number
}

export interface RepoPromptResult {
  prompt: string
  approach: string[]
  repoSummary: string
  repoMeta: RepoMeta
}

export async function analyzeRepo(
  repoUrl: string,
  userApiKey?: string,
  provider: AIProvider = 'gemini'
): Promise<RepoPromptResult> {
  // Parse GitHub URL
  const match = repoUrl.trim().match(/github\.com\/([^/\s]+)\/([^/?\s#]+)/)
  if (!match) throw new Error('Please enter a valid GitHub repository URL (e.g. github.com/owner/repo).')
  const [, owner, repoRaw] = match
  const repo = repoRaw.replace(/\.git$/, '')

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CrumbCraft/1.0',
  }

  // Fetch repo info, README, and file tree in parallel
  const [repoRes, readmeRes, treeRes] = await Promise.allSettled([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers }),
  ])

  // Repo metadata
  const repoData: Record<string, unknown> =
    repoRes.status === 'fulfilled' && repoRes.value.ok
      ? await repoRes.value.json()
      : {}

  if (!repoData.name) {
    throw new Error('Repository not found or is private. Only public repositories are supported.')
  }

  // README (first 2500 chars)
  let readme = ''
  if (readmeRes.status === 'fulfilled' && readmeRes.value.ok) {
    const readmeData: { content?: string } = await readmeRes.value.json()
    if (readmeData.content) {
      try {
        readme = atob(readmeData.content.replace(/\n/g, '')).slice(0, 2500)
      } catch {
        readme = ''
      }
    }
  }

  // File tree (top 50 meaningful files)
  let files: string[] = []
  let fileCount = 0
  if (treeRes.status === 'fulfilled' && treeRes.value.ok) {
    const treeData: { tree?: { type: string; path: string }[] } = await treeRes.value.json()
    const allFiles = (treeData.tree || []).filter(f => f.type === 'blob').map(f => f.path)
    fileCount = allFiles.length
    // Prioritize key files (configs, entry points, package files)
    const keyPaths = allFiles.filter(f =>
      /^(package\.json|tsconfig|\.env\.example|Makefile|Dockerfile|docker-compose|pyproject\.toml|go\.mod|Cargo\.toml|requirements\.txt|next\.config|vite\.config|webpack\.config|jest\.config|\.eslintrc|prisma\/schema)/.test(f)
    )
    const srcFiles = allFiles.filter(f => /^(src|app|lib|components|pages|api|server|cmd)\//i.test(f)).slice(0, 30)
    const rest = allFiles.filter(f => !keyPaths.includes(f) && !srcFiles.includes(f)).slice(0, 10)
    files = [...new Set([...keyPaths, ...srcFiles, ...rest])].slice(0, 50)
  }

  const repoMeta: RepoMeta = {
    name: repo,
    owner,
    fullName: `${owner}/${repo}`,
    description: (repoData.description as string) || '',
    language: (repoData.language as string) || 'unknown',
    stars: (repoData.stargazers_count as number) || 0,
    topics: (repoData.topics as string[]) || [],
    fileCount,
  }

  const context = [
    `Repository: ${owner}/${repo}`,
    `Primary Language: ${repoMeta.language}`,
    `Stars: ${repoMeta.stars}`,
    repoMeta.description ? `Description: ${repoMeta.description}` : null,
    repoMeta.topics.length ? `Topics: ${repoMeta.topics.join(', ')}` : null,
    '',
    'Key files and structure:',
    files.map(f => `  ${f}`).join('\n'),
    readme ? `\nREADME (excerpt):\n${readme}` : '',
  ].filter(l => l !== null).join('\n').trim()

  const apiKey = userApiKey || getBuiltInGeminiKey()
  if (!apiKey) throw new Error('No API key available. Add your API key in Settings.')

  const outputText = await callAI(
    {
      systemPrompt: REPO_PROMPT_SYSTEM,
      userMessage: `Generate a system prompt for an AI coding assistant working with this repository:\n\n${context}`,
      temperature: 0.5,
      maxTokens: 3000,
    },
    apiKey,
    provider
  )

  const result = extractResult(outputText)
  if (!result) {
    throw new Error(`Could not parse AI response: ${outputText.slice(0, 200)}`)
  }

  return { ...result, repoMeta }
}
