'use client'

import { useState } from 'react'
import Image from 'next/image'
import ConversationInput from '@/components/ConversationInput'
import BrainFileOutput from '@/components/BrainFileOutput'
import CompressionVisualizer from '@/components/CompressionVisualizer'
import WaveBackground from '@/components/WaveBackground'
import VaultModal from '@/components/VaultModal'
import { CompressionDepth } from '@/lib/prompt'
import { ConfidenceData, VaultEntry } from '@/lib/types'
import { saveToVault, extractVaultTitle } from '@/lib/vault'

const MIN_WORDS = 30

export default function Home() {
  const [conversation, setConversation] = useState('')
  const [crumbFile, setCrumbFile] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedServer, setSelectedServer] = useState<number>(1)
  const [compressionDepth, setCompressionDepth] = useState<CompressionDepth>('memory')
  const [confidenceData, setConfidenceData] = useState<ConfidenceData | null>(null)

  // Vault
  const [showVault, setShowVault] = useState(false)

  // Rolling context
  const [showUpdateInput, setShowUpdateInput] = useState(false)
  const [newConversation, setNewConversation] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')

  const parseConfidence = (raw: string): ConfidenceData | null => {
    try {
      const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) return JSON.parse(jsonMatch[1])
    } catch { /* ignore */ }
    return null
  }

  const stripConfidenceJson = (raw: string) => {
    return raw.replace(/```json\s*[\s\S]*?```/, '').trim()
  }

  const applyResult = (raw: string) => {
    const confidence = parseConfidence(raw)
    const stripped = stripConfidenceJson(raw)
    setConfidenceData(confidence)
    setCrumbFile(stripped)
    return { confidence, stripped }
  }

  const handleCompress = async () => {
    if (!conversation.trim()) return

    const words = conversation.trim().split(/\s+/).filter(Boolean)
    if (words.length < MIN_WORDS) {
      setError(`Too short — paste a real AI conversation (at least ${MIN_WORDS} words). Short inputs get expanded, not compressed.`)
      return
    }

    setIsLoading(true)
    setError('')
    setCrumbFile('')
    setConfidenceData(null)
    setShowUpdateInput(false)
    setNewConversation('')

    try {
      const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation, server: selectedServer, depth: compressionDepth }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      const { confidence, stripped } = applyResult(data.crumbFile)

      // Auto-save to vault
      const originalWords = words.length
      const crumbWords = stripped.trim().split(/\s+/).filter(Boolean).length
      saveToVault({
        title: extractVaultTitle(stripped),
        content: stripped,
        crumbWordCount: crumbWords,
        confidence: confidence?.confidence ?? null,
        confidenceData: confidence,
        depth: compressionDepth,
      })

      scrollToOutput()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCrumb = async () => {
    const words = newConversation.trim().split(/\s+/).filter(Boolean)
    if (words.length < 10) {
      setUpdateError('Add at least 10 words of new conversation to update the crumb.')
      return
    }

    setIsUpdating(true)
    setUpdateError('')

    try {
      const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: newConversation,
          server: selectedServer,
          depth: compressionDepth,
          existingCrumb: crumbFile,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      const { confidence, stripped } = applyResult(data.crumbFile)

      // Auto-save updated crumb to vault
      const crumbWords = stripped.trim().split(/\s+/).filter(Boolean).length
      saveToVault({
        title: extractVaultTitle(stripped),
        content: stripped,
        crumbWordCount: crumbWords,
        confidence: confidence?.confidence ?? null,
        confidenceData: confidence,
        depth: compressionDepth,
      })

      setNewConversation('')
      setShowUpdateInput(false)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLoadFromVault = (entry: VaultEntry) => {
    setCrumbFile(entry.content)
    setConfidenceData(entry.confidenceData)
    setShowUpdateInput(false)
    setNewConversation('')
    setTimeout(scrollToOutput, 100)
  }

  const wordCount = conversation.trim().split(/\s+/).filter(Boolean).length
  const charCount = conversation.length

  const scrollToCompress = () => {
    document.getElementById('compress')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToOutput = () => {
    document.getElementById('output')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden pb-24">

      {/* ─── Background: decorative elements that IGNORE content column ─── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-[-100px] w-[400px] h-[400px] bg-dim-accent/10 rounded-full blur-[100px]" />
        {/* Viewport-edge decoration: large faded logo glyph, right side */}
        <div className="absolute top-[30%] right-[-60px] w-[300px] h-[300px] opacity-[0.03]">
          <Image src="/Crumbv2.png" alt="" fill className="object-contain" />
        </div>
        {/* Sonar rings anchored to far right */}
        <svg className="absolute top-[60%] right-[-40px] w-80 h-80" style={{ animation: 'sonarPulse 4s ease-in-out infinite' }} viewBox="0 0 320 320" fill="none">
          <circle cx="160" cy="160" r="60" stroke="#06B6D4" strokeWidth="0.5" />
          <circle cx="160" cy="160" r="100" stroke="#06B6D4" strokeWidth="0.5" />
          <circle cx="160" cy="160" r="140" stroke="#06B6D4" strokeWidth="0.3" />
        </svg>
      </div>

      <WaveBackground />

      {/* ─── Edge-pinned metadata strip (right side) ─── */}
      {crumbFile && confidenceData && (
        <div className="fixed top-1/2 -translate-y-1/2 right-0 z-40 hidden xl:flex flex-col items-end gap-3 pr-5">
          <div className="flex flex-col items-center gap-1 py-3 px-2" style={{
            background: 'linear-gradient(180deg, rgba(6,24,36,0.9) 0%, rgba(10,30,46,0.8) 100%)',
            borderImage: 'linear-gradient(to bottom, rgba(6,182,212,0.15), transparent) 1',
            borderLeft: '1px solid',
          }}>
            <span className="text-[9px] font-mono text-muted uppercase tracking-widest" style={{ writingMode: 'vertical-lr' }}>Confidence</span>
            <span className="text-lg font-heading font-bold text-primary mt-1">{confidenceData.confidence}%</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-3 px-2" style={{
            background: 'linear-gradient(180deg, rgba(6,24,36,0.9) 0%, rgba(10,30,46,0.8) 100%)',
            borderImage: 'linear-gradient(to bottom, rgba(6,182,212,0.15), transparent) 1',
            borderLeft: '1px solid',
          }}>
            <span className="text-[9px] font-mono text-muted uppercase tracking-widest" style={{ writingMode: 'vertical-lr' }}>Sections</span>
            <span className="text-sm font-mono font-bold text-text-bright mt-1">{confidenceData.sections_filled}/7</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-3 px-2" style={{
            background: 'linear-gradient(180deg, rgba(6,24,36,0.9) 0%, rgba(10,30,46,0.8) 100%)',
            borderImage: 'linear-gradient(to bottom, rgba(6,182,212,0.15), transparent) 1',
            borderLeft: '1px solid',
          }}>
            <span className="text-[9px] font-mono text-muted uppercase tracking-widest" style={{ writingMode: 'vertical-lr' }}>Topics</span>
            <span className="text-sm font-mono font-bold text-text-bright mt-1">{confidenceData.key_topics_found}</span>
          </div>
        </div>
      )}

      {/* ─── Main content — uses different widths per section ─── */}
      <div className="relative z-10 pt-12 pb-16">

        {/* ─── Brand Mark — centered (intentional emphasis) ─── */}
        <div className="flex items-center justify-center mb-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center relative rounded-md overflow-hidden">
              <Image src="/Crumbv2.png" alt="Crumb Logo" fill className="object-cover" />
            </div>
            <span className="font-heading font-semibold text-xl tracking-tight text-text-bright">Crumb.</span>
            <span className="text-[10px] text-muted/50 font-mono ml-2">/ beta</span>
          </div>
        </div>

        {/* ─── Hero Section — CENTERED ─── */}
        <section className="relative mb-24 flex flex-col items-center text-center">
          {/* Ghost watermark — centered */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="font-heading font-bold text-[180px] md:text-[220px] text-text-bright opacity-[0.015] tracking-tighter whitespace-nowrap">MEMORY</span>
          </div>

          <div className="inline-flex items-center gap-3 mb-8" style={{ animation: 'fadeUp 0.8s ease-out 0.1s both' }}>
            <span className="w-8 h-px bg-gradient-to-r from-transparent to-primary/50 inline-block" />
            <span className="text-[10px] text-muted font-mono uppercase tracking-[0.25em]">AI Memory Compression</span>
            <span className="w-8 h-px bg-gradient-to-l from-transparent to-primary/50 inline-block" />
          </div>

          <h1 className="font-heading text-5xl md:text-7xl font-semibold tracking-tight leading-[1.1] text-text-bright max-w-4xl mb-6 mx-auto" style={{ animation: 'fadeUp 0.8s ease-out 0.2s both' }}>
            Never Lose <br className="hidden md:block" />
            <span style={{ background: 'linear-gradient(90deg, #06B6D4, #3B82F6, #10FDAC, #06B6D4)', backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'gradientFlow 5s ease infinite' }}>
              Context
            </span>
            {' '}Again
          </h1>

          <p className="text-muted text-base max-w-lg leading-relaxed mb-8 mx-auto" style={{ animation: 'fadeUp 0.8s ease-out 0.3s both' }}>
            Compress any long AI conversation into a portable Crumb File.
            Drop it into any new chat and continue exactly where you left off.
          </p>

          {/* Works with — centered */}
          <div className="flex items-center justify-center gap-6 flex-wrap" style={{ animation: 'fadeUp 0.8s ease-out 0.4s both' }}>
            <span className="text-[10px] text-muted/40 font-mono uppercase tracking-widest">works with</span>
            {[
              { src: '/ChatGPT.png', alt: 'ChatGPT', invert: true },
              { src: '/claude.png', alt: 'Claude', invert: false },
              { src: '/gemini.png', alt: 'Gemini', invert: false },
            ].map((item, i) => (
              <div key={item.alt} className="flex items-center gap-1.5 text-xs text-muted/60 font-mono hover:text-text-bright transition-colors duration-300 cursor-default group">
                {i > 0 && <span className="text-muted/20 mr-4">·</span>}
                <Image src={item.src} alt={item.alt} width={14} height={14} className="opacity-50 group-hover:opacity-90 transition-opacity" style={item.invert ? { filter: 'invert(1)' } : {}} />
                {item.alt}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Compression Section — full bleed title, content indented ─── */}
        <section id="compress" className="scroll-mt-20 relative mb-24 overflow-hidden">
          {/* Layered depth — full viewport width */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, transparent 0%, #061420 15%, #0A1E2E 50%, #061420 85%, transparent 100%)',
          }} />

          {/* Ink bleed */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 40% 60%, rgba(6,182,212,0.04) 0%, transparent 50%)',
          }} />

          {/* Ghost typography — bleeds past content boundary */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="font-heading font-bold text-[200px] text-text-bright opacity-[0.015] tracking-tighter whitespace-nowrap">COMPRESS</span>
          </div>

          <div className="relative py-12">
            {/* Full-bleed section label */}
            <div className="pl-[8%] pr-[5%] mb-6" style={{ animation: 'fadeUp 0.8s ease-out 0.1s both' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-breathe" />
                  <span className="font-heading text-sm font-medium text-text-bright">New Compression</span>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {/* Depth Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-mono">Depth:</span>
                    <div className="flex items-center font-mono">
                      {(['snapshot', 'memory', 'full'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setCompressionDepth(d)}
                          className={`px-3 py-1 text-xs transition-all capitalize relative ${compressionDepth === d ? 'text-primary' : 'text-muted hover:text-text-main'}`}
                        >
                          {d}
                          {compressionDepth === d && (
                            <span className="absolute bottom-0 left-2 right-2 h-px bg-primary/60" style={{ transformOrigin: 'left', animation: 'tabPop 0.2s ease-out both' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Node Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-mono">Node:</span>
                    <div className="flex items-center font-mono">
                      {[1, 2, 3].map(num => (
                        <button
                          key={num}
                          onClick={() => setSelectedServer(num)}
                          className={`px-3 py-1 text-xs transition-all relative ${selectedServer === num ? 'text-primary' : 'text-muted hover:text-text-main'}`}
                        >
                          0{num}
                          {selectedServer === num && (
                            <span className="absolute bottom-0 left-2 right-2 h-px bg-primary/60" style={{ transformOrigin: 'left', animation: 'tabPop 0.2s ease-out both' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thin rule — full bleed */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

            {/* Content indented — not full width, offset left */}
            <div className="pl-[12%] pr-[10%] mt-8 flex flex-col gap-8" style={{ animation: 'fadeUp 0.8s ease-out 0.2s both' }}>
              <div>
                {isLoading ? (
                  <CompressionVisualizer />
                ) : (
                  <ConversationInput
                    value={conversation}
                    onChange={setConversation}
                    isLoading={isLoading}
                  />
                )}
              </div>

              {/* Pill button — left of center, not dead center */}
              <div className="flex justify-start pl-[5%] pt-2 pb-4" style={{ animation: 'fadeUp 0.8s ease-out 0.3s both' }}>
                <button
                  onClick={handleCompress}
                  disabled={isLoading || !conversation.trim()}
                  className="relative px-10 py-3.5 rounded-full font-heading font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group text-[#040D12] active:scale-[0.97] hover:shadow-[0_0_40px_rgba(6,182,212,0.45)]"
                  style={{
                    background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
                    boxShadow: '0 0 24px rgba(6, 182, 212, 0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-200" />
                  <div className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Compressing...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        Compress into Crumb File
                      </>
                    )}
                  </div>
                </button>
              </div>

              {error && (
                <div className="border-l-[3px] border-red-500/40 pl-4 py-2 text-sm text-red-400 font-mono" style={{
                  background: 'radial-gradient(ellipse at 0% 50%, rgba(239,68,68,0.04) 0%, transparent 60%)',
                }}>
                  ⚠ {error}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Output — asymmetric, wider than normal content column ─── */}
        {crumbFile && (
          <section id="output" className="mb-12 pl-[8%] pr-[5%]">
            <BrainFileOutput content={crumbFile} originalContent={conversation} confidenceData={confidenceData} />
          </section>
        )}

        {/* ─── Continue Session — rolling context ─── */}
        {crumbFile && (
          <section className="mb-24 relative overflow-hidden">
            {/* Atmospheric depth */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(16,253,172,0.015) 30%, #061420 60%, transparent 100%)',
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 25% 60%, rgba(16,253,172,0.04) 0%, transparent 55%)',
            }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <span className="font-heading font-bold text-[200px] text-text-bright opacity-[0.012] tracking-tighter whitespace-nowrap">UPDATE</span>
            </div>

            <div className="relative py-12">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent mb-8" />

              <div className="pl-[8%] pr-[8%]">
                {/* Section label */}
                <div className="mb-8" style={{ animation: 'fadeUp 0.6s ease-out both' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" style={{ boxShadow: '0 0 8px #10FDAC' }} />
                    <span className="font-heading text-sm font-medium text-text-bright">Continue This Session</span>
                  </div>
                  <p className="text-xs text-muted font-mono pl-4">Have more conversation? Update your crumb file with new context.</p>
                  <div className="w-16 h-px mt-3 bg-gradient-to-r from-accent/30 to-transparent" />
                </div>

                {/* Content with left accent border */}
                <div className="relative flex gap-5">
                  <div className="w-[3px] flex-shrink-0 rounded-full bg-accent/30" />
                  <div className="flex-1">
                    {!showUpdateInput ? (
                      <button
                        onClick={() => setShowUpdateInput(true)}
                        className="flex items-center gap-2 text-sm font-mono text-accent/70 hover:text-accent transition-colors duration-200 group"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100 transition-opacity">
                          <path d="M12 5v14M5 12l7-7 7 7" />
                        </svg>
                        Add new conversation
                        <span className="h-px w-8 bg-accent/30 group-hover:w-16 transition-all duration-300 inline-block" />
                      </button>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted/60 font-mono uppercase tracking-widest">New Conversation</span>
                          <button
                            onClick={() => { setShowUpdateInput(false); setNewConversation(''); setUpdateError('') }}
                            className="text-xs text-muted/40 hover:text-muted font-mono transition-colors"
                          >
                            cancel
                          </button>
                        </div>

                        <textarea
                          value={newConversation}
                          onChange={e => setNewConversation(e.target.value)}
                          disabled={isUpdating}
                          rows={8}
                          placeholder={`Paste the new conversation that happened after the last crumb...

User: I decided to go with Postgres instead of SQLite
AI: Good choice! Here's how to set it up...`}
                          className="w-full bg-transparent border-0 rounded-none p-0 text-sm text-text-bright placeholder-muted/30 resize-none focus:outline-none transition disabled:opacity-50 font-mono leading-relaxed"
                        />
                        <div className="w-full h-px bg-gradient-to-r from-accent/20 via-accent/10 to-transparent" />

                        {updateError && (
                          <div className="border-l-[3px] border-red-500/40 pl-4 py-2 text-sm text-red-400 font-mono">
                            ⚠ {updateError}
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleUpdateCrumb}
                            disabled={isUpdating || !newConversation.trim()}
                            className="relative flex items-center gap-2 px-8 py-3 rounded-full font-heading font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] overflow-hidden group text-[#040D12] hover:shadow-[0_0_32px_rgba(16,253,172,0.35)]"
                            style={{ background: 'linear-gradient(135deg, #10FDAC, #06B6D4)', boxShadow: '0 0 20px rgba(16,253,172,0.15)' }}
                          >
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-200" />
                            <div className="relative flex items-center gap-2">
                              {isUpdating ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                  </svg>
                                  Update Crumb File
                                </>
                              )}
                            </div>
                          </button>
                          <span className="text-xs text-muted/40 font-mono">
                            {newConversation.trim().split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-accent/08 to-transparent mt-10" />
            </div>
          </section>
        )}

        {/* ─── How It Works — full bleed title, staggered steps ─── */}
        <section id="how" className="scroll-mt-20 relative mb-16 overflow-hidden">
          {/* Layered depth — full viewport width */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, transparent 0%, #061420 20%, #0A1E2E 60%, transparent 100%)',
          }} />

          {/* Ghost typography — viewport edge */}
          <div className="absolute top-8 right-0 pointer-events-none select-none overflow-hidden">
            <span className="font-heading font-bold text-[180px] text-text-bright opacity-[0.015] tracking-tighter">TRAIL</span>
          </div>

          <div className="relative py-16">
            {/* Full-bleed title — starts from far left */}
            <div className="pl-[8%] mb-14">
              <h2 className="font-heading text-3xl font-semibold text-text-bright" style={{ animation: 'fadeUp 0.8s ease-out 0.1s both' }}>How It Works</h2>
              <p className="text-sm text-muted font-mono mt-3 max-w-md" style={{ animation: 'fadeUp 0.8s ease-out 0.2s both' }}>A trail of crumbs — three steps to never lose context</p>
              <div className="w-24 h-px mt-4 bg-gradient-to-r from-primary/30 to-transparent" style={{ animation: 'fadeUp 0.8s ease-out 0.3s both' }} />
            </div>

            {/* Steps — staggered vertically AND horizontally */}
            <div className="relative flex flex-col pl-[8%]">
              {[
                { step: '01', title: 'Paste Conversation', desc: 'Copy any long AI chat and paste it into the compression input', accentColor: '#06B6D4', glowColor: 'rgba(6,182,212,0.05)', verticalDrop: 0 },
                { step: '02', title: 'Compress', desc: 'AI extracts the essential meaning, decisions, and technical context', accentColor: '#3B82F6', glowColor: 'rgba(59,130,246,0.05)', verticalDrop: 40 },
                { step: '03', title: 'Continue Anywhere', desc: 'Drop the Crumb File into any new AI chat to restore full context', accentColor: '#10B981', glowColor: 'rgba(16,185,129,0.05)', verticalDrop: 80 },
              ].map((item, idx) => (
                <div
                  key={item.step}
                  className="relative"
                  style={{
                    paddingLeft: `${idx * 80}px`,
                    marginTop: idx > 0 ? `${item.verticalDrop - (idx - 1) * 40}px` : '0',
                    animation: `fadeUp 0.8s ease-out ${0.4 + idx * 0.2}s both`,
                  }}
                >
                  {/* Connecting line */}
                  {idx < 2 && (
                    <div
                      className="absolute w-px bg-gradient-to-b to-transparent"
                      style={{
                        left: `${idx * 80 + 20}px`,
                        top: '100%',
                        height: `${60}px`,
                        background: `linear-gradient(to bottom, ${item.accentColor}40, transparent)`,
                      }}
                    />
                  )}

                  <div className="relative py-6">
                    {/* Ink bleed per step */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: `radial-gradient(ellipse at 10% 50%, ${item.glowColor} 0%, transparent 50%)`,
                    }} />

                    {/* Huge ghost number */}
                    <span
                      className="absolute top-0 left-0 font-heading font-bold text-[140px] leading-none select-none pointer-events-none -translate-y-6"
                      style={{ color: item.accentColor, opacity: 0.04 }}
                    >
                      {item.step}
                    </span>

                    {/* Left accent border + content */}
                    <div className="relative flex gap-5 pl-2">
                      <div
                        className="w-[3px] flex-shrink-0 rounded-full"
                        style={{ backgroundColor: item.accentColor, opacity: 0.35 }}
                      />
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: item.accentColor }} />
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-semibold" style={{ color: item.accentColor }}>Step {item.step}</span>
                        </div>
                        <h3 className="font-heading text-xl font-medium text-text-bright mb-1.5">{item.title}</h3>
                        <p className="text-sm text-muted leading-relaxed max-w-md">{item.desc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Angled connector */}
                  {idx < 2 && (
                    <svg className="absolute pointer-events-none" style={{ left: `${20}px`, bottom: '-8px', width: '100px', height: '50px' }} viewBox="0 0 100 50" fill="none">
                      <path d={`M 0 0 Q 25 50, 80 45`} stroke={`${item.accentColor}40`} strokeWidth="1" fill="none" />
                      <circle cx="80" cy="45" r="2.5" fill={`${item.accentColor}60`} />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="relative pt-16 pb-10 px-[8%] overflow-hidden" style={{ background: 'linear-gradient(180deg, transparent 0%, #061420 20%, #0A1E2E 60%, transparent 100%)' }}>
          {/* Radial glow */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 10% 60%, rgba(6,182,212,0.04) 0%, transparent 50%)' }} />
          {/* Ghost watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="font-heading font-black text-[120px] leading-none opacity-[0.015] text-white">CRUMB</span>
          </div>
          {/* Top rule */}
          <div className="relative mb-12 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.2) 30%, rgba(6,182,212,0.2) 70%, transparent 100%)' }} />

          {/* 3-column grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* Col 1 — Brand */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <Image src="/Crumb.png" alt="Crumb" fill className="object-contain" />
                </div>
                <span className="font-heading font-bold text-text-bright text-lg">Crumb.</span>
              </div>
              <p className="font-heading text-sm text-text-bright/80 leading-snug">Leave a trail. Never lose context.</p>
              <p className="font-mono text-[11px] text-muted leading-relaxed">AI memory compression for the context-aware era.</p>
            </div>

            {/* Col 2 — Product */}
            <div className="flex flex-col gap-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">Product</span>
              <nav className="flex flex-col gap-2.5">
                <a href="#compress" className="font-mono text-xs text-muted hover:text-primary transition-colors w-fit">Compress</a>
                <a href="#how" className="font-mono text-xs text-muted hover:text-primary transition-colors w-fit">How It Works</a>
                <button onClick={() => setShowVault(true)} className="font-mono text-xs text-muted hover:text-primary transition-colors text-left w-fit">History</button>
              </nav>
            </div>

            {/* Col 3 — Built by */}
            <div className="flex flex-col gap-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">Built By</span>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-primary text-xs">✦</span>
                  <span className="font-heading font-semibold text-text-bright text-base">Bibek Pathak</span>
                </div>
                <p className="font-mono text-[11px] text-muted">Powered by Gemini 2.5 Flash</p>
              </div>
            </div>

          </div>

          {/* Bottom strip */}
          <div className="relative mt-12">
            <div className="mb-4 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.12) 30%, rgba(6,182,212,0.12) 70%, transparent 100%)' }} />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted">© 2025 Crumb</span>
              <span className="font-mono text-[10px] text-muted">Beta · All rights reserved</span>
            </div>
          </div>
        </footer>

      </div>

      {/* ─── Floating Bottom Dock ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 px-2 py-2" style={{ animation: 'dockSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(4, 13, 18, 0.45)', borderRadius: '20px', border: '1px solid rgba(6, 182, 212, 0.06)' }}>
          <button
            onClick={scrollToCompress}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono transition-all hover:bg-primary/10 text-muted hover:text-primary"
            title="Compress"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="hidden sm:inline">Compress</span>
          </button>

          <div className="w-px h-5 bg-border-ocean/30" />

          <button
            onClick={() => setShowVault(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono transition-all hover:bg-primary/10 text-muted hover:text-primary"
            title="History"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="hidden sm:inline">History</span>
          </button>

          <div className="w-px h-5 bg-border-ocean/30" />

          <button
            disabled
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono text-muted/40 cursor-not-allowed"
            title="Settings — coming soon"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* ─── Vault Modal ─── */}
      {showVault && (
        <VaultModal
          onClose={() => setShowVault(false)}
          onLoad={handleLoadFromVault}
        />
      )}

    </main>
  )
}
