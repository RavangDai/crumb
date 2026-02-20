'use client'

interface Props {
  value: string
  onChange: (value: string) => void
  isLoading: boolean
}

export default function ConversationInput({ value, onChange, isLoading }: Props) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const charCount = value.length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-zinc-300">
          Paste Your Conversation
        </label>
        <span className="text-xs text-zinc-500">
          {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        rows={12}
        placeholder={`Paste your full AI conversation here...

Example:
User: I want to build a SaaS app
AI: Great! Let's start with...
User: I want to focus on small teams
AI: Perfect, here's what I suggest...`}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed font-mono leading-relaxed"
      />

      {value.length > 40000 && (
        <p className="text-xs text-orange-400">
          ⚠ Approaching the 50,000 character limit
        </p>
      )}
    </div>
  )
}