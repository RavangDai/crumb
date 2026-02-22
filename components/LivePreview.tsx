'use client'

import { useMemo } from 'react'

interface Props {
    conversation: string
}

export default function LivePreview({ conversation }: Props) {
    const stats = useMemo(() => {
        if (!conversation.trim()) return null

        const words = conversation.trim().split(/\s+/)
        const chars = conversation.length
        const lines = conversation.split('\n').filter(l => l.trim()).length
        const estimatedTokens = Math.round(words.length * 1.3)

        // Detect speakers
        const userMessages = (conversation.match(/^(user|human):/gim) || []).length
        const aiMessages = (conversation.match(/^(ai|assistant|gemini|chatgpt|claude):/gim) || []).length

        // Detect potential tags
        const hasCode = /```|function |const |import |class /.test(conversation)
        const hasUrls = /https?:\/\//.test(conversation)
        const hasDecisions = /(decided|chose|picked|selected|let's go with|we'll use)/i.test(conversation)

        return { words: words.length, chars, lines, estimatedTokens, userMessages, aiMessages, hasCode, hasUrls, hasDecisions }
    }, [conversation])

    if (!stats) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-4">
                <div className="w-14 h-14 rounded-2xl border border-border-ocean/50 bg-surface flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm text-text-bright font-heading font-medium mb-1">Live Analysis</p>
                    <p className="text-[11px] text-muted font-mono">Start typing to see real-time<br />conversation metrics</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col p-5 gap-5 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] text-accent font-mono font-semibold uppercase tracking-widest">Live Analysis</span>
            </div>

            {/* Token gauge */}
            <div className="rounded-xl border border-border-ocean/50 bg-background p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider">Est. Tokens</span>
                    <span className="text-lg font-heading font-bold text-text-bright">{stats.estimatedTokens.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${Math.min((stats.estimatedTokens / 8000) * 100, 100)}%`,
                            background: stats.estimatedTokens > 6000
                                ? 'linear-gradient(90deg, #F97316, #EF4444)'
                                : 'linear-gradient(90deg, #06B6D4, #3B82F6)',
                        }}
                    />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-muted">
                    <span>0</span>
                    <span>8K context</span>
                </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-2">
                {[
                    { label: 'Words', value: stats.words.toLocaleString(), icon: 'W' },
                    { label: 'Lines', value: stats.lines.toString(), icon: 'L' },
                    { label: 'Human msgs', value: stats.userMessages.toString(), icon: 'H' },
                    { label: 'AI msgs', value: stats.aiMessages.toString(), icon: 'A' },
                ].map(s => (
                    <div key={s.label} className="rounded-lg border border-border-ocean/30 bg-background p-3 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary font-mono">
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-[13px] font-heading font-semibold text-text-bright">{s.value}</p>
                            <p className="text-[9px] font-mono text-muted uppercase">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detected signals */}
            <div className="flex flex-col gap-2 mt-auto">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider">Detected Signals</span>
                <div className="flex flex-wrap gap-1.5">
                    {stats.hasCode && (
                        <span className="px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[9px] font-bold tracking-wider">CODE</span>
                    )}
                    {stats.hasUrls && (
                        <span className="px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[9px] font-bold tracking-wider">URLS</span>
                    )}
                    {stats.hasDecisions && (
                        <span className="px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold tracking-wider">DECISIONS</span>
                    )}
                    {stats.userMessages > 0 && (
                        <span className="px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[9px] font-bold tracking-wider">DIALOGUE</span>
                    )}
                    {!stats.hasCode && !stats.hasUrls && !stats.hasDecisions && stats.userMessages === 0 && (
                        <span className="px-2.5 py-1 rounded-full border border-border-ocean/30 bg-surface text-muted text-[9px] font-mono">No signals yet...</span>
                    )}
                </div>
            </div>
        </div>
    )
}
