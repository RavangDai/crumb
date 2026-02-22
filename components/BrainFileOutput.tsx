'use client'

import { useState } from 'react'

interface Props {
  content: string
}

const SECTIONS = [
  { emoji: '🎯', key: 'MISSION' },
  { emoji: '📍', key: 'CURRENT STATE' },
  { emoji: '✅', key: 'DECISIONS MADE' },
  { emoji: '❌', key: 'DEAD ENDS' },
  { emoji: '🧩', key: 'KEY CONTEXT' },
  { emoji: '❓', key: 'OPEN QUESTIONS' },
  { emoji: '🚀', key: 'NEXT STEP' },
]

export default function BrainFileOutput({ content }: Props) {
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'cards' | 'raw'>('cards')

  const wordCount = content.trim().split(/\s+/).length

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crumb-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const extractSection = (sectionKey: string): string => {
    const lines = content.split('\n')
    let capturing = false
    let result: string[] = []

    for (const line of lines) {
      if (line.includes(sectionKey)) { capturing = true; continue }
      if (capturing && line.startsWith('## ')) break
      if (capturing && line.trim()) result.push(line)
    }

    return result.join('\n').trim() || 'No content extracted.'
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Output header */}
      <div className="rounded-2xl border border-border-ocean bg-surface p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(6,182,212,0.15)] text-primary font-heading font-bold">C.</div>
          <div>
            <p className="text-sm font-semibold text-text-bright font-heading">Crumb File Ready</p>
            <p className="text-xs text-muted font-mono">{wordCount} words · Portable memory snapshot</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-ocean/50 overflow-hidden text-xs font-mono">
            <button
              onClick={() => setView('cards')}
              className={`px-3 py-1.5 transition ${view === 'cards' ? 'bg-primary text-[#020B12] font-semibold' : 'text-muted hover:text-text-main hover:bg-surface'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setView('raw')}
              className={`px-3 py-1.5 transition ${view === 'raw' ? 'bg-primary text-[#020B12] font-semibold' : 'text-muted hover:text-text-main hover:bg-surface'}`}
            >
              Raw
            </button>
          </div>
          <button onClick={handleCopy} className="text-xs px-3 py-1.5 rounded-lg border border-border-ocean/50 text-text-main hover:border-primary/50 hover:text-primary transition font-mono">
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button onClick={handleDownload} className="text-xs px-3 py-1.5 rounded-lg border border-border-ocean/50 text-text-main hover:border-primary/50 hover:text-primary transition font-mono">
            ⬇ .md
          </button>
        </div>
      </div>

      {/* Cards view */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 gap-3">
          {SECTIONS.map((section) => (
            <div key={section.key} className="rounded-xl border border-border-ocean/50 bg-surface p-4 flex flex-col gap-2 transition hover:border-border-ocean">
              <div className="flex items-center gap-2">
                <span className="text-base drop-shadow-[0_0_4px_rgba(6,182,212,0.3)]">{section.emoji}</span>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest font-heading">{section.key}</span>
              </div>
              <p className="text-sm text-text-bright leading-relaxed whitespace-pre-wrap font-mono">
                {extractSection(section.key)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Raw view */}
      {view === 'raw' && (
        <div className="rounded-xl border border-border-ocean/50 bg-background p-4 max-h-96 overflow-y-auto">
          <pre className="text-xs text-text-main whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        </div>
      )}

      {/* Usage tip */}
      <div className="rounded-xl border border-border-ocean/50 bg-surface px-4 py-3 text-xs text-muted leading-relaxed font-mono">
        💡 Start your next chat with: <span className="text-text-main italic">"Here's context from my previous work: [paste crumb file]"</span>
      </div>

    </div>
  )
}