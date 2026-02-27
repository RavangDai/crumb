'use client'

import { useEffect, useState } from 'react'
import { VaultEntry, ConfidenceData } from '@/lib/types'
import { getVault, deleteFromVault } from '@/lib/vault'

interface Props {
  onClose: () => void
  onLoad: (entry: VaultEntry) => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
  if (diffHours < 48) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  const circumference = 2 * Math.PI * 14
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
        <circle
          cx="18" cy="18" r="14"
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-mono font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

export default function VaultModal({ onClose, onLoad }: Props) {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setEntries(getVault())
  }, [])

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleDelete = (id: string) => {
    setDeletingId(id)
    setTimeout(() => {
      deleteFromVault(id)
      setEntries(prev => prev.filter(e => e.id !== id))
      setDeletingId(null)
    }, 300)
  }

  const depthColor: Record<string, string> = {
    snapshot: '#F59E0B',
    memory: '#06B6D4',
    full: '#A855F7',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4, 13, 18, 0.85)', backdropFilter: 'blur(12px)', animation: 'fadeUp 0.2s ease-out both' }}
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden animate-scale-in"
        style={{
          background: 'linear-gradient(180deg, #0B1929 0%, #061420 100%)',
          boxShadow: '0 0 0 1px rgba(6,182,212,0.12), 0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="w-px h-4 bg-primary/15" />
            <div>
              <h2 className="font-heading font-semibold text-text-bright text-sm tracking-tight">Context Vault</h2>
              <p className="text-[10px] text-muted font-mono mt-0.5">{entries.length} saved {entries.length === 1 ? 'crumb' : 'crumbs'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text-bright hover:bg-white/5 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
              <span className="font-heading font-bold text-[80px] leading-none text-text-bright opacity-[0.03] select-none mb-4">EMPTY</span>
              <p className="text-sm text-muted font-mono">No crumb files saved yet.</p>
              <p className="text-xs text-muted/50 font-mono mt-1">Compress a conversation and it&apos;ll appear here automatically.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="group relative flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all duration-200"
                  style={{
                    opacity: deletingId === entry.id ? 0 : 1,
                    transform: deletingId === entry.id ? 'translateX(16px)' : 'none',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    animation: `fadeUp 0.4s ease-out ${idx * 0.04}s both`,
                  }}
                >
                  {/* Confidence ring */}
                  <ConfidenceBadge score={entry.confidence} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-text-bright/90 leading-snug truncate pr-2">{entry.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-muted font-mono">{formatDate(entry.createdAt)}</span>
                      <span className="text-[10px] font-mono capitalize" style={{ color: depthColor[entry.depth] || '#8899AA' }}>{entry.depth}</span>
                      <span className="text-[10px] text-muted/60 font-mono">{entry.crumbWordCount} words</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => { onLoad(entry); onClose() }}
                      className="text-[11px] font-mono text-primary hover:text-text-bright transition-colors underline underline-offset-2 decoration-primary/30"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-muted/30 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="px-6 py-3 border-t border-white/5">
            <p className="text-[10px] text-muted/40 font-mono">Stored locally in your browser · Max 50 entries</p>
          </div>
        )}
      </div>
    </div>
  )
}
