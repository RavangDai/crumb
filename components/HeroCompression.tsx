'use client'

import { useState, useEffect, useRef } from 'react'

const ORIGINAL_TEXT = `I was thinking maybe we could possibly consider building some kind of SaaS application for teams that work remotely because there are a lot of issues with communication and things falling through the cracks and I think we should probably use React and maybe Next.js for the frontend`

const COMPRESSED_TEXT = `SaaS app → remote teams → React + Next.js`

interface WordState {
    word: string
    isAlive: boolean
    isFading: boolean
    isHighlighted: boolean
}

export default function HeroCompression() {
    const [phase, setPhase] = useState<'typing' | 'compressing' | 'done'>('typing')
    const [typedLength, setTypedLength] = useState(0)
    const [words, setWords] = useState<WordState[]>([])
    const [showCompressed, setShowCompressed] = useState(false)
    const timeoutRefs = useRef<NodeJS.Timeout[]>([])

    const allWords = ORIGINAL_TEXT.split(' ')

    // Cleanup
    useEffect(() => {
        return () => timeoutRefs.current.forEach(t => clearTimeout(t))
    }, [])

    // Phase 1: Type the words in
    useEffect(() => {
        if (phase !== 'typing') return

        const interval = setInterval(() => {
            setTypedLength(prev => {
                if (prev >= allWords.length) {
                    clearInterval(interval)
                    const t = setTimeout(() => setPhase('compressing'), 800)
                    timeoutRefs.current.push(t)
                    return prev
                }
                return prev + 1
            })
        }, 60)

        return () => clearInterval(interval)
    }, [phase, allWords.length])

    // Update words when typing
    useEffect(() => {
        setWords(allWords.slice(0, typedLength).map(w => ({
            word: w,
            isAlive: true,
            isFading: false,
            isHighlighted: false,
        })))
    }, [typedLength, allWords])

    // Phase 2: Compress - fade out non-essential words
    useEffect(() => {
        if (phase !== 'compressing') return

        const keepWords = new Set(['SaaS', 'application', 'teams', 'remotely', 'React', 'Next.js', 'frontend', 'remote'])

        const newWords = allWords.map(w => ({
            word: w,
            isAlive: true,
            isFading: false,
            isHighlighted: keepWords.has(w.replace(/[^a-zA-Z.]/g, '')),
        }))
        setWords(newWords)

        // Fade non-essential words progressively
        let delay = 400
        const wordsCopy = [...newWords]

        for (let i = 0; i < wordsCopy.length; i++) {
            if (!wordsCopy[i].isHighlighted) {
                const idx = i
                const t = setTimeout(() => {
                    setWords(prev => prev.map((w, j) => j === idx ? { ...w, isFading: true } : w))
                }, delay)
                timeoutRefs.current.push(t)
                delay += 40
            }
        }

        // After all faded, remove them and show compressed
        const t = setTimeout(() => {
            setWords(prev => prev.filter(w => w.isHighlighted))
            const t2 = setTimeout(() => {
                setShowCompressed(true)
                setPhase('done')
            }, 600)
            timeoutRefs.current.push(t2)
        }, delay + 300)
        timeoutRefs.current.push(t)
    }, [phase, allWords])

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* Main animation container */}
            <div className="rounded-xl border border-border-ocean/50 bg-surface/80 backdrop-blur-sm p-6 min-h-[100px] font-mono text-[13px] leading-relaxed">
                {/* Stage label */}
                <div className="flex items-center gap-2 mb-4">
                    <span className={`w-1.5 h-1.5 rounded-full transition-colors ${phase === 'done' ? 'bg-accent' : 'bg-primary animate-pulse'}`} />
                    <span className="text-[10px] text-muted uppercase tracking-widest font-semibold">
                        {phase === 'typing' ? 'Raw conversation...' : phase === 'compressing' ? 'Compressing...' : 'Compressed.'}
                    </span>
                </div>

                {/* Animated text */}
                {!showCompressed ? (
                    <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                        {words.map((w, i) => (
                            <span
                                key={i}
                                className={`transition-all duration-300 inline-block ${w.isFading
                                        ? 'opacity-0 scale-75 blur-sm -translate-y-1'
                                        : w.isHighlighted
                                            ? 'text-primary font-semibold scale-105'
                                            : 'text-muted/60'
                                    }`}
                            >
                                {w.word}
                            </span>
                        ))}
                        {phase === 'typing' && (
                            <span className="w-[2px] h-4 bg-primary animate-pulse inline-block ml-0.5" />
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 animate-[fadeIn_0.6s_ease-out]">
                        <span className="text-primary font-bold text-base">{COMPRESSED_TEXT}</span>
                        <span className="text-[10px] text-muted px-2 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent font-mono">
                            92% smaller
                        </span>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
        </div>
    )
}
