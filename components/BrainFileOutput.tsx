'use client'

import { useState } from 'react'

interface Props {
  content: string
}

export default function BrainFileOutput({ content }: Props) {
  const [copied, setCopied] = useState(false)

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

  const wordCount = content.trim().split(/\s+/).length

  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <label className="text-sm font-semibold text-zinc-300">
            Your Crumb File
          </label>
          <p className="text-xs text-zinc-500 mt-0.5">
            {wordCount} words · Ready to use in any AI
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-400 transition"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-400 transition"
          >
            ⬇ Download .md
          </button>
        </div>
      </div>

      {/* Output Box */}
      <div className="bg-zinc-900 border border-orange-500/30 rounded-xl p-4 max-h-96 overflow-y-auto">
        <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
          {content}
        </pre>
      </div>

      {/* How to use tip */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-zinc-400 mb-2">
          💡 How to use this Crumb File
        </p>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Open a new chat with any AI. Start your message with:{' '}
          <span className="text-zinc-400 italic">
            &ldquo;Here&rsquo;s the context of our previous work: [paste crumb file]&rdquo;
          </span>
          {' '}&mdash; the AI will instantly understand everything and continue right where you left off.
        </p>
      </div>

    </div>
  )
}