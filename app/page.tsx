'use client'

import { useState } from 'react'
import Image from 'next/image'
import ConversationInput from '@/components/ConversationInput'
import BrainFileOutput from '@/components/BrainFileOutput'

export default function Home() {
  const [conversation, setConversation] = useState('')
  const [crumbFile, setCrumbFile] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedServer, setSelectedServer] = useState<number>(1)

  const handleCompress = async () => {
    if (!conversation.trim()) return
    setIsLoading(true)
    setError('')
    setCrumbFile('')

    try {
      const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation, server: selectedServer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setCrumbFile(data.crumbFile)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden">

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-[-100px] w-[400px] h-[400px] bg-dim-accent/10 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[-100px] w-[350px] h-[350px] bg-dim-accent/5 rounded-full blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-20 flex flex-col gap-12">

        {/* Nav */}
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center relative rounded-md overflow-hidden">
              <Image src="/Crumbv2.png" alt="Crumb Logo" fill className="object-cover" />
            </div>
            <span className="font-heading font-semibold text-xl tracking-tight text-text-bright">Crumb.</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-ocean bg-surface text-xs text-primary font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
            v1.0 — Beta
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-ocean bg-surface text-xs text-text-bright font-medium font-mono">
            <span className="text-primary">✦</span> AI Memory Compression
          </div>

          <h1 className="font-heading text-5xl font-semibold tracking-tight leading-tight text-text-bright">
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

          {/* Stats */}
          <div className="flex items-center gap-6 text-xs text-muted font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-primary">✦</span> Works with ChatGPT
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary">✦</span> Works with Claude
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary">✦</span> Works with Gemini
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-border-ocean bg-card p-6 flex flex-col gap-5 shadow-[0_0_40px_rgba(6,182,212,0.06)]">

          {/* Card Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-ocean/50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
              <span className="font-heading text-sm font-medium text-text-bright">New Compression</span>
            </div>
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

          <ConversationInput
            value={conversation}
            onChange={setConversation}
            isLoading={isLoading}
          />

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
                  Compressing your conversation...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="16" width="4" height="4" fill="currentColor" />
                    <rect x="12" y="12" width="4" height="4" fill="currentColor" />
                    <rect x="16" y="8" width="4" height="4" fill="currentColor" />
                    <rect x="20" y="4" width="4" height="4" fill="currentColor" />
                    <rect x="12" y="24" width="4" height="4" fill="currentColor" />
                    <rect x="16" y="20" width="4" height="4" fill="currentColor" />
                    <rect x="20" y="28" width="4" height="4" fill="currentColor" />
                    <rect x="24" y="24" width="4" height="4" fill="currentColor" />
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

        {/* Output */}
        {crumbFile && <BrainFileOutput content={crumbFile} />}

        {/* How it works */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '📋', step: '01', title: 'Paste Conversation', desc: 'Copy any long AI chat and paste it in' },
            { icon: '🚀', step: '02', title: 'Compress', desc: 'AI extracts the essential meaning and context' },
            { icon: '🧠', step: '03', title: 'Continue Anywhere', desc: 'Drop the Crumb File into any new AI chat' },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-border-ocean/50 bg-surface p-4 flex flex-col gap-3 transition-colors hover:border-border-ocean">
              <div className="flex items-center justify-between">
                <span className="text-xl drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">{item.icon}</span>
                <span className="text-xs text-muted font-mono">{item.step}</span>
              </div>
              <div>
                <p className="font-heading text-sm font-medium text-text-bright mb-1">{item.title}</p>
                <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted font-mono pt-8">
          <div>Built with <span className="text-primary">✦</span> — Leave a trail. Never lose context.</div>
          <div className="relative w-20 h-5 opacity-50 hover:opacity-100 transition-opacity">
            <Image src="/Crumb.png" alt="Powered By Crumb" fill className="object-contain" />
          </div>
        </div>

      </div>
    </main >
  )
}