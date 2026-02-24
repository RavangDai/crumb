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
  { emoji: '🎯', key: 'MISSION', ghostLabel: 'MISSION', accentColor: 'rgba(6,182,212,0.04)', accentBorder: '#06B6D4', accentGlow: 'rgba(6,182,212,0.06)' },
  { emoji: '📍', key: 'CURRENT STATE', ghostLabel: 'STATE', accentColor: 'rgba(59,130,246,0.04)', accentBorder: '#3B82F6', accentGlow: 'rgba(59,130,246,0.06)' },
  { emoji: '✅', key: 'DECISIONS MADE', ghostLabel: 'DECISIONS', accentColor: 'rgba(16,185,129,0.04)', accentBorder: '#10B981', accentGlow: 'rgba(16,185,129,0.06)' },
  { emoji: '❌', key: 'DEAD ENDS', ghostLabel: 'DEAD ENDS', accentColor: 'rgba(239,68,68,0.03)', accentBorder: '#EF4444', accentGlow: 'rgba(239,68,68,0.05)' },
  { emoji: '🧩', key: 'KEY CONTEXT', ghostLabel: 'CONTEXT', accentColor: 'rgba(168,85,247,0.04)', accentBorder: '#A855F7', accentGlow: 'rgba(168,85,247,0.06)' },
  { emoji: '❓', key: 'OPEN QUESTIONS', ghostLabel: 'QUESTIONS', accentColor: 'rgba(245,158,11,0.04)', accentBorder: '#F59E0B', accentGlow: 'rgba(245,158,11,0.06)' },
  { emoji: '🚀', key: 'NEXT STEP', ghostLabel: 'NEXT', accentColor: 'rgba(6,182,212,0.04)', accentBorder: '#06B6D4', accentGlow: 'rgba(6,182,212,0.06)' },
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
    const parts = text.split(/(\[Decision\]|\[Goal\]|\[Code\]|\[Constraint\])/g)
    return parts.map((part, i) => {
      switch (part) {
        case '[Decision]': return <span key={i} className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold mx-1 uppercase tracking-wider">Decision</span>
        case '[Goal]': return <span key={i} className="text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold mx-1 uppercase tracking-wider">Goal</span>
        case '[Code]': return <span key={i} className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold mx-1 uppercase tracking-wider">Code</span>
        case '[Constraint]': return <span key={i} className="text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold mx-1 uppercase tracking-wider">Constraint</span>
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
          speakerNode = <span className="text-primary-blue font-bold opacity-70">{match[0]}</span>;
          textContent = line.slice(match[0].length);
        }
      }

      return (
        <div key={idx} className={`leading-loose transition-all duration-300 ${isImportant ? 'text-text-bright/70' : isCrossedOut ? 'text-muted/25 line-through decoration-muted/15 decoration-1' : 'text-muted/40'}`}>
          {speakerNode}{textContent}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col gap-0 relative">

      {/* ─── Confidence Score — layered depth background ─── */}
      {confidenceData && (
        <div
          className="relative flex flex-col sm:flex-row items-start gap-8 py-10 px-8 -mx-6"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #061420 15%, #0A1E2E 50%, #061420 85%, transparent 100%)',
          }}
        >
          {/* Ink bleed glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 15% 50%, rgba(6,182,212,0.05) 0%, transparent 50%)',
          }} />

          {/* Radial Score */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="rgba(6,182,212,0.08)" strokeWidth="5" fill="none" />
              <circle
                cx="50" cy="50" r="42"
                stroke="url(#confidenceGradient)"
                strokeWidth="5"
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
              <span className="text-xl font-heading font-bold text-text-bright">{confidenceData.confidence}%</span>
              <span className="text-[8px] text-muted font-mono uppercase tracking-widest">Confidence</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 w-full flex flex-col gap-3 relative z-10">
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
                <div className="flex-1 h-1 bg-border-ocean/20 rounded-full overflow-hidden">
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

      {/* ─── Output header — newspaper column style ─── */}
      <div className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs text-primary font-heading font-bold">C.</div>
          <div>
            <p className="text-sm font-semibold text-text-bright font-heading">Crumb File Ready</p>
            <p className="text-[11px] text-muted font-mono">{wordCount} words · Portable memory snapshot</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex text-xs font-mono">
            <button
              onClick={() => setView('cards')}
              className={`px-3 py-1.5 transition border-b-2 ${view === 'cards' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted hover:text-text-main'}`}
            >
              Document
            </button>
            {originalContent && (
              <button
                onClick={() => setView('diff')}
                className={`px-3 py-1.5 transition border-b-2 ${view === 'diff' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted hover:text-text-main'}`}
              >
                Diff
              </button>
            )}
            <button
              onClick={() => setView('raw')}
              className={`px-3 py-1.5 transition border-b-2 ${view === 'raw' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted hover:text-text-main'}`}
            >
              Raw
            </button>
          </div>
          <div className="w-px h-5 bg-border-ocean/20 mx-1" />
          <button onClick={handleCopy} className="text-xs px-3 py-1.5 text-muted hover:text-primary transition font-mono">
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button onClick={handleDownload} className="text-xs px-3 py-1.5 text-muted hover:text-primary transition font-mono">
            ⬇ .md
          </button>
        </div>
      </div>

      {/* Full-width thin rule — newspaper style */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border-ocean to-transparent" />

      {/* ─── Document view — atmospheric design ─── */}
      {view === 'cards' && (
        <div className="flex flex-col -mx-6">
          {SECTIONS.map((section, idx) => {
            const sectionContent = extractSection(section.key)
            if (sectionContent === 'No content extracted.') return null

            return (
              <div
                key={section.key}
                className="relative overflow-hidden"
                style={{
                  // Layered depth — fades in and out, no hard edges
                  background: idx % 2 === 0
                    ? 'linear-gradient(180deg, transparent 0%, #061420 20%, #061420 80%, transparent 100%)'
                    : 'linear-gradient(180deg, transparent 0%, #0A1E2E 20%, #0A1E2E 80%, transparent 100%)',
                }}
              >
                {/* Stained glass color wash — section-specific atmospheric tint */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${section.accentColor} 0%, transparent 60%)`,
                  }}
                />

                {/* Ink bleed radial glow — content feels lit from within */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 20% 50%, ${section.accentGlow} 0%, transparent 60%)`,
                  }}
                />

                {/* Ghost typography layer — massive faded section name */}
                <span
                  className="absolute top-1/2 -translate-y-1/2 right-6 font-heading font-bold text-[100px] leading-none select-none pointer-events-none whitespace-nowrap"
                  style={{ color: section.accentBorder, opacity: 0.03 }}
                >
                  {section.ghostLabel}
                </span>

                {/* Content with left accent border */}
                <div className="relative py-8 px-8">
                  <div className="flex gap-6">
                    {/* Left accent border — the only structural line */}
                    <div
                      className="w-[3px] flex-shrink-0 rounded-full"
                      style={{ backgroundColor: section.accentBorder, opacity: 0.4 }}
                    />

                    <div className="flex-1 min-w-0">
                      {/* Section header — newspaper column style */}
                      <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-base">{section.emoji}</span>
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.2em] font-mono"
                          style={{ color: section.accentBorder }}
                        >
                          {section.key}
                        </span>
                      </div>

                      {/* Thin rule under header */}
                      <div
                        className="w-16 h-px mb-4"
                        style={{ backgroundColor: section.accentBorder, opacity: 0.2 }}
                      />

                      {/* Content — text breathes freely */}
                      <div className="text-sm text-text-bright/90 leading-[1.8] whitespace-pre-wrap font-mono">
                        {highlightTags(sectionContent)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Diff view — asymmetric 40/60 split ─── */}
      {view === 'diff' && originalContent && (
        <div className="flex flex-col gap-6 mt-6">
          {/* Full-bleed title — left aligned */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-heading text-text-bright font-semibold">Semantic Compression Map</h3>
              <p className="text-xs text-muted font-mono mt-1">See exactly what the AI decided to keep</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'GOAL', color: 'purple' },
                { label: 'DECISION', color: 'emerald' },
                { label: 'CODE', color: 'blue' },
                { label: 'CONSTRAINT', color: 'orange' },
              ].map(t => (
                <span key={t.label} className={`px-2.5 py-1 text-${t.color}-400 text-[9px] font-bold tracking-widest flex items-center gap-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-${t.color}-400`} /> {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Asymmetric split — 40% / 60%, shifted left for organic feel */}
          <div className="relative flex flex-col md:flex-row h-[600px] overflow-hidden" style={{ marginLeft: '-3%', marginRight: '-5%' }}>
            {/* Pinned margin label — ORIGINAL, sits outside content flow */}
            <div className="hidden md:block absolute top-16 -left-1 z-10" style={{ writingMode: 'vertical-lr' }}>
              <span className="text-[9px] font-mono text-muted/40 uppercase tracking-[0.3em] rotate-180" style={{ transform: 'rotate(180deg)' }}>Original Conversation</span>
            </div>

            {/* Left Pane — 40% width, ghost text */}
            <div
              className="md:w-[40%] flex flex-col relative opacity-50"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, #061420 20%, #061420 80%, transparent 100%)',
              }}
            >
              <div className="py-3 px-6 flex items-center gap-2 md:hidden">
                <span className="w-1.5 h-1.5 rounded-sm bg-muted/50 transform rotate-45" />
                <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Original Conversation</span>
              </div>
              <div className="px-8 pr-6 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 pt-3">
                {renderOriginalText(originalContent, content)}
              </div>
            </div>

            {/* Pinned margin label — SURVIVED, sits outside content flow */}
            <div className="hidden md:block absolute top-16 z-10" style={{ left: '40%', marginLeft: '-12px', writingMode: 'vertical-lr' }}>
              <span className="text-[9px] font-mono text-primary/60 uppercase tracking-[0.3em] font-semibold" style={{ transform: 'rotate(180deg)' }}>What Survived</span>
            </div>

            {/* Right Pane — 60% width, vivid with ink bleed glow */}
            <div
              className="md:w-[60%] flex flex-col relative"
              style={{
                background: 'radial-gradient(ellipse at 25% 40%, rgba(6,182,212,0.04) 0%, transparent 60%)',
              }}
            >
              {/* Whisper edge */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary/25 via-primary/10 to-transparent" />

              <div className="py-3 pl-8 flex items-center gap-2 md:hidden">
                <span className="w-1.5 h-1.5 rounded-sm bg-primary transform rotate-45 animate-pulse" />
                <span className="text-[10px] font-mono text-primary uppercase tracking-widest font-semibold">What Survived</span>
              </div>
              <div className="pl-8 pr-6 overflow-y-auto h-full pt-3">
                <div className="flex flex-col gap-5">
                  {parseExtractedTags(content).map((item, i) => {
                    let borderColor = '';
                    let badgeClass = '';
                    let dotClass = '';
                    let glowColor = '';

                    if (item.type === 'emerald') { borderColor = 'border-emerald-500/40'; badgeClass = 'text-emerald-400'; dotClass = 'bg-emerald-500'; glowColor = 'rgba(16,185,129,0.06)'; }
                    if (item.type === 'purple') { borderColor = 'border-purple-500/40'; badgeClass = 'text-purple-400'; dotClass = 'bg-purple-400'; glowColor = 'rgba(168,85,247,0.06)'; }
                    if (item.type === 'blue') { borderColor = 'border-blue-500/40'; badgeClass = 'text-blue-400'; dotClass = 'bg-blue-400'; glowColor = 'rgba(59,130,246,0.06)'; }
                    if (item.type === 'orange') { borderColor = 'border-orange-500/40'; badgeClass = 'text-orange-400'; dotClass = 'bg-orange-400'; glowColor = 'rgba(245,158,11,0.06)'; }

                    return (
                      <div
                        key={i}
                        className={`relative pl-5 border-l-[3px] ${borderColor} py-2`}
                        style={{
                          background: `radial-gradient(ellipse at 0% 50%, ${glowColor} 0%, transparent 70%)`,
                        }}
                      >
                        <div className={`absolute left-[-6px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${dotClass} shadow-[0_0_8px_currentColor]`} />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <span className={`text-[9px] font-bold tracking-widest uppercase ${badgeClass} flex-shrink-0`}>
                            {item.tag}
                          </span>
                          <span className="text-[13px] font-mono text-text-bright leading-relaxed">
                            {item.text}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {parseExtractedTags(content).length === 0 && (
                    <div className="text-muted text-xs font-mono italic mt-10">
                      No tagged elements found... Check Document view.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Raw view — newspaper style ─── */}
      {view === 'raw' && (
        <div className="relative mt-6 -mx-6 py-8 px-8" style={{
          background: 'linear-gradient(180deg, transparent 0%, #061420 15%, #0A1E2E 50%, #061420 85%, transparent 100%)',
        }}>
          {/* Ink bleed */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 10% 30%, rgba(6,182,212,0.04) 0%, transparent 50%)',
          }} />
          <div className="flex gap-6 relative z-10">
            <div className="w-[3px] flex-shrink-0 rounded-full bg-primary/30" />
            <pre className="text-xs text-text-main whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
              {content}
            </pre>
          </div>
        </div>
      )}

      {/* ─── Usage tip — thin rule separator ─── */}
      <div className="mt-6">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border-ocean to-transparent mb-4" />
        <p className="text-xs text-muted leading-relaxed font-mono">
          💡 Start your next chat with: <span className="text-text-main italic">&quot;Here&apos;s context from my previous work: [paste crumb file]&quot;</span>
        </p>
      </div>

    </div>
  )
}