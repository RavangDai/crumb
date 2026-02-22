'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function CompressionVisualizer() {
    const [tokens, setTokens] = useState<{ id: number; text: string; delay: number; top: number; left: boolean }[]>([])

    useEffect(() => {
        // Generate random filler words/tokens streaming in
        const sampleWords = ['mission', 'goal', 'context', 'const', 'data', 'user', 'query', 'results', 'memory', 'state', 'true', 'false', 'decision', 'constraint', 'error', 'pattern', 'loop', 'API', 'JSON']

        let idCounter = 0
        const interval = setInterval(() => {
            setTokens(prev => {
                const newTokens = [...prev].filter(t => t.id > idCounter - 40) // Keep last 40
                newTokens.push({
                    id: idCounter++,
                    text: sampleWords[Math.floor(Math.random() * sampleWords.length)],
                    delay: Math.random() * 0.2, // slight jitter
                    top: 10 + Math.random() * 80, // percentage top
                    left: Math.random() > 0.5 // come from left or right
                })
                return newTokens
            })
        }, 100)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative w-full min-h-[300px] bg-background border border-border-ocean/50 rounded-xl overflow-hidden flex items-center justify-center p-4">
            {/* Background grid/fx */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'linear-gradient(rgba(6,182,212,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.2) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }} />

            {/* Stream of tokens */}
            <div className="absolute inset-x-0 h-full overflow-hidden pointer-events-none">
                {tokens.map(token => (
                    <div
                        key={token.id}
                        className={`absolute text-[10px] font-mono whitespace-nowrap ${token.left
                            ? 'text-primary/40 animate-[flowRight_2s_ease-in_forwards]'
                            : 'text-primary-blue/40 animate-[flowLeft_2s_ease-in_forwards]'
                            }`}
                        style={{
                            top: `${token.top}%`,
                            animationDelay: `${token.delay}s`,
                        }}
                    >
                        {token.text}
                    </div>
                ))}
            </div>

            {/* Center Crystal Hero Moment */}
            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Glowing aura */}
                    <div className="absolute inset-[-30px] bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-[-10px] bg-primary-blue/30 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />

                    {/* Premium Orbital Rings */}
                    <div className="absolute w-28 h-28 border-[1px] border-primary/30 rounded-full animate-[spin_12s_linear_infinite]" style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
                    <div className="absolute w-32 h-32 border-[1px] border-primary-blue/20 rounded-full animate-[spin_18s_linear_infinite_reverse]" style={{ borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
                    <div className="absolute w-20 h-20 border border-primary/20 rounded-full animate-[spin_8s_linear_infinite]" style={{ borderStyle: 'dashed' }} />

                    {/* The Core Logo */}
                    <div className="relative w-14 h-14 z-10 animate-pulse drop-shadow-[0_0_25px_rgba(6,182,212,0.9)]" style={{ animationDuration: '2.5s' }}>
                        <Image src="/Crumbv2.png" alt="Crumb Logo" fill className="object-cover rounded-[10px]" />
                    </div>
                </div>

                <div className="text-center font-mono">
                    <p className="text-xs font-semibold text-text-bright mb-1 tracking-widest uppercase">Crystallizing Engine</p>
                    <p className="text-[10px] text-primary animate-pulse">Compressing timeline to essence...</p>
                </div>
            </div>

            {/* Required custom CSS for the stream animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes flowRight {
          0% { left: 0%; transform: scale(1); opacity: 0; }
          10% { opacity: 1; }
          70% { left: 40%; transform: scale(0.5); opacity: 0.8; }
          100% { left: 50%; transform: scale(0); opacity: 0; }
        }
        @keyframes flowLeft {
          0% { right: 0%; transform: scale(1); opacity: 0; }
          10% { opacity: 1; }
          70% { right: 40%; transform: scale(0.5); opacity: 0.8; }
          100% { right: 50%; transform: scale(0); opacity: 0; }
        }
      `}} />
        </div>
    )
}
