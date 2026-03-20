import type { LucideIcon } from 'lucide-react'

export type BlockType = 'persona' | 'objective' | 'context' | 'technique' | 'example' | 'constraint' | 'format'
export type TechniqueId = 'chain-of-thought' | 'self-check' | 'adversarial' | 'confidence' | 'contrastive'
export type Severity = 'error' | 'warning' | 'tip'

export interface Block {
  id: string
  type: BlockType
  content: string
  techniqueId?: TechniqueId
  exampleInput?: string
  exampleOutput?: string
}

export interface LinterWarning {
  id: string
  severity: Severity
  message: string
}

export interface DNAScore {
  clarity: number
  specificity: number
  structure: number
  context: number
  guardrails: number
}

export interface PromptEntry {
  id: string
  assembled: string
  blocks: Block[]
  category: string
  createdAt: number
}

export interface BlockMeta {
  label: string
  color: string
  bg: string
  placeholder: string
  Icon: LucideIcon
}
