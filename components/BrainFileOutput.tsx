'use client'

import { useState } from 'react'

interface Props {
  content: string
  originalContent?: string
  confidenceData?: {
    confidence: number
    breakdown: {
      goals_captured: number
      decisions_preserved: number
      technical_context: number
      constraints_noted: number
    }
    sections_filled: number
    key_topics_found: number
  } | null
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

export default function BrainFileOutput({ content, originalContent, confidenceData }: Props) {
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'cards' | 'diff' | 'raw'>('cards')

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

  const highlightTags = (text: string) => {
    // Regex matches [Tag]
    const parts = text.split(/(\[Decision\]|\[Goal\]|\[Code\]|\[Constraint\])/g)
    return parts.map((part, i) => {
      switch (part) {
        case '[Decision]': return <span key={i} className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold mx-1">DECISION</span>
        case '[Goal]': return <span key={i} className="text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold mx-1">GOAL</span>
        case '[Code]': return <span key={i} className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold mx-1">CODE</span>
        case '[Constraint]': return <span key={i} className="text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold mx-1">CONSTRAINT</span>
        default: return part
      }
    })
  }

  const parseExtractedTags = (text: string) => {
    const items: { tag: string; type: string; text: string }[] = [];
    const lines = text.split('\n');
    const tagRegex = /\[(Decision|Goal|Code|Constraint)\]/i;

    for (const line of lines) {
      const match = line.match(tagRegex);
      if (match) {
        const type = match[1].toUpperCase();
        let tagColor = '';
        if (type === 'DECISION') tagColor = 'emerald';
        if (type === 'GOAL') tagColor = 'purple';
        if (type === 'CODE') tagColor = 'blue';
        if (type === 'CONSTRAINT') tagColor = 'orange';

        const cleanText = line.replace(/^[*\-]\s*/, '').replace(tagRegex, '').trim();
        items.push({ tag: type, type: tagColor, text: cleanText });
      }
    }
    return items;
  };

  const renderOriginalText = (original: string, extractedText: string) => {
    const importantWords = new Set<string>();
    extractedText.toLowerCase().split(/\W+/).forEach(w => {
      if (w.length > 5) importantWords.add(w);
    });

    const lines = original.split('\n');
    return lines.map((line, idx) => {
      if (!line.trim()) return <div key={idx} className="h-2" />;

      let matchCount = 0;
      line.toLowerCase().split(/\W+/).forEach(w => {
        if (importantWords.has(w)) matchCount++;
      });

      const isSpeaker = /^(user|ai|human|assistant):/i.test(line);
      const isImportant = isSpeaker || (matchCount >= 2);
      const isCrossedOut = !isImportant && line.length > 30;

      let textContent = line;
      let speakerNode = null;
      if (isSpeaker) {
        const match = line.match(/^(user|ai|human|assistant):\s*/i);
        if (match) {
          speakerNode = <span className="text-primary-blue font-bold opacity-80">{match[0]}</span>;
          textContent = line.slice(match[0].length);
        }
      }

      return (
        <div key={idx} className={`leading-loose transition-all duration-300 ${isImportant ? 'text-text-bright/90' : isCrossedOut ? 'text-muted/30 line-through decoration-muted/20 decoration-2' : 'text-muted/50'}`}>
          {speakerNode}{textContent}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Confidence Score */}
      {confidenceData && (
        <div className="rounded-2xl border border-border-ocean bg-surface p-6 flex flex-col sm:flex-row items-center gap-6">
          {/* Radial Score */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="rgba(6,182,212,0.1)" strokeWidth="6" fill="none" />
              <circle
                cx="50" cy="50" r="42"
                stroke="url(#confidenceGradient)"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${confidenceData.confidence * 2.64} 264`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-heading font-bold text-text-bright">{confidenceData.confidence}%</span>
              <span className="text-[9px] text-muted font-mono uppercase tracking-widest">Confidence</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 w-full flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-heading font-semibold text-text-bright">Crumb Confidence Score</span>
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted">
                <span>{confidenceData.sections_filled}/7 sections</span>
                <span>{confidenceData.key_topics_found} topics</span>
              </div>
            </div>
            {[
              { label: 'Goals Captured', value: confidenceData.breakdown.goals_captured, color: '#A855F7' },
              { label: 'Decisions Preserved', value: confidenceData.breakdown.decisions_preserved, color: '#10B981' },
              { label: 'Technical Context', value: confidenceData.breakdown.technical_context, color: '#3B82F6' },
              { label: 'Constraints Noted', value: confidenceData.breakdown.constraints_noted, color: '#F97316' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-[10px] text-muted font-mono w-[140px] flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="text-[10px] font-mono text-text-bright w-8 text-right">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {originalContent && (
              <button
                onClick={() => setView('diff')}
                className={`px-3 py-1.5 transition ${view === 'diff' ? 'bg-primary text-[#020B12] font-semibold' : 'text-muted hover:text-text-main hover:bg-surface'}`}
              >
                Diff
              </button>
            )}
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
                {highlightTags(extractSection(section.key))}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Diff view */}
      {view === 'diff' && originalContent && (
        <div className="rounded-xl border border-border-ocean bg-[#0A101A] overflow-hidden flex flex-col shadow-2xl">
          {/* Top Bar */}
          <div className="p-6 border-b border-border-ocean/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface/30">
            <div>
              <h3 className="text-xl font-heading text-text-bright font-semibold tracking-wide">Semantic Compression Map</h3>
              <p className="text-sm text-muted font-mono mt-1">See exactly what the AI decided to keep</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full border border-purple-500/30 text-purple-400 text-[10px] font-bold tracking-widest bg-purple-500/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> GOAL
              </span>
              <span className="px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-widest bg-emerald-500/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> DECISION
              </span>
              <span className="px-3 py-1 rounded-full border border-blue-500/30 text-blue-400 text-[10px] font-bold tracking-widest bg-blue-500/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> CODE
              </span>
              <span className="px-3 py-1 rounded-full border border-orange-500/30 text-orange-400 text-[10px] font-bold tracking-widest bg-orange-500/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> CONSTRAINT
              </span>
            </div>
          </div>

          {/* Split Panes */}
          <div className="flex flex-col md:flex-row h-[600px] overflow-hidden">
            {/* Left Pane */}
            <div className="flex-1 border-r border-border-ocean/50 flex flex-col bg-background/50">
              <div className="p-4 flex items-center gap-2 border-b border-border-ocean/20">
                <span className="w-2 h-2 rounded-sm bg-muted transform rotate-45" />
                <span className="text-xs font-mono text-muted uppercase tracking-widest font-semibold flex-1">Original Conversation</span>
              </div>
              <div className="p-6 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1">
                {renderOriginalText(originalContent, content)}
              </div>
            </div>

            {/* Right Pane */}
            <div className="flex-1 flex flex-col bg-[#060D14] relative">
              <div className="p-4 flex items-center gap-2 border-b border-border-ocean/20 border-l border-primary/10">
                <span className="w-2 h-2 rounded-sm bg-primary transform rotate-45 animate-pulse" />
                <span className="text-xs font-mono text-primary uppercase tracking-widest font-semibold">What Survived</span>
              </div>
              <div className="p-8 overflow-y-auto border-l border-primary/10 h-full">
                <div className="flex flex-col gap-6">
                  {parseExtractedTags(content).map((item, i) => {
                    let colorClass = '';
                    let badgeClass = '';
                    let bulletClass = '';

                    if (item.type === 'emerald') { colorClass = 'border-emerald-500/40'; badgeClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'; bulletClass = 'bg-emerald-500 shadow-emerald-500/50'; }
                    if (item.type === 'purple') { colorClass = 'border-purple-500/40'; badgeClass = 'text-purple-400 border-purple-500/30 bg-purple-500/10'; bulletClass = 'bg-purple-400 shadow-purple-500/50'; }
                    if (item.type === 'blue') { colorClass = 'border-blue-500/40'; badgeClass = 'text-blue-400 border-blue-500/30 bg-blue-500/10'; bulletClass = 'bg-blue-400 shadow-blue-500/50'; }
                    if (item.type === 'orange') { colorClass = 'border-orange-500/40'; badgeClass = 'text-orange-400 border-orange-500/30 bg-orange-500/10'; bulletClass = 'bg-orange-400 shadow-orange-500/50'; }

                    return (
                      <div key={i} className="relative pl-6 py-2">
                        <div className={`absolute left-0 top-0 bottom-0 w-3 border-l-[3px] border-y-[1px] rounded-l opacity-70 ${colorClass}`} style={{ borderRight: 'none' }} />
                        <div className={`absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${bulletClass} shadow-[0_0_8px_currentColor]`} />

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 ml-2">
                          <span className={`px-2 py-1 flex-shrink-0 rounded-full border text-[9px] font-bold tracking-widest uppercase ${badgeClass} inline-flex items-center justify-center`}>
                            {item.tag}
                          </span>
                          <span className="text-[13px] font-mono text-[#E4ECEF] leading-relaxed tracking-wide">
                            {item.text}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {parseExtractedTags(content).length === 0 && (
                    <div className="text-muted text-xs font-mono italic text-center mt-10">
                      No tagged elements found... Either wait for completion or check Cards view.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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