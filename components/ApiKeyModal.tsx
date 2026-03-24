'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getApiKeyForProvider, setApiKeyForProvider,
  getUserProvider, setUserProvider,
} from '@/lib/apikey'
import type { AIProvider } from '@/lib/apikey'
import { Key, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  theme: 'crumb' | 'craft'
}

const THEMES = {
  crumb: {
    bg: 'linear-gradient(180deg, #0B1929 0%, #040D12 100%)',
    border: 'rgba(6,182,212,0.18)',
    glow: 'rgba(6,182,212,0.3)',
    accent: '#06B6D4',
    accentDim: 'rgba(6,182,212,0.55)',
    accentBg: 'rgba(6,182,212,0.06)',
    accentBorder: 'rgba(6,182,212,0.18)',
    text: '#E8F4F8',
    muted: 'rgba(136,153,170,0.7)',
    inputBg: 'rgba(6,182,212,0.04)',
    inputBorder: 'rgba(6,182,212,0.15)',
    inputFocus: 'rgba(6,182,212,0.35)',
    overlay: 'rgba(4,13,18,0.88)',
    savedBg: 'rgba(16,253,172,0.08)',
    savedBorder: 'rgba(16,253,172,0.25)',
    savedText: '#10FDAC',
    tabActive: '#06B6D4',
    tabActiveFg: '#040D12',
  },
  craft: {
    bg: 'linear-gradient(180deg, #0D1A0D 0%, #080D08 100%)',
    border: 'rgba(45,158,107,0.18)',
    glow: 'rgba(93,255,168,0.3)',
    accent: '#2D9E6B',
    accentDim: 'rgba(141,184,154,0.55)',
    accentBg: 'rgba(45,158,107,0.06)',
    accentBorder: 'rgba(45,158,107,0.18)',
    text: '#D4EDE0',
    muted: 'rgba(141,184,154,0.5)',
    inputBg: 'rgba(45,158,107,0.04)',
    inputBorder: 'rgba(45,158,107,0.15)',
    inputFocus: 'rgba(45,158,107,0.35)',
    overlay: 'rgba(4,9,4,0.88)',
    savedBg: 'rgba(93,255,168,0.08)',
    savedBorder: 'rgba(93,255,168,0.25)',
    savedText: '#5DFFA8',
    tabActive: '#2D9E6B',
    tabActiveFg: '#080D08',
  },
}

const PROVIDERS: {
  id: AIProvider
  label: string
  placeholder: string
  link: string
  linkLabel: string
  model: string
}[] = [
  {
    id: 'gemini',
    label: 'Gemini',
    placeholder: 'AIzaSy...',
    link: 'https://aistudio.google.com/apikey',
    linkLabel: 'Get a free Gemini key',
    model: 'gemini-2.5-flash',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    link: 'https://platform.openai.com/api-keys',
    linkLabel: 'Get an OpenAI key',
    model: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    link: 'https://console.anthropic.com/settings/keys',
    linkLabel: 'Get an Anthropic key',
    model: 'claude-haiku',
  },
]

export default function ApiKeyModal({ open, onClose, theme }: Props) {
  const t = THEMES[theme]

  const [activeProvider, setActiveProvider] = useState<AIProvider>('gemini')
  const [keys, setKeys] = useState<Record<AIProvider, string>>({ gemini: '', openai: '', anthropic: '' })
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const providerInfo = PROVIDERS.find(p => p.id === activeProvider)!

  useEffect(() => {
    if (!open) return
    const current = getUserProvider()
    setActiveProvider(current)
    setKeys({
      gemini:    getApiKeyForProvider('gemini'),
      openai:    getApiKeyForProvider('openai'),
      anthropic: getApiKeyForProvider('anthropic'),
    })
    setSaved(false)
    setShowKey(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const currentKey = keys[activeProvider]

  const handleKeyChange = (val: string) => {
    setKeys(prev => ({ ...prev, [activeProvider]: val }))
    setSaved(false)
  }

  const handleProviderSwitch = (p: AIProvider) => {
    setActiveProvider(p)
    setSaved(false)
    setShowKey(false)
  }

  const handleSave = () => {
    setApiKeyForProvider(currentKey, activeProvider)
    setUserProvider(activeProvider)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    setKeys(prev => ({ ...prev, [activeProvider]: '' }))
    setApiKeyForProvider('', activeProvider)
    setSaved(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="apikey-modal"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: t.overlay, backdropFilter: 'blur(12px)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: t.bg,
              boxShadow: `0 0 0 1px ${t.border}, 0 32px 80px rgba(0,0,0,0.7)`,
            }}
          >
            {/* Top glow line */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${t.glow}, transparent)` }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-3">
                <Key size={13} strokeWidth={1.5} style={{ color: t.accent, opacity: 0.7 }} />
                <div className="w-px h-4" style={{ background: t.border }} />
                <div>
                  <h2 className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-sora)', color: t.text }}>
                    API Key
                  </h2>
                  <p className="text-[10px] mt-0.5" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: t.muted }}>
                    Bypass rate limits with your own key
                  </p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: t.accentDim }}
                onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.background = t.accentBg }}
                onMouseLeave={e => { e.currentTarget.style.color = t.accentDim; e.currentTarget.style.background = 'transparent' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Provider tabs */}
            <div className="flex px-6 pt-4 gap-1">
              {PROVIDERS.map(p => {
                const isActive = p.id === activeProvider
                const hasKey = keys[p.id].trim().length > 0
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProviderSwitch(p.id)}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      background: isActive ? t.tabActive : 'transparent',
                      color: isActive ? t.tabActiveFg : t.muted,
                      border: `1px solid ${isActive ? t.tabActive : t.accentBorder}`,
                    }}
                  >
                    {p.label}
                    {hasKey && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isActive ? t.tabActiveFg : t.accent, opacity: isActive ? 0.6 : 1 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Body */}
            <div className="px-6 py-4 flex flex-col gap-4">
              {/* Model info */}
              <p className="text-[11px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: t.muted }}>
                Using <span style={{ color: t.text }}>{providerInfo.model}</span>
                {' '}— stored locally, never sent to our servers.
              </p>

              {/* Input */}
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={currentKey}
                  onChange={e => handleKeyChange(e.target.value)}
                  placeholder={providerInfo.placeholder}
                  className="w-full px-4 py-3 pr-11 text-sm rounded-lg focus:outline-none transition-all"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: '12px',
                    color: t.text,
                    background: t.inputBg,
                    border: `1px solid ${t.inputBorder}`,
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = t.inputFocus}
                  onBlur={e => e.currentTarget.style.borderColor = t.inputBorder}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: t.accentDim }}
                >
                  {showKey ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                </button>
              </div>

              {/* Saved status */}
              <AnimatePresence>
                {saved && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs px-3 py-2 rounded"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      color: t.savedText,
                      background: t.savedBg,
                      border: `1px solid ${t.savedBorder}`,
                    }}
                  >
                    {providerInfo.label} key saved · now active
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSave}
                  disabled={!currentKey.trim()}
                  className="flex-1 text-sm py-2.5 rounded-lg font-medium transition-all disabled:opacity-30"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: '12px',
                    color: t.tabActiveFg,
                    background: t.accent,
                  }}
                  onMouseEnter={e => { if (currentKey.trim()) e.currentTarget.style.opacity = '0.88' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  Save &amp; Activate
                </button>
                {currentKey && (
                  <button
                    onClick={handleClear}
                    className="text-sm px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: '12px',
                      color: t.accentDim,
                      border: `1px solid ${t.accentBorder}`,
                      background: 'transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = t.accentBg; e.currentTarget.style.color = t.text }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.accentDim }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Get key link */}
              <a
                href={providerInfo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-80 self-start"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: t.accentDim }}
              >
                {providerInfo.linkLabel}
                <ExternalLink size={10} strokeWidth={1.5} />
              </a>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5" style={{ borderTop: `1px solid ${t.border}` }}>
              <p className="text-[10px] leading-relaxed" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: t.muted }}>
                If no key is set, the app uses its built-in Gemini key (rate-limited).
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
