'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { TransitionLink } from '@/context/transition'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { getVault } from '@/lib/vault'
import {
  UserCircle2, Crosshair, BookOpen, Zap, ArrowLeftRight, ShieldOff, LayoutTemplate,
  Code2, PenLine, Palette, BarChart2, Search, Package, Megaphone, GraduationCap,
  OctagonX, AlertTriangle, Lightbulb, Wand2, PenSquare, Clock, ArrowRight, Sparkles, Wrench,
  type LucideIcon,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockType = 'persona' | 'objective' | 'context' | 'technique' | 'example' | 'constraint' | 'format'
type TechniqueId = 'chain-of-thought' | 'self-check' | 'adversarial' | 'confidence' | 'contrastive'
type Severity = 'error' | 'warning' | 'tip'

interface Block {
  id: string
  type: BlockType
  content: string
  techniqueId?: TechniqueId
  exampleInput?: string
  exampleOutput?: string
}

interface LinterWarning {
  id: string
  severity: Severity
  message: string
}

interface DNAScore {
  clarity: number
  specificity: number
  structure: number
  context: number
  guardrails: number
}

interface PromptEntry {
  id: string
  assembled: string
  blocks: Block[]
  category: string
  createdAt: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HISTORY_KEY = 'craft_history'

const CATEGORY_COLOR: Record<string, string> = {
  'code-dev':      '#2D9E6B',
  'writing-copy':  '#7A8DC4',
  'design-ui':     '#8DB89A',
  'data-analysis': '#C4A45A',
  'research':      '#5DFFA8',
  'product':       '#A8D4BA',
  'marketing':     '#C47A5A',
  'learning':      '#5DFFA8',
  'custom':        '#2D9E6B',
}

function formatRelativeDate(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 172_800_000) return 'yesterday'
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const BLOCK_META: Record<BlockType, { label: string; color: string; bg: string; placeholder: string; Icon: LucideIcon }> = {
  persona:    { label: 'PERSONA',    color: '#2D9E6B', bg: 'rgba(45,158,107,0.07)',  placeholder: 'senior [LANGUAGE] developer with 10+ years of experience', Icon: UserCircle2 },
  objective:  { label: 'OBJECTIVE',  color: '#5DFFA8', bg: 'rgba(93,255,168,0.04)',  placeholder: 'Review this code for bugs, performance issues, and best practices', Icon: Crosshair },
  context:    { label: 'CONTEXT',    color: '#8DB89A', bg: 'rgba(141,184,154,0.04)', placeholder: 'Relevant background, code snippets, or details...', Icon: BookOpen },
  technique:  { label: 'TECHNIQUE',  color: '#A8D4BA', bg: 'rgba(168,212,186,0.04)', placeholder: '', Icon: Zap },
  example:    { label: 'EXAMPLE',    color: '#C4A45A', bg: 'rgba(196,164,90,0.04)',  placeholder: '', Icon: ArrowLeftRight },
  constraint: { label: 'CONSTRAINT', color: '#C47A5A', bg: 'rgba(196,122,90,0.05)',  placeholder: 'Critical issues first. No praise. Max 3 bullet points.', Icon: ShieldOff },
  format:     { label: 'FORMAT',     color: '#7A8DC4', bg: 'rgba(122,141,196,0.05)', placeholder: 'Describe output structure...', Icon: LayoutTemplate },
}

const TECHNIQUES: Record<TechniqueId, { label: string; description: string; content: string }> = {
  'chain-of-thought': {
    label: 'Chain of Thought',
    description: 'Forces step-by-step reasoning',
    content: 'Think step by step before giving your final answer.',
  },
  'self-check': {
    label: 'Self-Check',
    description: 'AI reviews its own answer',
    content: 'Before responding, review your answer for errors, gaps, and inconsistencies.',
  },
  'adversarial': {
    label: 'Adversarial',
    description: 'AI challenges its own output',
    content: 'After your response, identify the top 3 potential flaws or edge cases in your answer.',
  },
  'confidence': {
    label: 'Confidence Rating',
    description: 'AI rates certainty per claim',
    content: 'Rate your confidence (1–10) on each key claim or recommendation you make.',
  },
  'contrastive': {
    label: 'Contrastive',
    description: 'Compare multiple approaches',
    content: 'Consider at least two distinct approaches before recommending one. Explain the tradeoffs.',
  },
}

const FORMAT_CHIPS = ['Bullet List', 'JSON', 'Step-by-step', 'Essay', 'Table', 'Code Block', 'Markdown']

const CATEGORIES = [
  { id: 'code-dev',      label: 'Code & Dev',    Icon: Code2 },
  { id: 'writing-copy',  label: 'Writing',        Icon: PenLine },
  { id: 'design-ui',     label: 'Design & UI',    Icon: Palette },
  { id: 'data-analysis', label: 'Data Analysis',  Icon: BarChart2 },
  { id: 'research',      label: 'Research',       Icon: Search },
  { id: 'product',       label: 'Product',        Icon: Package },
  { id: 'marketing',     label: 'Marketing',      Icon: Megaphone },
  { id: 'learning',      label: 'Learning',       Icon: GraduationCap },
]

const BLOCK_TEMPLATES: Record<string, Omit<Block, 'id'>[]> = {
  'code-dev': [
    { type: 'persona',    content: 'senior [LANGUAGE] developer with 10+ years of experience' },
    { type: 'objective',  content: 'Review this code for bugs, performance issues, and best practices' },
    { type: 'context',    content: '' },
    { type: 'technique',  content: '', techniqueId: 'chain-of-thought' },
    { type: 'format',     content: 'Bullet List' },
    { type: 'constraint', content: 'Focus on critical issues only. No praise. Reference specific line numbers.' },
  ],
  'writing-copy': [
    { type: 'persona',    content: 'expert copywriter specializing in conversion-focused content' },
    { type: 'objective',  content: 'Write persuasive copy that drives action and resonates emotionally' },
    { type: 'context',    content: '' },
    { type: 'format',     content: 'Essay' },
    { type: 'constraint', content: 'No jargon. Max 200 words. End with one clear call-to-action.' },
  ],
  'design-ui': [
    { type: 'persona',    content: 'senior UX designer specializing in minimal, functional interfaces' },
    { type: 'objective',  content: 'Critique this design and suggest specific, actionable improvements' },
    { type: 'technique',  content: '', techniqueId: 'adversarial' },
    { type: 'format',     content: 'Step-by-step' },
    { type: 'constraint', content: 'Reference design principles. Be concrete, not vague.' },
  ],
  'data-analysis': [
    { type: 'persona',    content: 'data scientist with expertise in statistical analysis and visualization' },
    { type: 'objective',  content: 'Analyze this dataset and extract meaningful, actionable insights' },
    { type: 'technique',  content: '', techniqueId: 'confidence' },
    { type: 'format',     content: 'Step-by-step' },
    { type: 'constraint', content: 'Highlight anomalies. Flag uncertainty. Suggest next steps.' },
  ],
  'research': [
    { type: 'persona',    content: 'research analyst who synthesizes complex information clearly' },
    { type: 'objective',  content: 'Research and summarize the key findings on this topic' },
    { type: 'technique',  content: '', techniqueId: 'contrastive' },
    { type: 'format',     content: 'Bullet List' },
    { type: 'constraint', content: 'Cite reasoning. Flag uncertainty. No opinions without basis.' },
  ],
  'product': [
    { type: 'persona',    content: 'product manager with 8+ years at B2B SaaS companies' },
    { type: 'objective',  content: 'Help me think through this product decision systematically' },
    { type: 'technique',  content: '', techniqueId: 'contrastive' },
    { type: 'format',     content: 'Step-by-step' },
    { type: 'constraint', content: 'Consider user impact, technical feasibility, and business value.' },
  ],
  'marketing': [
    { type: 'persona',    content: 'growth marketer specializing in B2B content and demand generation' },
    { type: 'objective',  content: 'Create a marketing strategy for this product or campaign' },
    { type: 'format',     content: 'Bullet List' },
    { type: 'constraint', content: 'Focus on measurable outcomes. Include 3+ channel recommendations.' },
  ],
  'learning': [
    { type: 'persona',    content: 'expert teacher who explains complex topics with clarity and analogies' },
    { type: 'objective',  content: 'Teach me this concept from first principles' },
    { type: 'example',    content: '', exampleInput: 'Simple concept', exampleOutput: 'What a clear explanation looks like' },
    { type: 'technique',  content: '', techniqueId: 'self-check' },
    { type: 'constraint', content: 'Use analogies. Build progressively. Check understanding at each step.' },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function createBlock(type: BlockType): Block {
  return {
    id: uid(),
    type,
    content: '',
    ...(type === 'technique' ? { techniqueId: 'chain-of-thought' as TechniqueId } : {}),
  }
}

function assembleFromBlocks(blocks: Block[]): string {
  const parts: string[] = []
  for (const b of blocks) {
    if (b.type === 'persona' && b.content.trim())
      parts.push(`You are a ${b.content.trim()}.`)
    else if (b.type === 'objective' && b.content.trim())
      parts.push(`\n${b.content.trim()}`)
    else if (b.type === 'context' && b.content.trim())
      parts.push(`\nContext:\n${b.content.trim()}`)
    else if (b.type === 'technique' && b.techniqueId)
      parts.push(`\n${TECHNIQUES[b.techniqueId].content}`)
    else if (b.type === 'example' && (b.exampleInput || b.exampleOutput))
      parts.push(['\nExample:', b.exampleInput && `Input: ${b.exampleInput}`, b.exampleOutput && `Output: ${b.exampleOutput}`].filter(Boolean).join('\n'))
    else if (b.type === 'constraint' && b.content.trim())
      parts.push(`\nConstraints: ${b.content.trim()}`)
    else if (b.type === 'format' && b.content.trim())
      parts.push(`\nFormat your response as: ${b.content.trim()}`)
  }
  return parts.join('\n').trim()
}

const VAGUE = ['better', 'worse', 'nice', 'good job', 'fix it', 'make it', 'help me', 'a bit', 'somehow', 'etc', 'things', 'improve it']

function runLinter(blocks: Block[]): LinterWarning[] {
  const w: LinterWarning[] = []
  const has = (t: BlockType) => blocks.some(b => b.type === t && (b.content.trim() || b.techniqueId || b.exampleInput))
  const allText = blocks.map(b => [b.content, b.exampleInput, b.exampleOutput].filter(Boolean).join(' ')).join(' ')

  if (!has('objective'))  w.push({ id: 'no-obj',     severity: 'error',   message: 'No objective — what do you actually want?' })
  if (!has('persona'))    w.push({ id: 'no-persona', severity: 'warning', message: 'No persona — AI defaults to generic assistant mode' })
  if (!has('format'))     w.push({ id: 'no-format',  severity: 'tip',     message: 'No output format — AI will choose arbitrarily' })

  const personaBlock = blocks.find(b => b.type === 'persona')
  if (personaBlock?.content && ['assistant', 'helper', 'an AI', 'chatbot'].some(v => personaBlock.content.toLowerCase().includes(v)))
    w.push({ id: 'weak-persona', severity: 'warning', message: 'Weak persona — avoid "assistant/AI", use a specific expert role' })

  const found = new Set<string>()
  VAGUE.forEach(word => {
    if (allText.toLowerCase().includes(word) && !found.has(word)) {
      found.add(word)
      w.push({ id: `vague-${word}`, severity: 'warning', message: `"${word}" is vague — be specific about exactly what you want` })
    }
  })

  const low = allText.toLowerCase()
  if ((low.includes('concise') || low.includes('brief')) && (low.includes('explain everything') || low.includes('comprehensive') || low.includes('in detail')))
    w.push({ id: 'contradiction', severity: 'warning', message: 'Contradiction: "concise/brief" conflicts with "detailed/comprehensive"' })

  return w
}

function scoreDNA(blocks: Block[]): DNAScore {
  const allText = blocks.map(b => [b.content, b.exampleInput, b.exampleOutput].filter(Boolean).join(' ')).join(' ')
  const vagueCount = VAGUE.filter(w => allText.toLowerCase().includes(w)).length
  const clarity = Math.max(10, Math.min(100, 100 - vagueCount * 18))
  const specifics = (allText.match(/\d+|TypeScript|Python|React|Next\.js|SQL|API|JSON|REST|GraphQL|CSS|HTML|Node\.js|[A-Z][a-z]+ [A-Z][a-z]+/g) || []).length
  const specificity = Math.min(100, 15 + specifics * 10 + (allText.length > 100 ? 20 : 0))
  const structure = blocks.some(b => b.type === 'format' && b.content) ? 92
    : blocks.some(b => ['bullet', 'json', 'step', 'table', 'essay', 'markdown', 'code'].some(k => (b.content + (b.exampleOutput || '')).toLowerCase().includes(k))) ? 58
    : 12
  const ctx = blocks.find(b => b.type === 'context')
  const context = ctx?.content ? Math.min(100, 18 + Math.round(ctx.content.length / 4)) : 10
  const cn = blocks.find(b => b.type === 'constraint')
  const guardrails = cn?.content ? Math.min(100, 38 + Math.round(cn.content.length / 3)) : 10
  return { clarity, specificity, structure, context, guardrails }
}

function getHistory(): PromptEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function saveHistory(blocks: Block[], assembled: string, category: string): PromptEntry {
  const history = getHistory()
  const entry: PromptEntry = { id: uid(), assembled, blocks, category, createdAt: Date.now() }
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, 50)))
  return entry
}

function removeFromHistory(id: string): PromptEntry[] {
  const updated = getHistory().filter(e => e.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  return updated
}

// ─── Pentagon DNA ─────────────────────────────────────────────────────────────

function PentagonDNA({ score }: { score: DNAScore }) {
  const [showBars, setShowBars] = useState(false)
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const displayScoreRef = useRef(0)

  const axes = [
    { label: 'Clarity',    value: score.clarity },
    { label: 'Specific',   value: score.specificity },
    { label: 'Structure',  value: score.structure },
    { label: 'Context',    value: score.context },
    { label: 'Guardrails', value: score.guardrails },
  ]

  const overall = Math.round(axes.reduce((s, a) => s + a.value, 0) / axes.length)

  // Animate score count-up whenever overall changes
  useEffect(() => {
    const target = overall
    const start = displayScoreRef.current
    if (start === target) return
    const duration = 700
    const startTime = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(start + (target - start) * eased)
      displayScoreRef.current = current
      setDisplayScore(current)
      if (t < 1) { raf = requestAnimationFrame(tick) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [overall])

  // Expanded geometry: cx/cy shifted inward, viewBox padded for label room
  const cx = 140, cy = 148, R = 88
  const pt = (i: number, r: number) => ({
    x: cx + r * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
    y: cy + r * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
  })
  const rings = [0.25, 0.5, 0.75, 1]
  const outer = axes.map((_, i) => pt(i, R))
  const data  = axes.map((ax, i) => pt(i, (ax.value / 100) * R))
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'

  const ringR = 36
  const ringCirc = 2 * Math.PI * ringR
  const ringColor = overall > 65 ? '#5DFFA8' : overall > 35 ? '#2D9E6B' : '#C47A5A'

  return (
    <div className="flex flex-col items-center gap-4 w-full"
      onMouseEnter={() => setShowBars(true)}
      onMouseLeave={() => { setShowBars(false); setHoveredAxis(null) }}>

      {/* SVG: viewBox expanded to prevent label clipping */}
      <svg width="100%" height="auto" viewBox="0 0 280 296" style={{ maxWidth: '280px' }}>
        {rings.map(r => (
          <path key={r} d={toPath(axes.map((_, i) => pt(i, R * r)))}
            fill="none" stroke="rgba(45,158,107,0.1)" strokeWidth="1" />
        ))}
        {outer.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
            stroke="rgba(45,158,107,0.08)" strokeWidth="1" />
        ))}
        <path d={toPath(outer)} fill="none" stroke="rgba(45,158,107,0.2)" strokeWidth="1" />
        <motion.path
          d={toPath(data)}
          fill="rgba(45,158,107,0.1)"
          stroke="#2D9E6B" strokeWidth="2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
        {data.map((p, i) => (
          <motion.circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4.5"
            fill={axes[i].value > 65 ? '#5DFFA8' : axes[i].value > 35 ? '#2D9E6B' : '#C47A5A'}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 300 }}
          />
        ))}

        {/* Axis labels with invisible hover rectangles for tooltip */}
        {outer.map((p, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
          const lx = cx + (R + 28) * Math.cos(angle)
          const ly = cy + (R + 28) * Math.sin(angle)
          const isHovered = hoveredAxis === i
          const isHighVal = axes[i].value > 65
          return (
            <g key={i}
              onMouseEnter={() => setHoveredAxis(i)}
              onMouseLeave={() => setHoveredAxis(null)}
              style={{ cursor: 'help' }}>
              <text
                x={lx.toFixed(1)} y={ly.toFixed(1)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="11"
                fill={isHighVal ? 'rgba(93,255,168,0.9)' : isHovered ? 'rgba(212,237,224,0.9)' : 'rgba(141,184,154,0.7)'}
                fontFamily="var(--font-jetbrains-mono)"
                style={{ transition: 'fill 0.15s' }}>
                {axes[i].label}
              </text>
              {/* Invisible hit area */}
              <rect x={lx - 36} y={ly - 12} width="72" height="24" fill="transparent" />
            </g>
          )
        })}

        {/* Score ring track */}
        <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="rgba(45,158,107,0.12)" strokeWidth="3" />
        {/* Score ring progress */}
        <motion.circle
          cx={cx} cy={cy} r={ringR}
          fill="none"
          stroke={ringColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={ringCirc}
          initial={{ strokeDashoffset: ringCirc }}
          animate={{ strokeDashoffset: (1 - overall / 100) * ringCirc }}
          transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="700"
          fill="#D4EDE0" fontFamily="var(--font-sora)">{displayScore}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9"
          fill="rgba(141,184,154,0.5)" fontFamily="var(--font-jetbrains-mono)" letterSpacing="0.15em">SCORE</text>
      </svg>

      {/* Axis tooltip */}
      <AnimatePresence>
        {hoveredAxis !== null && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="w-full px-3 py-2 text-center"
            style={{
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: '10px',
              color: 'rgba(141,184,154,0.75)',
              background: 'rgba(13,21,13,0.7)',
              border: '1px solid rgba(45,158,107,0.12)',
              borderRadius: '2px',
            }}>
            <span style={{ color: 'rgba(212,237,224,0.9)', fontWeight: 600 }}>{axes[hoveredAxis].label}: </span>
            {AXIS_TOOLTIPS[hoveredAxis]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-axis breakdown — visible on hover */}
      <AnimatePresence>
        {showBars && (
          <motion.div
            className="w-full flex flex-col gap-2.5 px-1 overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}>
            {axes.map(ax => (
              <div key={ax.label} className="flex items-center gap-3">
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(141,184,154,0.75)', width: '68px', flexShrink: 0 }}>
                  {ax.label}
                </span>
                <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(45,158,107,0.1)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: ax.value > 65 ? '#5DFFA8' : ax.value > 35 ? '#2D9E6B' : '#C47A5A' }}
                    initial={{ width: 0 }} animate={{ width: `${ax.value}%` }}
                    transition={{ duration: 0.5 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(141,184,154,0.6)', width: '28px', textAlign: 'right', flexShrink: 0 }}>
                  {ax.value}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Add Block Menu ───────────────────────────────────────────────────────────

const BLOCK_MENU: { type: BlockType; desc: string }[] = [
  { type: 'persona',    desc: 'Define the AI role' },
  { type: 'objective',  desc: 'What you want' },
  { type: 'context',    desc: 'Background info' },
  { type: 'technique',  desc: 'Reasoning pattern' },
  { type: 'example',    desc: 'Few-shot pair' },
  { type: 'constraint', desc: 'Rules & limits' },
  { type: 'format',     desc: 'Output structure' },
]

function AddBlockMenu({ onAdd, onClose, usedTypes }: { onAdd: (t: BlockType) => void; onClose: () => void; usedTypes: BlockType[] }) {
  const available = BLOCK_MENU.filter(item => !usedTypes.includes(item.type))
  if (available.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="absolute bottom-full mb-2 left-0 z-50 w-56 overflow-hidden"
      style={{ background: 'rgba(10,18,10,0.98)', border: '1px solid rgba(45,158,107,0.22)', borderRadius: '3px', backdropFilter: 'blur(20px)' }}
    >
      {available.map(item => {
        const BIcon = BLOCK_META[item.type].Icon
        return (
        <button
          key={item.type}
          onClick={() => { onAdd(item.type); onClose() }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.025]"
          style={{ borderBottom: '1px solid rgba(45,158,107,0.06)' }}
        >
          <span style={{ color: BLOCK_META[item.type].color, width: '16px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <BIcon size={13} strokeWidth={1.5} />
          </span>
          <div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: BLOCK_META[item.type].color, letterSpacing: '0.06em' }}>
              {BLOCK_META[item.type].label}
            </div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(141,184,154,0.6)' }}>
              {item.desc}
            </div>
          </div>
        </button>
        )
      })}
    </motion.div>
  )
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({ block, onChange, onDelete }: {
  block: Block
  onChange: (b: Block) => void
  onDelete: () => void
}) {
  const meta = BLOCK_META[block.type]
  const BlockIcon = meta.Icon
  const controls = useDragControls()

  return (
    <Reorder.Item value={block} dragListener={false} dragControls={controls} className="select-none">
      <motion.div
        layout
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96, y: -4 }}
        whileDrag={{ scale: 1.025, boxShadow: `0 20px 48px rgba(0,0,0,0.55), 0 0 0 1px ${meta.color}35` }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className="group relative mb-2.5"
        style={{ background: meta.bg, border: `1px solid ${meta.color}1e`, borderLeft: `3px solid ${meta.color}`, borderRadius: '4px' }}
        whileHover={{ boxShadow: `0 2px 20px rgba(0,0,0,0.3), 0 0 0 1px ${meta.color}28` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: `1px solid ${meta.color}18` }}>
          {/* Colored type badge */}
          <span style={{
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px',
            color: meta.color, letterSpacing: '0.07em',
            background: `${meta.color}14`,
            border: `1px solid ${meta.color}28`,
            padding: '2px 8px 2px 6px', borderRadius: '3px',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
          }}>
            <BlockIcon size={11} strokeWidth={1.5} />
            {meta.label}
          </span>
          <div className="flex items-center gap-2.5">
            {/* Drag handle — always visible, prominent on hover */}
            <div
              onPointerDown={e => controls.start(e)}
              className="cursor-grab active:cursor-grabbing touch-none transition-opacity"
              style={{ color: meta.color, opacity: 0.5 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              title="Drag to reorder">
              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                <circle cx="2.5" cy="2.5" r="1.3"/>
                <circle cx="7.5" cy="2.5" r="1.3"/>
                <circle cx="2.5" cy="7" r="1.3"/>
                <circle cx="7.5" cy="7" r="1.3"/>
                <circle cx="2.5" cy="11.5" r="1.3"/>
                <circle cx="7.5" cy="11.5" r="1.3"/>
              </svg>
            </div>
            <button onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-60"
              style={{ color: 'rgba(196,122,90,0.8)', fontSize: '13px', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {block.type === 'technique' ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(TECHNIQUES) as [TechniqueId, typeof TECHNIQUES[TechniqueId]][]).map(([id, tech]) => (
                  <button key={id} onClick={() => onChange({ ...block, techniqueId: id })}
                    className="text-[11px] px-2.5 py-1"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      transition: 'background 100ms ease, color 100ms ease, border-color 100ms ease',
                      ...(block.techniqueId === id
                        ? { color: '#080D08', background: '#A8D4BA', border: '1px solid #A8D4BA' }
                        : { color: 'rgba(168,212,186,0.8)', background: 'rgba(168,212,186,0.05)', border: '1px solid rgba(168,212,186,0.22)' }
                      ),
                    }}
                    onMouseEnter={e => { if (block.techniqueId !== id) { e.currentTarget.style.background = 'rgba(168,212,186,0.12)'; e.currentTarget.style.borderColor = 'rgba(168,212,186,0.38)'; e.currentTarget.style.color = 'rgba(168,212,186,1)' } }}
                    onMouseLeave={e => { if (block.techniqueId !== id) { e.currentTarget.style.background = 'rgba(168,212,186,0.05)'; e.currentTarget.style.borderColor = 'rgba(168,212,186,0.22)'; e.currentTarget.style.color = 'rgba(168,212,186,0.8)' } }}
                  >
                    {tech.label}
                  </button>
                ))}
              </div>
              {block.techniqueId && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <p style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12px', color: 'rgba(168,212,186,0.85)', lineHeight: '1.6' }}>
                    → {TECHNIQUES[block.techniqueId].content}
                  </p>
                  <p style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(168,212,186,0.55)' }}>
                    {TECHNIQUES[block.techniqueId].description}
                  </p>
                </div>
              )}
            </div>
          ) : block.type === 'example' ? (
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[11px] mb-1.5" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(196,164,90,0.75)', letterSpacing: '0.07em' }}>INPUT</div>
                <textarea className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none"
                  style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
                  rows={2} placeholder="Example input..."
                  value={block.exampleInput || ''}
                  onChange={e => onChange({ ...block, exampleInput: e.target.value })} />
              </div>
              <div className="h-px" style={{ background: 'rgba(196,164,90,0.08)' }} />
              <div>
                <div className="text-[11px] mb-1.5" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(196,164,90,0.75)', letterSpacing: '0.07em' }}>EXPECTED OUTPUT</div>
                <textarea className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none"
                  style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
                  rows={2} placeholder="What the ideal response looks like..."
                  value={block.exampleOutput || ''}
                  onChange={e => onChange({ ...block, exampleOutput: e.target.value })} />
              </div>
            </div>
          ) : block.type === 'format' ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                {FORMAT_CHIPS.map(fmt => (
                  <button key={fmt} onClick={() => onChange({ ...block, content: fmt })}
                    className="text-[11px] px-2.5 py-1"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      transition: 'background 100ms ease, color 100ms ease, border-color 100ms ease',
                      ...(block.content === fmt
                        ? { color: '#080D08', background: '#7A8DC4', border: '1px solid #7A8DC4' }
                        : { color: 'rgba(122,141,196,0.82)', background: 'rgba(122,141,196,0.06)', border: '1px solid rgba(122,141,196,0.22)' }
                      ),
                    }}
                    onMouseEnter={e => { if (block.content !== fmt) { e.currentTarget.style.background = 'rgba(122,141,196,0.13)'; e.currentTarget.style.borderColor = 'rgba(122,141,196,0.38)'; e.currentTarget.style.color = 'rgba(122,141,196,1)' } }}
                    onMouseLeave={e => { if (block.content !== fmt) { e.currentTarget.style.background = 'rgba(122,141,196,0.06)'; e.currentTarget.style.borderColor = 'rgba(122,141,196,0.22)'; e.currentTarget.style.color = 'rgba(122,141,196,0.82)' } }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <div className="h-px" style={{ background: 'rgba(122,141,196,0.1)' }} />
              <input className="w-full bg-transparent text-sm focus:outline-none"
                style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
                placeholder="Or describe a custom format..."
                value={block.content} onChange={e => onChange({ ...block, content: e.target.value })} />
            </div>
          ) : (
            <textarea
              className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none"
              style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
              rows={block.type === 'context' ? 4 : 2}
              placeholder={meta.placeholder}
              value={block.content}
              onChange={e => onChange({ ...block, content: e.target.value })}
            />
          )}
        </div>
      </motion.div>
    </Reorder.Item>
  )
}

const IMPROVE_STAGES = ['Reading prompt…', 'Analysing structure…', 'Engineering…', 'Refining…']

const AXIS_TOOLTIPS = [
  'How free of vague or ambiguous language your prompt is',
  'How precise and concrete your instructions and targets are',
  'Whether the desired output format is clearly defined',
  'How much relevant background context is provided',
  'Whether rules, limits, and constraints are explicitly set',
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CraftPage() {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: uid(), type: 'persona',   content: '' },
    { id: uid(), type: 'objective', content: '' },
  ])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu]       = useState(false)
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [history, setHistory]               = useState<PromptEntry[]>([])
  const [copied, setCopied]                 = useState(false)
  const [copiedImproved, setCopiedImproved] = useState(false)

  // Mode toggle
  const [craftMode, setCraftMode] = useState<'manual' | 'ai'>('manual')

  // AI Generate mode
  const [aiInput, setAiInput]             = useState('')
  const [aiLoading, setAiLoading]         = useState(false)
  const [aiStage, setAiStage]             = useState(0)
  const [aiResult, setAiResult]           = useState('')
  const [aiApproach, setAiApproach]       = useState<string[]>([])
  const [aiError, setAiError]             = useState('')
  const [aiCopied, setAiCopied]           = useState(false)

  // AI Improve
  const [isImproving, setIsImproving]         = useState(false)
  const [improvedPrompt, setImprovedPrompt]   = useState('')
  const [improveChanges, setImproveChanges]   = useState<string[]>([])
  const [improveError, setImproveError]       = useState('')
  const [improveStage, setImproveStage]       = useState(0)
  const [expandedChanges, setExpandedChanges] = useState<number[]>([])

  const [hoveredHistoryId, setHoveredHistoryId] = useState<string | null>(null)

  const builderRef  = useRef<HTMLDivElement>(null)
  const addMenuRef  = useRef<HTMLDivElement>(null)

  useEffect(() => { setHistory(getHistory()) }, [])
  const [vaultHasEntries, setVaultHasEntries] = useState(false)
  useEffect(() => { setVaultHasEntries(getVault().length > 0) }, [])

  // close history modal on Escape
  useEffect(() => {
    if (!sidebarOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sidebarOpen])

  // close add-menu on outside click
  useEffect(() => {
    if (!showAddMenu) return
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAddMenu])

  const assembled  = useMemo(() => assembleFromBlocks(blocks), [blocks])

  // Clear AI improvement whenever the prompt changes
  useEffect(() => {
    setImprovedPrompt('')
    setImproveChanges([])
    setImproveError('')
  }, [assembled])
  const warnings   = useMemo(() => runLinter(blocks), [blocks])
  const dna        = useMemo(() => scoreDNA(blocks), [blocks])
  const hasContent = assembled.trim().length > 0
  const tokenCount = Math.round(assembled.length / 4)

  const updateBlock = useCallback((id: string, updated: Block) =>
    setBlocks(prev => prev.map(b => b.id === id ? updated : b)), [])

  const deleteBlock = useCallback((id: string) =>
    setBlocks(prev => prev.filter(b => b.id !== id)), [])

  const addBlock = useCallback((type: BlockType) => {
    setBlocks(prev => [...prev, createBlock(type)])
    setTimeout(() => addMenuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
  }, [])

  const loadTemplate = (categoryId: string) => {
    const tmpl = BLOCK_TEMPLATES[categoryId]
    if (!tmpl) return
    setActiveCategory(categoryId)
    setBlocks(tmpl.map(b => ({ ...b, id: uid() })))
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
  }

  const handleCopy = () => {
    if (!assembled) return
    navigator.clipboard.writeText(assembled)
    const entry = saveHistory(blocks, assembled, activeCategory || 'custom')
    setHistory(prev => [entry, ...prev].slice(0, 50))
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const handleExport = () => {
    const blob = new Blob([assembled], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `craft-${Date.now()}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!aiLoading) { setAiStage(0); return }
    const id = setInterval(() => setAiStage(s => (s + 1) % 4), 2000)
    return () => clearInterval(id)
  }, [aiLoading])

  const handleGenerate = async () => {
    if (!aiInput.trim() || aiLoading) return
    setAiLoading(true)
    setAiResult('')
    setAiApproach([])
    setAiError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setAiResult(data.prompt)
      setAiApproach(data.approach)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (!isImproving) { setImproveStage(0); return }
    const id = setInterval(() => setImproveStage(s => (s + 1) % 4), 2200)
    return () => clearInterval(id)
  }, [isImproving])

  const handleImprove = async () => {
    if (!assembled || isImproving) return
    setIsImproving(true)
    setImprovedPrompt('')
    setImproveChanges([])
    setImproveError('')
    try {
      const res = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: assembled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setImprovedPrompt(data.improved)
      setImproveChanges(data.changes)
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsImproving(false)
    }
  }

  const handleCopyImproved = () => {
    if (!improvedPrompt) return
    navigator.clipboard.writeText(improvedPrompt)
    setCopiedImproved(true)
    setTimeout(() => setCopiedImproved(false), 2200)
  }

  const loadFromCrumb = () => {
    const vault = getVault()
    if (!vault.length) return
    setBlocks(prev => {
      const hasCtx = prev.some(b => b.type === 'context')
      if (hasCtx) return prev.map(b => b.type === 'context' ? { ...b, content: vault[0].content } : b)
      return [...prev, { id: uid(), type: 'context', content: vault[0].content }]
    })
  }

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const updated = removeFromHistory(id)
    setHistory(updated)
  }

  const loadFromHistory = (entry: PromptEntry) => {
    if (entry.blocks?.length) {
      setBlocks(entry.blocks.map(b => ({ ...b, id: uid() })))
      setActiveCategory(entry.category)
    }
    setSidebarOpen(false)
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
  }

  const sevIcon: Record<Severity, LucideIcon> = { error: OctagonX, warning: AlertTriangle, tip: Lightbulb }
  const sevColor = { error: '#C47A5A', warning: '#C4A45A', tip: '#5DFFA8' }

  return (
    <motion.main
      className="min-h-screen pb-28"
      style={{ background: '#080D08', color: '#D4EDE0', fontFamily: 'var(--font-dm-sans)' }}
      initial={{ filter: 'blur(18px)', opacity: 0 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 100 }}
    >
      <style>{`
        .c-scroll { scrollbar-color: rgba(45,158,107,0.22) transparent; scrollbar-width: thin; }
        .c-scroll::-webkit-scrollbar { width: 3px; }
        .c-scroll::-webkit-scrollbar-track { background: transparent; }
        .c-scroll::-webkit-scrollbar-thumb { background: rgba(45,158,107,0.22); border-radius: 2px; }
        .c-scroll::-webkit-scrollbar-thumb:hover { background: rgba(93,255,168,0.35); }
        textarea::placeholder, input::placeholder { color: rgba(141,184,154,0.5); }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @media (min-width: 1024px) {
          .craft-split-left { scroll-padding-bottom: 56px; }
        }
      `}</style>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] right-[10%] w-[440px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(45,158,107,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[5%] w-[320px] h-[320px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(45,158,107,0.025) 0%, transparent 70%)' }} />
      </div>

      {/* ─── Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-4 sm:px-8 md:px-14 py-4"
        style={{
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(8,13,8,0.6)',
          borderBottom: '1px solid rgba(45,158,107,0.08)',
        }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 relative">
            <Image src="/Craftv2.png" alt="Craft" fill className="object-contain" />
          </div>
          <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '13px' }}>
            <TransitionLink href="/" type="home" style={{ color: 'rgba(141,184,154,0.55)' }} className="hover:opacity-75 transition-opacity">
              CrumbCraft.
            </TransitionLink>
            <span style={{ color: 'rgba(141,184,154,0.25)' }}>/</span>
            <span style={{ color: '#D4EDE0', fontWeight: 600 }}>Craft</span>
          </div>
        </div>
        <TransitionLink href="/crumb"
          type="crumb"
          className="flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-80"
          style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12px', color: 'rgba(141,184,154,0.5)' }}
          title="Switch to Crumb — AI memory compression">
          <div className="w-4 h-4 relative opacity-50">
            <Image src="/Crumbv2.png" alt="Crumb" fill className="object-contain"
              style={{ filter: 'hue-rotate(100deg) saturate(0.35)' }} />
          </div>
          <span>Crumb</span>
          <ArrowRight size={9} strokeWidth={2} style={{ opacity: 0.5 }} />
        </TransitionLink>
      </nav>

      <div className="relative z-10 px-4 sm:px-8 md:px-16 pt-24">

        {/* ─── Hero ─── */}
        <motion.section className="mb-12"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120, delay: 0.1 }}>
          <p className="mb-3 text-xs tracking-[0.22em]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#2D9E6B' }}>
            // compose · analyze · iterate
          </p>
          <h1 className="font-heading font-semibold leading-tight tracking-tight"
            style={{ fontSize: 'clamp(1.8rem, 3.8vw, 2.8rem)' }}>
            <span style={{ color: '#D4EDE0' }}>Prompt</span>{' '}
            <span style={{ color: '#2D9E6B' }}>Workshop</span>
          </h1>
          <p className="mt-3 text-base leading-relaxed" style={{ color: 'rgba(141,184,154,0.72)', maxWidth: '460px' }}>
            Build with technique blocks. Score with live DNA. Copy what actually works.
          </p>
        </motion.section>

        {/* ─── Mode Toggle ─── */}
        <motion.div
          className="mb-8 flex items-center gap-1"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120, delay: 0.18 }}
        >
          <div className="flex" style={{ border: '1px solid rgba(45,158,107,0.18)', borderRadius: '3px', overflow: 'hidden' }}>
            <button
              onClick={() => setCraftMode('manual')}
              className="flex items-center gap-2 px-5 py-2.5 text-xs transition-all"
              style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                ...(craftMode === 'manual'
                  ? { color: '#080D08', background: '#2D9E6B' }
                  : { color: 'rgba(141,184,154,0.5)', background: 'transparent' }
                ),
              }}
            >
              <Wrench size={12} strokeWidth={1.5} />
              Manual
            </button>
            <button
              onClick={() => setCraftMode('ai')}
              className="flex items-center gap-2 px-5 py-2.5 text-xs transition-all"
              style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                borderLeft: '1px solid rgba(45,158,107,0.18)',
                ...(craftMode === 'ai'
                  ? { color: '#080D08', background: '#5DFFA8' }
                  : { color: 'rgba(141,184,154,0.5)', background: 'transparent' }
                ),
              }}
            >
              <Sparkles size={12} strokeWidth={1.5} />
              AI
            </button>
          </div>
          <span className="ml-3 text-[11px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.5)' }}>
            {craftMode === 'manual' ? '— block-by-block control' : '— describe it, we engineer it'}
          </span>
        </motion.div>

        {/* ─── Template Strip ─── */}
        {craftMode === 'manual' && <section className="sticky top-[58px] z-40 mb-8 -mx-4 sm:-mx-8 md:-mx-16 px-4 sm:px-8 md:px-16 overflow-x-auto hide-scrollbar py-2.5"
          style={{ background: 'rgba(8,13,8,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(45,158,107,0.07)' }}>
          <div className="flex items-center gap-2 pb-0.5" style={{ minWidth: 'max-content' }}>
            <span className="flex-shrink-0 text-[11px] mr-3"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.45)', letterSpacing: '0.1em' }}>
              TEMPLATES
            </span>
            {CATEGORIES.map(cat => {
              const CatIcon = cat.Icon
              return (
              <button key={cat.id} onClick={() => loadTemplate(cat.id)}
                className="flex items-center gap-2 px-4 py-2 text-xs flex-shrink-0 transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                  ...(activeCategory === cat.id
                    ? { color: '#080D08', background: '#2D9E6B', border: '1px solid #2D9E6B' }
                    : { color: 'rgba(141,184,154,0.65)', background: 'rgba(45,158,107,0.04)', border: '1px solid rgba(45,158,107,0.14)' }
                  ),
                }}
                onMouseEnter={e => { if (activeCategory !== cat.id) { const el = e.currentTarget; el.style.color = 'rgba(141,184,154,0.95)'; el.style.background = 'rgba(45,158,107,0.09)'; el.style.borderColor = 'rgba(45,158,107,0.28)' } }}
                onMouseLeave={e => { if (activeCategory !== cat.id) { const el = e.currentTarget; el.style.color = 'rgba(141,184,154,0.65)'; el.style.background = 'rgba(45,158,107,0.04)'; el.style.borderColor = 'rgba(45,158,107,0.14)' } }}
              >
                <CatIcon size={12} strokeWidth={1.5} />
                <span>{cat.label}</span>
              </button>
              )
            })}
          </div>
        </section>}

        {/* ─── AI Mode ─── */}
        <AnimatePresence mode="wait">
        {craftMode === 'ai' && (
          <motion.div
            key="ai-mode"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
            className="flex flex-col gap-6"
          >
            {/* Input area */}
            <motion.div className="p-7 relative overflow-hidden"
              style={{ background: 'rgba(13,21,13,0.55)', border: '1px solid rgba(45,158,107,0.12)' }}
              animate={aiLoading ? {
                boxShadow: [
                  '0 0 0px rgba(93,255,168,0)',
                  '0 0 32px rgba(93,255,168,0.08), inset 0 0 50px rgba(93,255,168,0.025)',
                  '0 0 0px rgba(93,255,168,0)',
                ],
              } : { boxShadow: '0 0 0px rgba(93,255,168,0)' }}
              transition={aiLoading ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.6 }}
            >
              {/* AI loading overlay: particles + shimmer */}
              <AnimatePresence>
                {aiLoading && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 5 }}
                  >
                    {[0, 1, 2, 3].map(i => (
                      <motion.div key={i}
                        style={{
                          position: 'absolute', width: 3, height: 3, borderRadius: '50%',
                          background: '#5DFFA8', boxShadow: '0 0 7px rgba(93,255,168,0.9)',
                          left: `${15 + i * 23}%`, bottom: 8,
                        }}
                        animate={{ y: [0, -90], opacity: [0, 0.75, 0] }}
                        transition={{ duration: 2.2, delay: i * 0.55, repeat: Infinity, ease: 'easeOut' }}
                      />
                    ))}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', width: '38%', background: 'linear-gradient(90deg, transparent, rgba(93,255,168,0.75), transparent)' }}
                        animate={{ x: ['-100%', '380%'] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-1 h-4 rounded-full" style={{ background: '#5DFFA8', opacity: 0.45 }} />
                <span className="text-[11px] uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.72)' }}>
                  Describe Your Task
                </span>
                <span className="ml-auto text-[10px]"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.28)' }}>
                  more detail → better prompt
                </span>
              </div>
              <textarea
                className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none c-scroll"
                style={{
                  fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0',
                  minHeight: '140px',
                }}
                placeholder={"I want an AI that reviews my pull request and gives me specific feedback on code quality, potential bugs, and anything that looks like a security issue. Should be blunt, not nice."}
                value={aiInput}
                onChange={e => { setAiInput(e.target.value); setAiResult(''); setAiApproach([]); setAiError('') }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
              />
              {(() => {
                const wc = aiInput.trim().split(/\s+/).filter(Boolean).length
                if (wc > 0 && wc < 15) return (
                  <p className="mt-2 text-[11px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(196,164,90,0.78)' }}>
                    Too vague — add what tech stack, who the audience is, or what tone you want. The AI can only work with what you give it.
                  </p>
                )
                return null
              })()}
              <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(45,158,107,0.07)' }}>
                <span className="text-[11px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.55)' }}>
                  {aiInput.trim().split(/\s+/).filter(Boolean).length} words · Ctrl+Enter to generate
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={aiInput.trim().split(/\s+/).filter(Boolean).length < 5 || aiLoading}
                  className="flex items-center gap-2.5 text-sm px-6 py-2.5 relative overflow-hidden transition-all disabled:opacity-30"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                    color: aiLoading ? '#5DFFA8' : '#080D08',
                    background: aiLoading ? 'rgba(93,255,168,0.04)' : '#5DFFA8',
                    border: `1px solid ${aiLoading ? 'rgba(93,255,168,0.35)' : '#5DFFA8'}`,
                  }}
                >
                  {aiLoading && (
                    <motion.div
                      animate={{ opacity: [0, 0.2, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(93,255,168,0.35) 0%, transparent 70%)' }}
                    />
                  )}
                  {aiLoading ? (
                    <div className="flex items-center gap-2.5 relative z-10">
                      <div style={{ width: 14, height: 14, position: 'relative', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(93,255,168,0.2)' }} />
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0 }}>
                          <div style={{ position: 'absolute', top: -1.5, left: '50%', width: 3, height: 3, borderRadius: '50%', background: '#5DFFA8', transform: 'translateX(-50%)', boxShadow: '0 0 5px #5DFFA8' }} />
                        </motion.div>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.span key={aiStage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
                          {IMPROVE_STAGES[aiStage]}
                        </motion.span>
                      </AnimatePresence>
                      <div className="flex gap-[3px] ml-1.5">
                        {[0, 1, 2].map(i => (
                          <motion.div key={i}
                            style={{ width: 3, height: 3, borderRadius: '50%', background: '#5DFFA8', flexShrink: 0 }}
                            animate={{ opacity: [0.25, 1, 0.25], scale: [0.7, 1.2, 0.7] }}
                            transition={{ duration: 1.1, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="relative z-10 flex items-center gap-2"><Sparkles size={13} strokeWidth={1.5} /> Generate Prompt</span>
                  )}
                </button>
              </div>
              {aiError && (
                <div className="mt-3 flex items-start gap-2.5">
                  <OctagonX size={13} strokeWidth={1.5} style={{ color: '#C47A5A', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-sm" style={{ color: 'rgba(196,122,90,0.8)' }}>{aiError}</p>
                </div>
              )}
            </motion.div>

            {/* Generated result */}
            <AnimatePresence>
            {aiResult && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', damping: 28, stiffness: 200 }}
                className="p-7"
                style={{ background: 'rgba(8,20,12,0.7)', border: '1px solid rgba(93,255,168,0.18)' }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-4 rounded-full" style={{ background: '#5DFFA8', opacity: 0.6 }} />
                    <span className="text-[11px] uppercase tracking-widest"
                      style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(93,255,168,0.7)' }}>
                      Generated Prompt
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.6)' }}>
                    {Math.round(aiResult.length / 4)} tokens
                  </span>
                </div>

                <p className="text-sm leading-relaxed mb-6 whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#5DFFA8', lineHeight: '1.75' }}>
                  {aiResult}
                </p>

                {aiApproach.length > 0 && (
                  <div className="mb-6 flex flex-col gap-2.5 pt-5" style={{ borderTop: '1px solid rgba(93,255,168,0.08)' }}>
                    <span className="text-[11px] uppercase tracking-[0.08em] mb-1"
                      style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(93,255,168,0.62)' }}>
                      What we engineered
                    </span>
                    {aiApproach.map((a, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-start gap-3">
                        <span style={{ color: '#5DFFA8', opacity: 0.45, fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', flexShrink: 0, marginTop: 1 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(212,237,224,0.78)' }}>{a}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid rgba(93,255,168,0.08)' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult)
                      setAiCopied(true)
                      setTimeout(() => setAiCopied(false), 2200)
                    }}
                    className="flex items-center gap-2 text-sm px-6 py-2.5 transition-all"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      color: aiCopied ? '#5DFFA8' : '#D4EDE0',
                      background: aiCopied ? 'rgba(93,255,168,0.07)' : 'rgba(93,255,168,0.08)',
                      border: `1px solid ${aiCopied ? 'rgba(93,255,168,0.35)' : 'rgba(93,255,168,0.2)'}`,
                    }}
                    onMouseEnter={e => { if (!aiCopied) { e.currentTarget.style.background = 'rgba(93,255,168,0.14)'; e.currentTarget.style.borderColor = 'rgba(93,255,168,0.32)' } }}
                    onMouseLeave={e => { if (!aiCopied) { e.currentTarget.style.background = 'rgba(93,255,168,0.08)'; e.currentTarget.style.borderColor = 'rgba(93,255,168,0.2)' } }}
                  >
                    {aiCopied ? '✓ Copied' : 'Copy Prompt'}
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([aiResult], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url; a.download = `craft-ai-${Date.now()}.txt`; a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="text-sm px-4 py-2.5 transition-all"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      color: 'rgba(141,184,154,0.6)', border: '1px solid rgba(45,158,107,0.14)', background: 'transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(45,158,107,0.06)'; e.currentTarget.style.color = 'rgba(141,184,154,0.9)'; e.currentTarget.style.borderColor = 'rgba(45,158,107,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(141,184,154,0.6)'; e.currentTarget.style.borderColor = 'rgba(45,158,107,0.14)' }}
                  >
                    Export .txt
                  </button>
                  <button
                    onClick={() => {
                      setCraftMode('manual')
                      const tmpl: Block[] = [
                        { id: uid(), type: 'objective', content: aiInput },
                      ]
                      setBlocks(tmpl)
                    }}
                    className="flex items-center gap-2 text-sm px-4 py-2.5 ml-auto transition-all hover:opacity-80"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      color: 'rgba(141,184,154,0.55)', border: '1px solid rgba(45,158,107,0.14)', background: 'transparent',
                    }}>
                    <Wrench size={12} strokeWidth={1.5} /> Refine in Manual
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ─── Manual Mode: Main Split + Assembled ─── */}
        {craftMode === 'manual' && <><div className="flex flex-col lg:flex-row gap-10 lg:gap-14" ref={builderRef}>

          {/* LEFT: Block Composer ── 58% */}
          <div className="lg:w-[58%] flex flex-col lg:pr-3">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-4 rounded-full" style={{ background: '#2D9E6B', opacity: 0.4 }} />
              <span className="text-[11px] uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.72)' }}>
                Blocks
              </span>
              <span className="text-[11px] ml-1 hidden sm:inline"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.5)' }}>
                · drag to reorder
              </span>
            </div>

            <Reorder.Group axis="y" values={blocks} onReorder={setBlocks}>
              <AnimatePresence initial={false}>
                {blocks.map(block => (
                  <BlockCard key={block.id} block={block}
                    onChange={updated => updateBlock(block.id, updated)}
                    onDelete={() => deleteBlock(block.id)} />
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {/* Add Block + Load from Crumb */}
            <div className="relative flex items-center gap-4 mt-6 pt-3 pb-2"
              ref={addMenuRef}
              style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(8,13,8,0.9)', borderTop: '1px solid rgba(45,158,107,0.07)' }}>
              <AnimatePresence>
                {showAddMenu && (
                  <AddBlockMenu onAdd={addBlock} onClose={() => setShowAddMenu(false)} usedTypes={blocks.map(b => b.type)} />
                )}
              </AnimatePresence>
              {blocks.length < BLOCK_MENU.length && (
              <button onClick={() => setShowAddMenu(v => !v)}
                className="flex items-center gap-2 text-xs px-4 py-2 transition-all"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                  color: showAddMenu ? '#2D9E6B' : 'rgba(141,184,154,0.72)',
                  border: `1px solid ${showAddMenu ? 'rgba(45,158,107,0.3)' : 'rgba(45,158,107,0.22)'}`,
                  background: showAddMenu ? 'rgba(45,158,107,0.06)' : 'transparent',
                }}
                onMouseEnter={e => { if (!showAddMenu) { e.currentTarget.style.color = '#2D9E6B'; e.currentTarget.style.background = 'rgba(45,158,107,0.06)'; e.currentTarget.style.borderColor = 'rgba(45,158,107,0.32)' } }}
                onMouseLeave={e => { if (!showAddMenu) { e.currentTarget.style.color = 'rgba(141,184,154,0.72)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(45,158,107,0.22)' } }}
              >
                + Add Block <span style={{ opacity: 0.4, fontSize: '9px' }}>▼</span>
              </button>
              )}
              <button onClick={loadFromCrumb} disabled={!vaultHasEntries}
                className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-75 disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(45,158,107,0.75)' }}>
                ⚡ Load from Crumb
              </button>
            </div>
          </div>

          {/* RIGHT: DNA + Linter ── 42% */}
          <div className="lg:w-[42%] flex flex-col gap-6 lg:sticky lg:top-[120px] lg:self-start overflow-hidden">

            {/* Prompt DNA */}
            <div className="p-7" style={{ background: 'rgba(13,21,13,0.55)', border: '1px solid rgba(45,158,107,0.1)' }}>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-1 h-4 rounded-full" style={{ background: '#2D9E6B', opacity: 0.45 }} />
                <span className="text-[11px] uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.72)' }}>
                  Prompt DNA
                </span>
              </div>
              <PentagonDNA score={dna} />
            </div>

            {/* Quick Fixes */}
            {(() => {
              const fixes: { label: string; score: number; blockType: BlockType; tip: string }[] = (
                [
                  { label: 'Clarity',    score: dna.clarity,     blockType: 'persona'    as BlockType, tip: '+ Add Persona' },
                  { label: 'Specificity',score: dna.specificity, blockType: 'context'    as BlockType, tip: '+ Add Context' },
                  { label: 'Structure',  score: dna.structure,   blockType: 'format'     as BlockType, tip: '+ Add Format' },
                  { label: 'Context',    score: dna.context,     blockType: 'context'    as BlockType, tip: '+ Add Context' },
                  { label: 'Guardrails', score: dna.guardrails,  blockType: 'constraint' as BlockType, tip: '+ Add Constraint' },
                ] as { label: string; score: number; blockType: BlockType; tip: string }[]
              ).filter(f => f.score < 50 && !blocks.some(b => b.type === f.blockType))
              if (!fixes.length) return null
              return (
                <div className="p-5" style={{ background: 'rgba(13,21,13,0.35)', border: '1px solid rgba(45,158,107,0.08)' }}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-1 h-4 rounded-full" style={{ background: '#C4A45A', opacity: 0.45 }} />
                    <span className="text-[11px] uppercase tracking-widest"
                      style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.72)' }}>
                      Quick Fixes
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {fixes.map(f => (
                      <div key={f.label} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: '#C47A5A' }}>
                            {f.label} {f.score}
                          </span>
                        </div>
                        <button
                          onClick={() => addBlock(f.blockType)}
                          className="flex-shrink-0 text-[10px] px-2.5 py-1 transition-all hover:opacity-80"
                          style={{
                            fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                            color: '#5DFFA8', border: '1px solid rgba(93,255,168,0.2)',
                            background: 'rgba(93,255,168,0.04)',
                          }}>
                          {f.tip}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Linter */}
            <div className="p-7" style={{ background: 'rgba(13,21,13,0.45)', border: '1px solid rgba(45,158,107,0.1)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-4 rounded-full" style={{ background: '#C47A5A', opacity: 0.45 }} />
                  <span className="text-[11px] uppercase tracking-widest"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.72)' }}>
                    Linter
                  </span>
                </div>
                {warnings.length === 0 && hasContent && (
                  <span className="text-xs" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#5DFFA8' }}>
                    ✓ clean
                  </span>
                )}
              </div>
              {warnings.length === 0 ? (
                <p className="text-sm leading-relaxed"
                  style={{ color: hasContent ? 'rgba(93,255,168,0.65)' : 'rgba(141,184,154,0.5)' }}>
                  {hasContent ? 'No issues detected.' : 'Fill in blocks to see live analysis.'}
                </p>
              ) : (
                <div className="flex flex-col gap-3.5">
                  <AnimatePresence>
                    {warnings.map(w => {
                      const SIcon = sevIcon[w.severity]
                      return (
                      <motion.div key={w.id}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                        className="flex items-start gap-3">
                        <span style={{ color: sevColor[w.severity], flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center' }}>
                          <SIcon size={13} strokeWidth={1.5} />
                        </span>
                        <span className="text-sm leading-relaxed"
                          style={{ color: 'rgba(212,237,224,0.82)' }}>
                          {w.message}
                        </span>
                      </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ─── Assembled Prompt ── full width below the split ─── */}
        <motion.div
          className="mt-10 p-7"
          style={{ background: 'rgba(13,21,13,0.55)', border: '1px solid rgba(45,158,107,0.1)', position: 'relative', overflow: 'hidden' }}
          animate={isImproving ? {
            boxShadow: [
              '0 0 0px rgba(93,255,168,0), inset 0 0 0px rgba(93,255,168,0)',
              '0 0 30px rgba(93,255,168,0.07), inset 0 0 50px rgba(93,255,168,0.02)',
              '0 0 0px rgba(93,255,168,0), inset 0 0 0px rgba(93,255,168,0)',
            ],
          } : { boxShadow: '0 0 0px rgba(93,255,168,0)' }}
          transition={isImproving ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.6 }}
        >
          {/* ── AI scan overlay ── */}
          <AnimatePresence>
            {isImproving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}
              >
                {/* Dim veil */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,8,2,0.32)' }} />
                {/* Scan sweep unit */}
                <motion.div
                  animate={{ y: ['-60px', '900px'] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
                >
                  <div style={{ height: 48, background: 'linear-gradient(to bottom, transparent, rgba(93,255,168,0.06))' }} />
                  <div style={{
                    height: 2,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(93,255,168,0.45) 12%, rgba(93,255,168,0.9) 50%, rgba(93,255,168,0.45) 88%, transparent 100%)',
                    boxShadow: '0 0 18px rgba(93,255,168,0.65), 0 0 6px rgba(93,255,168,1)',
                  }} />
                  <div style={{ height: 18, background: 'linear-gradient(to bottom, rgba(93,255,168,0.04), transparent)' }} />
                </motion.div>
                {/* Corner brackets */}
                {[
                  { top: 12, left: 12, borderTop: '1px solid rgba(93,255,168,0.4)', borderLeft: '1px solid rgba(93,255,168,0.4)' },
                  { top: 12, right: 12, borderTop: '1px solid rgba(93,255,168,0.4)', borderRight: '1px solid rgba(93,255,168,0.4)' },
                  { bottom: 12, left: 12, borderBottom: '1px solid rgba(93,255,168,0.4)', borderLeft: '1px solid rgba(93,255,168,0.4)' },
                  { bottom: 12, right: 12, borderBottom: '1px solid rgba(93,255,168,0.4)', borderRight: '1px solid rgba(93,255,168,0.4)' },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
                    style={{ position: 'absolute', width: 14, height: 14, ...s }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 rounded-full" style={{ background: '#7A8DC4', opacity: 0.45 }} />
              <span className="text-[11px] uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.72)' }}>
                Assembled Prompt
              </span>
            </div>
            <span className="text-xs"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.6)' }}>
              {tokenCount} tokens · {assembled.length} chars
            </span>
          </div>

          <div className="mb-6">
            {hasContent ? (
              <div className="flex flex-col gap-1">
                {(() => {
                  let section: BlockType = 'objective'
                  let wasPersona = false
                  return assembled.split('\n').map((line, i) => {
                    if (!line.trim()) return <div key={i} className="h-3" />
                    if (/^You are/.test(line))           { section = 'persona';    wasPersona = true }
                    else if (/^Context:/.test(line))     { section = 'context';    wasPersona = false }
                    else if (/^Example:/.test(line))     { section = 'example';    wasPersona = false }
                    else if (/^(Input:|Output:)/.test(line)) { section = 'example'; wasPersona = false }
                    else if (/^Constraints:/.test(line)) { section = 'constraint'; wasPersona = false }
                    else if (/^Format your/.test(line))  { section = 'format';     wasPersona = false }
                    else if (/^(Think step|Before respond|After your|Rate your|Consider at)/.test(line)) { section = 'technique'; wasPersona = false }
                    else if (wasPersona)                 { section = 'objective';  wasPersona = false }
                    return (
                      <p key={i} className="text-sm leading-relaxed"
                        style={{ fontFamily: 'var(--font-jetbrains-mono)', color: BLOCK_META[section].color }}>
                        {line}
                      </p>
                    )
                  })
                })()}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'rgba(141,184,154,0.5)' }}>
                Fill in blocks above to assemble your prompt...
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-5" style={{ borderTop: '1px solid rgba(45,158,107,0.08)' }}>
            <button onClick={handleCopy} disabled={!hasContent}
              className="flex items-center gap-2 text-sm px-6 py-2.5 transition-all disabled:opacity-25"
              style={{
                fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                color: copied ? '#5DFFA8' : '#D4EDE0',
                background: copied ? 'rgba(93,255,168,0.07)' : 'rgba(45,158,107,0.1)',
                border: `1px solid ${copied ? 'rgba(93,255,168,0.28)' : 'rgba(45,158,107,0.2)'}`,
              }}
              onMouseEnter={e => { if (!copied && hasContent) { e.currentTarget.style.background = 'rgba(45,158,107,0.18)'; e.currentTarget.style.borderColor = 'rgba(45,158,107,0.35)' } }}
              onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = 'rgba(45,158,107,0.1)'; e.currentTarget.style.borderColor = 'rgba(45,158,107,0.2)' } }}
            >
              {copied ? '✓ Copied' : 'Copy Prompt'}
            </button>
            <button onClick={handleExport} disabled={!hasContent}
              className="text-sm px-4 py-2.5 transition-all disabled:opacity-25"
              style={{
                fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                color: 'rgba(141,184,154,0.72)', border: '1px solid rgba(45,158,107,0.2)', background: 'transparent',
              }}
              onMouseEnter={e => { if (hasContent) { e.currentTarget.style.background = 'rgba(45,158,107,0.06)'; e.currentTarget.style.color = 'rgba(141,184,154,0.95)'; e.currentTarget.style.borderColor = 'rgba(45,158,107,0.3)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(141,184,154,0.72)'; e.currentTarget.style.borderColor = 'rgba(45,158,107,0.2)' }}
            >
              Export .txt
            </button>
            <button
              onClick={handleImprove}
              disabled={!hasContent || isImproving}
              className="flex items-center gap-2.5 text-sm px-6 py-2.5 ml-auto relative overflow-hidden"
              style={{
                fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                color: isImproving ? '#5DFFA8' : '#080D08',
                background: isImproving ? 'rgba(93,255,168,0.04)' : '#5DFFA8',
                border: `1px solid ${isImproving ? 'rgba(93,255,168,0.35)' : '#5DFFA8'}`,
                transition: 'color 0.35s, background 0.35s, border-color 0.35s',
                opacity: (!hasContent && !isImproving) ? 0.3 : 1,
                cursor: isImproving ? 'default' : undefined,
              }}
            >
              {/* Pulsing radial glow inside button while loading */}
              {isImproving && (
                <motion.div
                  animate={{ opacity: [0, 0.18, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse at center, rgba(93,255,168,0.35) 0%, transparent 70%)',
                  }}
                />
              )}

              {isImproving ? (
                <div className="flex items-center gap-2.5 relative z-10">
                  {/* Orbit animation */}
                  <div style={{ width: 15, height: 15, position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      border: '1px solid rgba(93,255,168,0.18)',
                    }} />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                      style={{ position: 'absolute', inset: 0 }}
                    >
                      <div style={{
                        position: 'absolute', top: -1.5, left: '50%',
                        width: 3, height: 3, borderRadius: '50%',
                        background: '#5DFFA8', transform: 'translateX(-50%)',
                        boxShadow: '0 0 5px #5DFFA8',
                      }} />
                    </motion.div>
                    <motion.div
                      animate={{ scale: [0.5, 1, 0.5], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        width: 4, height: 4, borderRadius: '50%',
                        background: '#5DFFA8', transform: 'translate(-50%, -50%)',
                      }}
                    />
                  </div>
                  {/* Cycling status text */}
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={improveStage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.22 }}
                    >
                      {IMPROVE_STAGES[improveStage]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              ) : (
                <span className="relative z-10 flex items-center gap-2"><Wand2 size={14} strokeWidth={1.5} /> Improve with AI</span>
              )}
            </button>
          </div>

          {/* ── Improve error ── */}
          {improveError && (
            <div className="mt-4 flex items-start gap-2.5 px-1">
              <OctagonX size={13} strokeWidth={1.5} style={{ color: '#C47A5A', flexShrink: 0 }} />
              <p className="text-sm" style={{ color: 'rgba(196,122,90,0.8)' }}>{improveError}</p>
            </div>
          )}
        </motion.div>

        {/* ─── Improved Prompt result ─── */}
        <AnimatePresence>
          {improvedPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="mt-4 p-7"
              style={{ background: 'rgba(8,20,12,0.7)', border: '1px solid rgba(93,255,168,0.18)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-4 rounded-full" style={{ background: '#5DFFA8', opacity: 0.7 }} />
                  <span className="text-[11px] uppercase tracking-widest"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(93,255,168,0.6)' }}>
                    AI Improved
                  </span>
                </div>
                <button onClick={() => { setImprovedPrompt(''); setImproveChanges([]) }}
                  className="text-xs transition-opacity hover:opacity-60"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.4)' }}>
                  dismiss
                </button>
              </div>

              {/* What changed — truncated with expand toggle */}
              {improveChanges.length > 0 && (
                <div className="mb-6 flex flex-col gap-2">
                  {improveChanges.map((change, i) => {
                    const text = typeof change === 'string' ? change : String(change)
                    const firstSentenceEnd = text.search(/\.\s/)
                    const short = firstSentenceEnd > 0 ? text.slice(0, firstSentenceEnd + 1) : text.slice(0, 80)
                    const hasMore = text.length > short.length
                    const expanded = expandedChanges.includes(i)
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <span style={{ color: '#5DFFA8', fontSize: '11px', flexShrink: 0, marginTop: '3px', opacity: 0.7, fontFamily: 'var(--font-jetbrains-mono)' }}>
                          {i + 1}.
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(212,237,224,0.75)' }}>
                            <strong style={{ color: 'rgba(212,237,224,0.95)', fontWeight: 600 }}>
                              {short}
                            </strong>
                            {expanded && hasMore && (
                              <span style={{ color: 'rgba(212,237,224,0.55)' }}>{text.slice(short.length)}</span>
                            )}
                          </p>
                          {hasMore && (
                            <button
                              onClick={() => setExpandedChanges(prev => expanded ? prev.filter(n => n !== i) : [...prev, i])}
                              className="text-left text-[10px] transition-opacity hover:opacity-100"
                              style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(93,255,168,0.45)', opacity: 0.7 }}>
                              {expanded ? '↑ less' : '↓ more'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="h-px mb-6" style={{ background: 'rgba(93,255,168,0.08)' }} />

              {/* Improved prompt text — staggered line reveal */}
              <div className="mb-6">
                <div className="flex flex-col gap-1" key={improvedPrompt.slice(0, 20)}>
                  {(() => {
                    let section: BlockType = 'objective'
                    let wasPersona = false
                    return improvedPrompt.split('\n').map((line, i) => {
                      if (!line.trim()) return <div key={i} className="h-3" />
                      if (/^You are/.test(line))           { section = 'persona';    wasPersona = true }
                      else if (/^Context:/.test(line))     { section = 'context';    wasPersona = false }
                      else if (/^Example:/.test(line))     { section = 'example';    wasPersona = false }
                      else if (/^(Input:|Output:)/.test(line)) { section = 'example'; wasPersona = false }
                      else if (/^Constraints:/.test(line)) { section = 'constraint'; wasPersona = false }
                      else if (/^Format your/.test(line))  { section = 'format';     wasPersona = false }
                      else if (/^(Think step|Before respond|After your|Rate your|Consider at)/.test(line)) { section = 'technique'; wasPersona = false }
                      else if (wasPersona)                 { section = 'objective';  wasPersona = false }
                      return (
                        <motion.p key={i} className="text-sm leading-relaxed"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.018 }}
                          style={{ fontFamily: 'var(--font-jetbrains-mono)', color: BLOCK_META[section].color }}>
                          {line}
                        </motion.p>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-5" style={{ borderTop: '1px solid rgba(93,255,168,0.08)' }}>
                <button onClick={handleCopyImproved}
                  className="flex items-center gap-2 text-sm px-6 py-2.5 transition-all"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                    color: copiedImproved ? '#5DFFA8' : '#080D08',
                    background: copiedImproved ? 'rgba(93,255,168,0.15)' : '#5DFFA8',
                    border: `1px solid ${copiedImproved ? 'rgba(93,255,168,0.4)' : '#5DFFA8'}`,
                  }}
                  onMouseEnter={e => { if (!copiedImproved) { e.currentTarget.style.background = 'rgba(93,255,168,0.88)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(93,255,168,0.25)' } }}
                  onMouseLeave={e => { if (!copiedImproved) { e.currentTarget.style.background = '#5DFFA8'; e.currentTarget.style.boxShadow = 'none' } }}
                >
                  {copiedImproved ? '✓ Copied' : 'Copy Improved'}
                </button>
                <button onClick={handleImprove} disabled={isImproving}
                  className="text-sm px-4 py-2.5 transition-all disabled:opacity-30"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                    color: 'rgba(93,255,168,0.55)', border: '1px solid rgba(93,255,168,0.18)', background: 'transparent',
                  }}
                  onMouseEnter={e => { if (!isImproving) { e.currentTarget.style.background = 'rgba(93,255,168,0.06)'; e.currentTarget.style.color = 'rgba(93,255,168,0.85)'; e.currentTarget.style.borderColor = 'rgba(93,255,168,0.3)' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(93,255,168,0.55)'; e.currentTarget.style.borderColor = 'rgba(93,255,168,0.18)' }}
                >
                  Regenerate
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </> }

      </div>

      {/* ─── History Sidebar ─── */}
      {/* ─── History Modal ─── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="craft-history-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(4,9,4,0.88)', backdropFilter: 'blur(12px)' }}
            onClick={e => { if (e.target === e.currentTarget) setSidebarOpen(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #0D1A0D 0%, #080D08 100%)',
                boxShadow: '0 0 0 1px rgba(45,158,107,0.18), 0 32px 80px rgba(0,0,0,0.7)',
              }}
            >
              {/* Top glow line */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(93,255,168,0.3), transparent)' }} />

              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-5"
                style={{ borderBottom: '1px solid rgba(45,158,107,0.1)' }}>
                <div className="flex items-center gap-3">
                  <Clock size={13} strokeWidth={1.5} style={{ color: '#2D9E6B', opacity: 0.7 }} />
                  <div className="w-px h-4" style={{ background: 'rgba(45,158,107,0.2)' }} />
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-sora)', color: 'rgba(212,237,224,0.9)' }}>
                      Prompt Vault
                    </h2>
                    <p className="text-[10px] mt-0.5" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.5)' }}>
                      {history.length} saved {history.length === 1 ? 'prompt' : 'prompts'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ color: 'rgba(141,184,154,0.45)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(212,237,224,0.8)'; e.currentTarget.style.background = 'rgba(45,158,107,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(141,184,154,0.45)'; e.currentTarget.style.background = 'transparent' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(45,158,107,0.06)', border: '1px solid rgba(45,158,107,0.12)' }}>
                      <Clock size={16} strokeWidth={1.5} style={{ color: 'rgba(141,184,154,0.4)' }} />
                    </div>
                    <p className="text-sm text-center leading-relaxed" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.45)' }}>
                      No saved prompts yet.<br />Copy a prompt to save it here.
                    </p>
                  </div>
                ) : (
                  <div style={{ borderTop: 'none' }}>
                    {history.slice(0, 20).map((entry, i) => {
                      const catColor = CATEGORY_COLOR[entry.category] ?? '#2D9E6B'
                      const firstLine = entry.assembled.split('\n').find(l => l.trim()) ?? ''
                      return (
                        <div
                          key={entry.id}
                          className="group relative flex items-start gap-4 px-6 py-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.02]"
                          style={{
                            borderBottom: '1px solid rgba(45,158,107,0.06)',
                            animation: `fadeUp 0.35s ease-out ${i * 0.04}s both`,
                          }}
                          onClick={() => { loadFromHistory(entry); setSidebarOpen(false) }}
                        >
                          {/* Category dot */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                            style={{ background: `${catColor}12`, border: `1px solid ${catColor}30` }}>
                            <div className="w-2 h-2 rounded-full" style={{ background: catColor, opacity: 0.8 }} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug truncate pr-2"
                              style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(212,237,224,0.85)' }}>
                              {firstLine.slice(0, 120)}{firstLine.length > 120 ? '…' : ''}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="text-[10px]"
                                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.5)' }}>
                                {formatRelativeDate(entry.createdAt)}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-[2px]"
                                style={{
                                  fontFamily: 'var(--font-jetbrains-mono)',
                                  color: catColor,
                                  background: `${catColor}14`,
                                  border: `1px solid ${catColor}25`,
                                  letterSpacing: '0.04em',
                                }}>
                                {entry.category}
                              </span>
                              {entry.blocks?.length > 0 && (
                                <span className="text-[10px]"
                                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.35)' }}>
                                  {entry.blocks.length} blocks
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                            <span className="text-[11px] underline underline-offset-2"
                              style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#2D9E6B', textDecorationColor: 'rgba(45,158,107,0.3)' }}>
                              Load
                            </span>
                            <button
                              onClick={e => handleDeleteHistory(e, entry.id)}
                              className="transition-colors"
                              style={{ color: 'rgba(141,184,154,0.25)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,122,90,0.8)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(141,184,154,0.25)')}
                              title="Delete">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {history.length > 0 && (
                <div className="flex-shrink-0 px-6 py-3" style={{ borderTop: '1px solid rgba(45,158,107,0.08)' }}>
                  <p className="text-[10px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(141,184,154,0.3)' }}>
                    Stored locally in your browser · Max 50 entries
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Footer ─── */}
      <div className="relative z-10 flex justify-center py-6 mt-4">
        <span className="font-mono text-[10px] tracking-widest" style={{ color: 'rgba(141,184,154,0.2)' }}>
          © 2026 CrumbCraft
        </span>
      </div>

      {/* ─── Bottom Dock ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', damping: 30, stiffness: 200 }}
          className="flex items-center gap-1 px-2 py-2"
          style={{
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            background: 'rgba(8,13,8,0.45)', borderRadius: '20px', border: '1px solid rgba(45,158,107,0.1)',
          }}>
          <button onClick={() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(141,184,154,0.72)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#5DFFA8'; e.currentTarget.style.background = 'rgba(45,158,107,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(141,184,154,0.72)'; e.currentTarget.style.background = 'transparent' }}>
            <PenSquare size={14} strokeWidth={1.5} />
            <span className="hidden sm:inline">Builder</span>
          </button>

          <div className="w-px h-5" style={{ background: 'rgba(45,158,107,0.15)' }} />

          <button onClick={handleImprove} disabled={!hasContent || isImproving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all disabled:opacity-30"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: isImproving ? '#5DFFA8' : 'rgba(141,184,154,0.72)' }}
            onMouseEnter={e => { if (!isImproving) { e.currentTarget.style.color = '#5DFFA8'; e.currentTarget.style.background = 'rgba(45,158,107,0.1)' } }}
            onMouseLeave={e => { if (!isImproving) { e.currentTarget.style.color = 'rgba(141,184,154,0.72)'; e.currentTarget.style.background = 'transparent' } }}>
            <Wand2 size={14} strokeWidth={1.5} />
            <span className="hidden sm:inline">{isImproving ? 'Improving…' : 'Improve'}</span>
          </button>

          <div className="w-px h-5" style={{ background: 'rgba(45,158,107,0.15)' }} />

          <button onClick={() => setSidebarOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: sidebarOpen ? '#5DFFA8' : 'rgba(141,184,154,0.72)', background: sidebarOpen ? 'rgba(45,158,107,0.1)' : 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#5DFFA8'; e.currentTarget.style.background = 'rgba(45,158,107,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = sidebarOpen ? '#5DFFA8' : 'rgba(141,184,154,0.72)'; e.currentTarget.style.background = sidebarOpen ? 'rgba(45,158,107,0.1)' : 'transparent' }}>
            <Clock size={14} strokeWidth={1.5} />
            <span className="hidden sm:inline">History</span>
          </button>
        </motion.div>
      </div>

    </motion.main>
  )
}
