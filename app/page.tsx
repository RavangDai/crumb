'use client'

import { useState } from 'react'
import ConversationInput from '@/components/ConversationInput'
import BrainFileOutput from '@/components/BrainFileOutput'

export default function Home() {
  const [conversation, setConversation] = useState('')
  const [crumbFile, setCrumbFile] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCompress = async () => {
    if (!conversation.trim()) return

    setIsLoading(true)
    setError('')
    setCrumbFile('')

    try {
      const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      setCrumbFile(data.crumbFile)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍞</span>
            <h1 className="text-3xl font-bold tracking-tight">Crumb</h1>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Compress any long AI conversation into a portable memory file.<br />
            Drop it into any new chat and continue exactly where you left off.
          </p>
        </div>

        {/* Input */}
        <ConversationInput
          value={conversation}
          onChange={setConversation}
          isLoading={isLoading}
        />

        {/* Button */}
        <button
          onClick={handleCompress}
          disabled={isLoading || !conversation.trim()}
          className="w-full py-4 rounded-xl font-semibold text-sm bg-orange-500 hover:bg-orange-400 text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Compressing...
            </>
          ) : (
            '⚡ Compress Conversation'
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Output */}
        {crumbFile && (
          <BrainFileOutput content={crumbFile} />
        )}

      </div>
    </main>
  )
}