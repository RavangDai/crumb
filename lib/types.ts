export interface ConfidenceData {
  confidence: number
  breakdown: {
    goals_captured: number
    decisions_preserved: number
    technical_context: number
    constraints_noted: number
  }
  sections_filled: number
  key_topics_found: number
}

export interface VaultEntry {
  id: string
  createdAt: number
  title: string
  content: string
  crumbWordCount: number
  confidence: number | null
  confidenceData: ConfidenceData | null
  depth: string
}
