import {
  UserCircle2, Crosshair, BookOpen, Zap, ArrowLeftRight, ShieldOff, LayoutTemplate,
} from 'lucide-react'
import type { BlockType, TechniqueId, BlockMeta } from './types'

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  persona:    { label: 'PERSONA',    color: '#2D9E6B', bg: 'rgba(45,158,107,0.07)',  placeholder: 'senior [LANGUAGE] developer with 10+ years of experience', Icon: UserCircle2 },
  objective:  { label: 'OBJECTIVE',  color: '#5DFFA8', bg: 'rgba(93,255,168,0.04)',  placeholder: 'Review this code for bugs, performance issues, and best practices', Icon: Crosshair },
  context:    { label: 'CONTEXT',    color: '#8DB89A', bg: 'rgba(141,184,154,0.04)', placeholder: 'Relevant background, code snippets, or details...', Icon: BookOpen },
  technique:  { label: 'TECHNIQUE',  color: '#A8D4BA', bg: 'rgba(168,212,186,0.04)', placeholder: '', Icon: Zap },
  example:    { label: 'EXAMPLE',    color: '#C4A45A', bg: 'rgba(196,164,90,0.04)',  placeholder: '', Icon: ArrowLeftRight },
  constraint: { label: 'CONSTRAINT', color: '#C47A5A', bg: 'rgba(196,122,90,0.05)',  placeholder: 'Critical issues first. No praise. Max 3 bullet points.', Icon: ShieldOff },
  format:     { label: 'FORMAT',     color: '#7A8DC4', bg: 'rgba(122,141,196,0.05)', placeholder: 'Describe output structure...', Icon: LayoutTemplate },
}

export const TECHNIQUES: Record<TechniqueId, { label: string; description: string; content: string }> = {
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

export const FORMAT_CHIPS = ['Bullet List', 'JSON', 'Step-by-step', 'Essay', 'Table', 'Code Block', 'Markdown']

export const AXIS_TOOLTIPS = [
  'How free of vague or ambiguous language your prompt is',
  'How precise and concrete your instructions and targets are',
  'Whether the desired output format is clearly defined',
  'How much relevant background context is provided',
  'Whether rules, limits, and constraints are explicitly set',
]
