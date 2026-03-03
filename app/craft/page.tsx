'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { getVault } from '@/lib/vault'

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

const BLOCK_META: Record<BlockType, { label: string; color: string; bg: string; placeholder: string; icon: string }> = {
  persona:    { label: 'PERSONA',    color: '#2D9E6B', bg: 'rgba(45,158,107,0.07)',  placeholder: 'senior [LANGUAGE] developer with 10+ years of experience', icon: '◉' },
  objective:  { label: 'OBJECTIVE',  color: '#5DFFA8', bg: 'rgba(93,255,168,0.04)',  placeholder: 'Review this code for bugs, performance issues, and best practices', icon: '◎' },
  context:    { label: 'CONTEXT',    color: '#8DB89A', bg: 'rgba(141,184,154,0.04)', placeholder: 'Relevant background, code snippets, or details...', icon: '≡' },
  technique:  { label: 'TECHNIQUE',  color: '#A8D4BA', bg: 'rgba(168,212,186,0.04)', placeholder: '', icon: '⚡' },
  example:    { label: 'EXAMPLE',    color: '#C4A45A', bg: 'rgba(196,164,90,0.04)',  placeholder: '', icon: '↔' },
  constraint: { label: 'CONSTRAINT', color: '#C47A5A', bg: 'rgba(196,122,90,0.05)',  placeholder: 'Critical issues first. No praise. Max 3 bullet points.', icon: '⊘' },
  format:     { label: 'FORMAT',     color: '#7A8DC4', bg: 'rgba(122,141,196,0.05)', placeholder: 'Describe output structure...', icon: '◧' },
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
  { id: 'code-dev',      label: 'Code & Dev',    icon: '</>' },
  { id: 'writing-copy',  label: 'Writing',        icon: '✍'  },
  { id: 'design-ui',     label: 'Design & UI',    icon: '◈'  },
  { id: 'data-analysis', label: 'Data Analysis',  icon: '∑'  },
  { id: 'research',      label: 'Research',       icon: '◎'  },
  { id: 'product',       label: 'Product',        icon: '◇'  },
  { id: 'marketing',     label: 'Marketing',      icon: '⟐'  },
  { id: 'learning',      label: 'Learning',       icon: '⊕'  },
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

// ─── Pentagon DNA ─────────────────────────────────────────────────────────────

function PentagonDNA({ score }: { score: DNAScore }) {
  const axes = [
    { label: 'Clarity',     value: score.clarity },
    { label: 'Specific',    value: score.specificity },
    { label: 'Structure',   value: score.structure },
    { label: 'Context',     value: score.context },
    { label: 'Guardrails',  value: score.guardrails },
  ]
  const cx = 105, cy = 105, R = 72
  const pt = (i: number, r: number) => ({
    x: cx + r * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
    y: cy + r * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
  })
  const rings = [0.25, 0.5, 0.75, 1]
  const outer = axes.map((_, i) => pt(i, R))
  const data  = axes.map((ax, i) => pt(i, (ax.value / 100) * R))
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'
  const overall = Math.round(axes.reduce((s, a) => s + a.value, 0) / axes.length)

  return (
    <div className="flex flex-col items-center">
      <svg width="210" height="210" viewBox="0 0 210 210">
        {rings.map(r => (
          <path key={r} d={toPath(axes.map((_, i) => pt(i, R * r)))}
            fill="none" stroke="rgba(45,158,107,0.1)" strokeWidth="1" />
        ))}
        {outer.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
            stroke="rgba(45,158,107,0.08)" strokeWidth="1" />
        ))}
        <path d={toPath(outer)} fill="none" stroke="rgba(45,158,107,0.18)" strokeWidth="1" />
        <motion.path
          d={toPath(data)}
          fill="rgba(45,158,107,0.1)"
          stroke="#2D9E6B" strokeWidth="1.5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
        {data.map((p, i) => (
          <motion.circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5"
            fill={axes[i].value > 65 ? '#5DFFA8' : axes[i].value > 35 ? '#2D9E6B' : '#C47A5A'}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 300 }}
          />
        ))}
        {outer.map((p, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
          const lx = cx + (R + 20) * Math.cos(angle)
          const ly = cy + (R + 20) * Math.sin(angle)
          return (
            <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="8.5" fill={axes[i].value > 65 ? 'rgba(93,255,168,0.75)' : 'rgba(58,90,69,0.6)'}
              fontFamily="var(--font-jetbrains-mono)">
              {axes[i].label}
            </text>
          )
        })}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="21" fontWeight="700"
          fill="#D4EDE0" fontFamily="var(--font-sora)">{overall}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="7.5"
          fill="rgba(58,90,69,0.5)" fontFamily="var(--font-jetbrains-mono)" letterSpacing="0.12em">SCORE</text>
      </svg>

      <div className="w-full grid grid-cols-5 gap-1.5 px-2">
        {axes.map(ax => (
          <div key={ax.label} className="flex flex-col items-center gap-1">
            <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(45,158,107,0.1)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: ax.value > 65 ? '#5DFFA8' : ax.value > 35 ? '#2D9E6B' : '#C47A5A' }}
                initial={{ width: 0 }} animate={{ width: `${ax.value}%` }}
                transition={{ duration: 0.6, delay: 0.2 }} />
            </div>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '8px', color: 'rgba(58,90,69,0.55)' }}>
              {ax.value}
            </span>
          </div>
        ))}
      </div>
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

function AddBlockMenu({ onAdd, onClose }: { onAdd: (t: BlockType) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="absolute bottom-full mb-2 left-0 z-50 w-56 overflow-hidden"
      style={{ background: 'rgba(10,18,10,0.98)', border: '1px solid rgba(45,158,107,0.22)', borderRadius: '3px', backdropFilter: 'blur(20px)' }}
    >
      {BLOCK_MENU.map(item => (
        <button
          key={item.type}
          onClick={() => { onAdd(item.type); onClose() }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.025]"
          style={{ borderBottom: '1px solid rgba(45,158,107,0.06)' }}
        >
          <span style={{ color: BLOCK_META[item.type].color, fontSize: '13px', width: '16px', flexShrink: 0 }}>
            {BLOCK_META[item.type].icon}
          </span>
          <div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '10px', color: BLOCK_META[item.type].color, letterSpacing: '0.1em' }}>
              {BLOCK_META[item.type].label}
            </div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '9px', color: 'rgba(58,90,69,0.45)' }}>
              {item.desc}
            </div>
          </div>
        </button>
      ))}
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
  const controls = useDragControls()

  return (
    <Reorder.Item value={block} dragListener={false} dragControls={controls} className="select-none">
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="group relative mb-[2px]"
        style={{ background: meta.bg, borderLeft: `2px solid ${meta.color}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: '1px solid rgba(45,158,107,0.06)' }}>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '9.5px', color: meta.color, letterSpacing: '0.18em' }}>
            {meta.icon} {meta.label}
          </span>
          <div className="flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div onPointerDown={e => controls.start(e)}
              className="cursor-grab active:cursor-grabbing touch-none text-xs"
              style={{ color: 'rgba(58,90,69,0.35)' }} title="Drag to reorder">
              ⠿
            </div>
            <button onClick={onDelete} className="transition-opacity hover:opacity-70"
              style={{ color: 'rgba(196,122,90,0.55)', fontSize: '11px' }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {block.type === 'technique' ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(TECHNIQUES) as [TechniqueId, typeof TECHNIQUES[TechniqueId]][]).map(([id, tech]) => (
                  <button key={id} onClick={() => onChange({ ...block, techniqueId: id })}
                    className="text-[10px] px-2.5 py-1 transition-all"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      ...(block.techniqueId === id
                        ? { color: '#080D08', background: '#A8D4BA', border: '1px solid #A8D4BA' }
                        : { color: 'rgba(168,212,186,0.65)', background: 'rgba(168,212,186,0.05)', border: '1px solid rgba(168,212,186,0.18)' }
                      ),
                    }}>
                    {tech.label}
                  </button>
                ))}
              </div>
              {block.techniqueId && (
                <p style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '10.5px', color: 'rgba(168,212,186,0.5)', fontStyle: 'italic' }}>
                  → {TECHNIQUES[block.techniqueId].content}
                </p>
              )}
              {block.techniqueId && (
                <p style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '9px', color: 'rgba(168,212,186,0.35)' }}>
                  {TECHNIQUES[block.techniqueId].description}
                </p>
              )}
            </div>
          ) : block.type === 'example' ? (
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[9px] mb-1" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(196,164,90,0.45)', letterSpacing: '0.12em' }}>INPUT</div>
                <textarea className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none"
                  style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
                  rows={2} placeholder="Example input..."
                  value={block.exampleInput || ''}
                  onChange={e => onChange({ ...block, exampleInput: e.target.value })} />
              </div>
              <div className="h-px" style={{ background: 'rgba(196,164,90,0.08)' }} />
              <div>
                <div className="text-[9px] mb-1" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(196,164,90,0.45)', letterSpacing: '0.12em' }}>EXPECTED OUTPUT</div>
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
                    className="text-[10px] px-2.5 py-1 transition-all"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      ...(block.content === fmt
                        ? { color: '#080D08', background: '#7A8DC4', border: '1px solid #7A8DC4' }
                        : { color: 'rgba(122,141,196,0.65)', background: 'rgba(122,141,196,0.05)', border: '1px solid rgba(122,141,196,0.18)' }
                      ),
                    }}>
                    {fmt}
                  </button>
                ))}
              </div>
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

  const builderRef  = useRef<HTMLDivElement>(null)
  const addMenuRef  = useRef<HTMLDivElement>(null)

  useEffect(() => { setHistory(getHistory()) }, [])

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
    setTimeout(() => window.scrollBy({ top: 200, behavior: 'smooth' }), 120)
  }, [])

  const loadTemplate = (categoryId: string) => {
    const tmpl = BLOCK_TEMPLATES[categoryId]
    if (!tmpl) return
    setActiveCategory(categoryId)
    setBlocks(tmpl.map(b => ({ ...b, id: uid() })))
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
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

  const loadFromCrumb = () => {
    const vault = getVault()
    if (!vault.length) return
    setBlocks(prev => {
      const hasCtx = prev.some(b => b.type === 'context')
      if (hasCtx) return prev.map(b => b.type === 'context' ? { ...b, content: vault[0].content } : b)
      return [...prev, { id: uid(), type: 'context', content: vault[0].content }]
    })
  }

  const loadFromHistory = (entry: PromptEntry) => {
    if (entry.blocks?.length) {
      setBlocks(entry.blocks.map(b => ({ ...b, id: uid() })))
      setActiveCategory(entry.category)
    }
    setSidebarOpen(false)
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  const sevIcon  = { error: '⊘', warning: '⚠', tip: '○' }
  const sevColor = { error: '#C47A5A', warning: '#C4A45A', tip: '#5DFFA8' }

  return (
    <motion.main
      className="min-h-screen pb-28 overflow-x-hidden"
      style={{ background: '#080D08', color: '#D4EDE0', fontFamily: 'var(--font-dm-sans)' }}
      initial={{ filter: 'blur(18px)', opacity: 0 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 100 }}
    >
      <style>{`
        .c-scroll { scrollbar-color: rgba(45,158,107,0.15) transparent; scrollbar-width: thin; }
        .c-scroll::-webkit-scrollbar { width: 4px; }
        .c-scroll::-webkit-scrollbar-thumb { background: rgba(45,158,107,0.15); border-radius: 2px; }
      `}</style>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] right-[10%] w-[440px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(45,158,107,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[5%] w-[320px] h-[320px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(45,158,107,0.025) 0%, transparent 70%)' }} />
      </div>

      {/* ─── Nav ─── */}
      <nav className="relative z-20 flex justify-between items-center px-8 md:px-14 pt-8 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 relative">
            <Image src="/Craftv2.png" alt="Craft" fill className="object-contain" />
          </div>
          <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '13px' }}>
            <Link href="/" style={{ color: 'rgba(58,90,69,0.55)' }} className="hover:opacity-75 transition-opacity">
              CrumbCraft.
            </Link>
            <span style={{ color: 'rgba(58,90,69,0.25)' }}>/</span>
            <span style={{ color: '#D4EDE0', fontWeight: 600 }}>Craft</span>
          </div>
        </div>
        <Link href="/crumb"
          className="flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-90"
          style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12px', color: 'rgba(58,90,69,0.45)' }}>
          <div className="w-4 h-4 relative opacity-50">
            <Image src="/Crumbv2.png" alt="Crumb" fill className="object-contain"
              style={{ filter: 'hue-rotate(100deg) saturate(0.35)' }} />
          </div>
          <span>/ Crumb</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </nav>

      <div className="relative z-10 px-8 md:px-14 pt-3">

        {/* ─── Hero ─── */}
        <motion.section className="mb-10"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120, delay: 0.1 }}>
          <p className="mb-2.5 text-[11px] tracking-[0.22em]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#2D9E6B' }}>
            // compose · analyze · iterate
          </p>
          <h1 className="font-heading font-semibold leading-tight tracking-tight"
            style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.6rem)' }}>
            <span style={{ color: '#D4EDE0' }}>Prompt</span>{' '}
            <span style={{ color: '#2D9E6B' }}>Workshop</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(58,90,69,0.6)', maxWidth: '420px' }}>
            Build with technique blocks. Score with live DNA. Copy what actually works.
          </p>
        </motion.section>

        {/* ─── Template Strip ─── */}
        <section className="mb-10 -mx-8 md:-mx-14 px-8 md:px-14 overflow-x-auto">
          <div className="flex items-center gap-1.5 pb-1" style={{ minWidth: 'max-content' }}>
            <span className="flex-shrink-0 text-[9px] mr-2"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.38)', letterSpacing: '0.18em' }}>
              TEMPLATES
            </span>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => loadTemplate(cat.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] flex-shrink-0 transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                  ...(activeCategory === cat.id
                    ? { color: '#080D08', background: '#2D9E6B', border: '1px solid #2D9E6B' }
                    : { color: 'rgba(58,90,69,0.7)', background: 'rgba(45,158,107,0.04)', border: '1px solid rgba(45,158,107,0.14)' }
                  ),
                }}>
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Main Split ─── */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10" ref={builderRef}>

          {/* LEFT: Block Composer ── 55% */}
          <div className="lg:w-[55%]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-3.5 rounded-full" style={{ background: '#2D9E6B', opacity: 0.4 }} />
              <span className="text-[9.5px] uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.5)' }}>
                Blocks
              </span>
              <span className="text-[9px] ml-1"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.3)' }}>
                drag to reorder
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
            <div className="relative flex items-center gap-3 mt-1 py-3" ref={addMenuRef}>
              <AnimatePresence>
                {showAddMenu && (
                  <AddBlockMenu onAdd={addBlock} onClose={() => setShowAddMenu(false)} />
                )}
              </AnimatePresence>
              <button onClick={() => setShowAddMenu(v => !v)}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 transition-all"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                  color: showAddMenu ? '#2D9E6B' : 'rgba(58,90,69,0.55)',
                  border: `1px solid ${showAddMenu ? 'rgba(45,158,107,0.3)' : 'rgba(45,158,107,0.12)'}`,
                  background: showAddMenu ? 'rgba(45,158,107,0.06)' : 'transparent',
                }}>
                + Add Block <span style={{ opacity: 0.45, fontSize: '8px' }}>▼</span>
              </button>
              <button onClick={loadFromCrumb}
                className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-75"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(45,158,107,0.55)' }}>
                ⚡ Load from Crumb
              </button>
            </div>
          </div>

          {/* RIGHT: DNA + Linter + Preview ── 45% */}
          <div className="lg:w-[45%] flex flex-col gap-4">

            {/* Prompt DNA */}
            <div className="p-5" style={{ background: 'rgba(13,21,13,0.55)', border: '1px solid rgba(45,158,107,0.1)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-3.5 rounded-full" style={{ background: '#2D9E6B', opacity: 0.45 }} />
                <span className="text-[9.5px] uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.55)' }}>
                  Prompt DNA
                </span>
              </div>
              <PentagonDNA score={dna} />
            </div>

            {/* Linter */}
            <div className="p-5" style={{ background: 'rgba(13,21,13,0.45)', border: '1px solid rgba(45,158,107,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3.5 rounded-full" style={{ background: '#C47A5A', opacity: 0.45 }} />
                  <span className="text-[9.5px] uppercase tracking-widest"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.55)' }}>
                    Linter
                  </span>
                </div>
                {warnings.length === 0 && hasContent && (
                  <span className="text-[10px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#5DFFA8' }}>
                    ✓ clean
                  </span>
                )}
              </div>
              {warnings.length === 0 ? (
                <p className="text-[11px]"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: hasContent ? 'rgba(93,255,168,0.45)' : 'rgba(58,90,69,0.3)' }}>
                  {hasContent ? 'No issues detected.' : 'Fill in blocks to see analysis.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {warnings.map(w => (
                      <motion.div key={w.id}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                        className="flex items-start gap-2">
                        <span style={{ color: sevColor[w.severity], fontSize: '11px', flexShrink: 0, marginTop: '1px' }}>
                          {sevIcon[w.severity]}
                        </span>
                        <span className="text-[11px] leading-snug"
                          style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(212,237,224,0.6)' }}>
                          {w.message}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Assembled Preview */}
            <div className="p-5" style={{ background: 'rgba(13,21,13,0.55)', border: '1px solid rgba(45,158,107,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3.5 rounded-full" style={{ background: '#7A8DC4', opacity: 0.45 }} />
                  <span className="text-[9.5px] uppercase tracking-widest"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.55)' }}>
                    Assembled
                  </span>
                </div>
                <span className="text-[10px]"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.38)' }}>
                  {tokenCount} tok · {assembled.length} ch
                </span>
              </div>

              <div className="c-scroll overflow-y-auto mb-4" style={{ maxHeight: '260px', minHeight: '80px' }}>
                {hasContent ? (
                  <div className="flex flex-col gap-1">
                    {assembled.split('\n').filter(Boolean).map((line, i) => {
                      const isLabel = /^(You are|Context:|Format your|Constraints:|Example:|Think step|Before respond|After your|Rate your|Consider at)/.test(line)
                      return (
                        <p key={i} className="text-[12px] leading-relaxed"
                          style={{ fontFamily: 'var(--font-jetbrains-mono)', color: isLabel ? 'rgba(45,158,107,0.7)' : '#D4EDE0' }}>
                          {line}
                        </p>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.32)' }}>
                    Fill in blocks above to assemble your prompt...
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid rgba(45,158,107,0.07)' }}>
                <button onClick={handleCopy} disabled={!hasContent}
                  className="flex items-center gap-1.5 text-[11px] px-4 py-2 transition-all disabled:opacity-25"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                    color: copied ? '#5DFFA8' : '#D4EDE0',
                    background: copied ? 'rgba(93,255,168,0.07)' : 'rgba(45,158,107,0.1)',
                    border: `1px solid ${copied ? 'rgba(93,255,168,0.28)' : 'rgba(45,158,107,0.2)'}`,
                  }}>
                  {copied ? '✓ Copied' : 'Copy Prompt'}
                </button>
                <button onClick={handleExport} disabled={!hasContent}
                  className="text-[11px] px-3 py-2 transition-all disabled:opacity-25"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                    color: 'rgba(58,90,69,0.65)', border: '1px solid rgba(45,158,107,0.12)', background: 'transparent',
                  }}>
                  Export .txt
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── History Trigger ─── */}
      <button onClick={() => setSidebarOpen(v => !v)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all"
        style={{
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: '9px', letterSpacing: '0.18em',
          color: sidebarOpen ? '#2D9E6B' : 'rgba(58,90,69,0.5)',
          background: 'rgba(13,21,13,0.92)',
          borderLeft: `1px solid ${sidebarOpen ? 'rgba(45,158,107,0.28)' : 'rgba(45,158,107,0.1)'}`,
          borderTop: '1px solid rgba(45,158,107,0.1)', borderBottom: '1px solid rgba(45,158,107,0.1)',
          writingMode: 'vertical-lr', padding: '12px 6px', backdropFilter: 'blur(12px)',
        }}>
        [H] history
      </button>

      {/* ─── History Sidebar ─── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-30 w-72 c-scroll overflow-y-auto"
            style={{ background: 'rgba(10,18,10,0.97)', borderLeft: '1px solid rgba(45,158,107,0.15)', backdropFilter: 'blur(20px)' }}>
            <div className="p-5 pt-16">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.6)' }}>
                  Prompt History
                </span>
                <button onClick={() => setSidebarOpen(false)} className="transition-opacity hover:opacity-60"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12px', color: 'rgba(58,90,69,0.5)' }}>
                  ✕
                </button>
              </div>
              {history.length === 0 ? (
                <p className="text-[11px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.38)' }}>
                  No saved prompts yet.<br /><br />Copy a prompt to save it here.
                </p>
              ) : (
                <div className="flex flex-col">
                  {history.slice(0, 15).map((entry, i) => (
                    <motion.button key={entry.id} onClick={() => loadFromHistory(entry)}
                      className="text-left p-3 transition-all w-full hover:bg-white/[0.02]"
                      style={{ borderBottom: '1px solid rgba(45,158,107,0.07)' }}
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.035 }}>
                      <p className="text-xs leading-relaxed mb-1.5 line-clamp-2"
                        style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}>
                        {entry.assembled.slice(0, 75)}...
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5"
                          style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#2D9E6B', border: '1px solid rgba(45,158,107,0.2)', background: 'rgba(45,158,107,0.05)' }}>
                          {entry.category}
                        </span>
                        <span className="text-[9px]"
                          style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.45)' }}>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                        {entry.blocks?.length && (
                          <span className="text-[9px] ml-auto"
                            style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(58,90,69,0.32)' }}>
                            {entry.blocks.length} blocks
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Dock ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', damping: 30, stiffness: 200 }}
          className="flex items-center gap-1 px-2 py-2"
          style={{
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            background: 'rgba(8,13,8,0.8)', borderRadius: '20px', border: '1px solid rgba(45,158,107,0.1)',
          }}>
          <button onClick={() => builderRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(58,90,69,0.65)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2D9E6B')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(58,90,69,0.65)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span className="hidden sm:inline">Builder</span>
          </button>

          <div className="w-px h-5" style={{ background: 'rgba(45,158,107,0.14)' }} />

          <button onClick={() => setSidebarOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: sidebarOpen ? '#2D9E6B' : 'rgba(58,90,69,0.65)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2D9E6B')}
            onMouseLeave={e => (e.currentTarget.style.color = sidebarOpen ? '#2D9E6B' : 'rgba(58,90,69,0.65)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="hidden sm:inline">History</span>
          </button>
        </motion.div>
      </div>

    </motion.main>
  )
}
