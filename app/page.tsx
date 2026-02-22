'use client'

import { useState } from 'react'
import Image from 'next/image'
import ConversationInput from '@/components/ConversationInput'
import BrainFileOutput from '@/components/BrainFileOutput'
import CompressionVisualizer from '@/components/CompressionVisualizer'
import WaveBackground from '@/components/WaveBackground'
import { CompressionDepth } from '@/lib/prompt'

export default function Home() {
  const [conversation, setConversation] = useState('')
  const [crumbFile, setCrumbFile] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedServer, setSelectedServer] = useState<number>(1)
  const [compressionDepth, setCompressionDepth] = useState<CompressionDepth>('memory')
  const [confidenceData, setConfidenceData] = useState<any>(null)

  const parseConfidence = (raw: string) => {
    try {
      const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }
    } catch { /* ignore */ }
    return null
  }

  const stripConfidenceJson = (raw: string) => {
    return raw.replace(/```json\s*[\s\S]*?```/, '').trim()
  }

  const handleCompress = async () => {
    if (!conversation.trim()) return
    setIsLoading(true)
    setError('')
    setCrumbFile('')
    setConfidenceData(null)

    try {
      const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation, server: selectedServer, depth: compressionDepth }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      const confidence = parseConfidence(data.crumbFile)
      setConfidenceData(confidence)
      setCrumbFile(stripConfidenceJson(data.crumbFile))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }



  const scrollToCompress = () => {
    document.getElementById('compress')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden pb-24">

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-[-100px] w-[400px] h-[400px] bg-dim-accent/10 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[-100px] w-[350px] h-[350px] bg-dim-accent/5 rounded-full blur-[100px]" />
      </div>

      {/* Animated Wave Background */}
      <WaveBackground />



      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-16 flex flex-col gap-20">

        {/* ─── Minimal Brand Mark ─── */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center relative rounded-md overflow-hidden">
              <Image src="/Crumbv2.png" alt="Crumb Logo" fill className="object-cover" />
            </div>
            <span className="font-heading font-semibold text-xl tracking-tight text-text-bright">Crumb.</span>
            <span className="text-[10px] text-muted font-mono ml-1 px-2 py-0.5 rounded-full border border-border-ocean">beta</span>
          </div>
        </div>

        {/* ─── Hero Section ─── */}
        <section className="text-center flex flex-col items-center gap-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-ocean bg-surface text-xs text-text-bright font-medium font-mono">
            <span className="text-primary">✦</span> AI Memory Compression
          </div>

          <h1 className="font-heading text-5xl md:text-6xl font-semibold tracking-tight leading-tight text-text-bright max-w-3xl">
            Never Lose{' '}
            <span style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Context
            </span>
            {' '}Again
          </h1>

          <p className="text-muted text-base max-w-lg leading-relaxed">
            Compress any long AI conversation into a portable Crumb File.
            Drop it into any new chat and continue exactly where you left off.
          </p>
        </section>

        {/* ─── Works With Badges ─── */}
        <div className="flex items-center justify-center gap-5 text-xs text-muted font-mono flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-border-ocean/40 bg-surface/60 hover:border-[rgba(16,163,127,0.3)] transition-colors group">
            <svg width="14" height="14" viewBox="0 0 41 41" fill="none" className="opacity-60 group-hover:opacity-100 transition-opacity"><path d="M37.53 16.08c1.01-2.83.27-6.01-1.88-8.16a6.93 6.93 0 00-7.75-1.5A6.97 6.97 0 0022.69 2a6.95 6.95 0 00-6.63 4.88A7.02 7.02 0 0010.93 10.24a6.99 6.99 0 00.87 8.17 7 7 0 001.88 8.16 6.93 6.93 0 007.75 1.5A6.97 6.97 0 0026.63 32.25V32c0-.08 0-.17.01-.25a6.95 6.95 0 006.62-4.88 7.02 7.02 0 005.14-3.36 6.99 6.99 0 00-.87-8.17v.74z" fill="#10A37F" /></svg>
            ChatGPT
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-border-ocean/40 bg-surface/60 hover:border-[rgba(212,165,116,0.3)] transition-colors group">
            <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-60 group-hover:opacity-100 transition-opacity"><path d="M4.71 6.2L11.84 20.04h.32L19.29 6.2h-3.2l-4.08 8.9-4.1-8.9H4.71z" fill="#D4A574" /></svg>
            Claude
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-border-ocean/40 bg-surface/60 hover:border-[rgba(66,133,244,0.3)] transition-colors group">
            <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-60 group-hover:opacity-100 transition-opacity"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8L8 14l-6-4.8h7.6L12 2z" fill="url(#gemBadge)" /><defs><linearGradient id="gemBadge" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#4285F4" /><stop offset=".33" stopColor="#EA4335" /><stop offset=".66" stopColor="#FBBC05" /><stop offset="1" stopColor="#34A853" /></linearGradient></defs></svg>
            Gemini
          </div>
        </div>

        {/* ─── Compression Section (Full Width) ─── */}
        <section id="compress" className="scroll-mt-20">
          <div className="rounded-2xl border border-border-ocean bg-card p-6 flex flex-col gap-5 shadow-[0_0_40px_rgba(6,182,212,0.06)]">

            {/* Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-ocean/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                <span className="font-heading text-sm font-medium text-text-bright">New Compression</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">

                {/* Depth Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">Depth:</span>
                  <div className="flex bg-surface rounded-lg p-0.5 border border-border-ocean/50 font-mono">
                    {(['snapshot', 'memory', 'full'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setCompressionDepth(d)}
                        className={`px-3 py-1 text-xs rounded-md transition-all capitalize ${compressionDepth === d
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted hover:text-text-main'
                          }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Node Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">Node:</span>
                  <div className="flex bg-surface rounded-lg p-0.5 border border-border-ocean/50 font-mono">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        onClick={() => setSelectedServer(num)}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${selectedServer === num
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted hover:text-text-main'
                          }`}
                      >
                        0{num}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {isLoading ? (
              <CompressionVisualizer />
            ) : (
              <ConversationInput
                value={conversation}
                onChange={setConversation}
                isLoading={isLoading}
              />
            )}

            <button
              onClick={handleCompress}
              disabled={isLoading || !conversation.trim()}
              className="relative w-full py-3.5 rounded-xl font-heading font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group text-[#040D12]"
              style={{
                background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
                boxShadow: '0 0 24px rgba(6, 182, 212, 0.2)'
              }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
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

            {error && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 font-mono">
                ⚠ {error}
              </div>
            )}
          </div>
        </section>

        {/* ─── Output ─── */}
        {crumbFile && (
          <section>
            <BrainFileOutput content={crumbFile} originalContent={conversation} confidenceData={confidenceData} />
          </section>
        )}

        {/* ─── How It Works ─── */}
        <section id="how" className="scroll-mt-20">
          <div className="text-center mb-8">
            <h2 className="font-heading text-2xl font-semibold text-text-bright">How It Works</h2>
            <p className="text-sm text-muted font-mono mt-2">Three steps to never lose context</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: '01', title: 'Paste Conversation', desc: 'Copy any long AI chat and paste it into the compression input',
                icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>)
              },
              {
                step: '02', title: 'Compress', desc: 'AI extracts the essential meaning, decisions, and technical context',
                icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>)
              },
              {
                step: '03', title: 'Continue Anywhere', desc: 'Drop the Crumb File into any new AI chat to restore full context',
                icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z" /><polyline points="7.5 4.21 12 6.81 16.5 4.21" /><polyline points="7.5 19.79 7.5 14.6 3 12" /><polyline points="21 12 16.5 14.6 16.5 19.79" /><line x1="12" y1="22" x2="12" y2="12" /></svg>)
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-border-ocean/50 bg-surface p-5 flex flex-col gap-4 transition-colors hover:border-border-ocean group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-xs text-muted font-mono">{item.step}</span>
                </div>
                <div>
                  <p className="font-heading text-sm font-medium text-text-bright mb-1">{item.title}</p>
                  <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="flex items-center justify-between text-xs text-muted font-mono pt-4 border-t border-border-ocean/20">
          <div>Built with <span className="text-primary">✦</span> — Leave a trail. Never lose context.</div>
          <div className="relative w-20 h-5 opacity-50 hover:opacity-100 transition-opacity">
            <Image src="/Crumb.png" alt="Powered By Crumb" fill className="object-contain" />
          </div>
        </footer>

      </div>

      {/* ─── Floating Bottom Dock ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 px-2 py-2 rounded-2xl border border-border-ocean/50 bg-surface/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(6,182,212,0.05)]">
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono transition-all hover:bg-primary/10 text-muted hover:text-primary"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

    </main>
  )
}