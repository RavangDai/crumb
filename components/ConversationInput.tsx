'use client'

interface Props {
  value: string
  onChange: (value: string) => void
  isLoading: boolean
}

export default function ConversationInput({ value, onChange, isLoading }: Props) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const charCount = value.length
  const progress = Math.min((charCount / 50000) * 100, 100)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
          Conversation Input
        </label>
        <span className="text-xs text-zinc-600 font-mono">
          {wordCount.toLocaleString()} words · {charCount.toLocaleString()} / 50,000
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        rows={10}
        placeholder={`Paste your full AI conversation here...

User: I want to build a SaaS app for project management
AI: Great idea! Let's start by thinking about your target users...
User: I want to focus on small remote teams
AI: Perfect. Here's what I suggest...`}
        className="w-full bg-background border border-border-ocean/50 rounded-xl p-4 text-sm text-text-bright placeholder-muted/50 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed font-mono leading-relaxed"
      />

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: progress > 80 ? '#ef4444' : 'var(--primary)'
          }}
        />
      </div>

      {charCount > 40000 && (
        <p className="text-xs text-orange-400">⚠ Approaching the 50,000 character limit</p>
      )}
    </div>
  )
}