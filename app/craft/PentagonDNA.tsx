'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DNAScore } from './types'
import { AXIS_TOOLTIPS } from './constants'

export function PentagonDNA({ score }: { score: DNAScore }) {
  const [showBars, setShowBars] = useState(false)
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const displayScoreRef = useRef(0)

  const axes = [
    { label: 'Clarity',    value: score.clarity },
    { label: 'Specific',   value: score.specificity },
    { label: 'Structure',  value: score.structure },
    { label: 'Context',    value: score.context },
    { label: 'Guardrails', value: score.guardrails },
  ]

  const overall = Math.round(axes.reduce((s, a) => s + a.value, 0) / axes.length)

  useEffect(() => {
    const target = overall
    const start = displayScoreRef.current
    if (start === target) return
    const duration = 700
    const startTime = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(start + (target - start) * eased)
      displayScoreRef.current = current
      setDisplayScore(current)
      if (t < 1) { raf = requestAnimationFrame(tick) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [overall])

  const cx = 140, cy = 148, R = 88
  const pt = (i: number, r: number) => ({
    x: cx + r * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
    y: cy + r * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
  })
  const rings = [0.25, 0.5, 0.75, 1]
  const outer = axes.map((_, i) => pt(i, R))
  const data  = axes.map((ax, i) => pt(i, (ax.value / 100) * R))
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'

  const ringR = 36
  const ringCirc = 2 * Math.PI * ringR
  const ringColor = overall > 65 ? '#5DFFA8' : overall > 35 ? '#2D9E6B' : '#C47A5A'

  return (
    <div className="flex flex-col items-center gap-4 w-full"
      onMouseEnter={() => setShowBars(true)}
      onMouseLeave={() => { setShowBars(false); setHoveredAxis(null) }}>

      <svg width="100%" height="auto" viewBox="0 0 280 296" style={{ maxWidth: '280px' }}>
        {rings.map(r => (
          <path key={r} d={toPath(axes.map((_, i) => pt(i, R * r)))}
            fill="none" stroke="rgba(45,158,107,0.1)" strokeWidth="1" />
        ))}
        {outer.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
            stroke="rgba(45,158,107,0.08)" strokeWidth="1" />
        ))}
        <path d={toPath(outer)} fill="none" stroke="rgba(45,158,107,0.2)" strokeWidth="1" />
        <motion.path
          d={toPath(data)}
          fill="rgba(45,158,107,0.1)"
          stroke="#2D9E6B" strokeWidth="2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
        {data.map((p, i) => (
          <motion.circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4.5"
            fill={axes[i].value > 65 ? '#5DFFA8' : axes[i].value > 35 ? '#2D9E6B' : '#C47A5A'}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 300 }}
          />
        ))}

        {outer.map((p, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
          const lx = cx + (R + 28) * Math.cos(angle)
          const ly = cy + (R + 28) * Math.sin(angle)
          const isHovered = hoveredAxis === i
          const isHighVal = axes[i].value > 65
          return (
            <g key={i}
              onMouseEnter={() => setHoveredAxis(i)}
              onMouseLeave={() => setHoveredAxis(null)}
              style={{ cursor: 'help' }}>
              <text
                x={lx.toFixed(1)} y={ly.toFixed(1)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="11"
                fill={isHighVal ? 'rgba(93,255,168,0.9)' : isHovered ? 'rgba(212,237,224,0.9)' : 'rgba(141,184,154,0.7)'}
                fontFamily="var(--font-jetbrains-mono)"
                style={{ transition: 'fill 0.15s' }}>
                {axes[i].label}
              </text>
              <rect x={lx - 36} y={ly - 12} width="72" height="24" fill="transparent" />
            </g>
          )
        })}

        <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="rgba(45,158,107,0.12)" strokeWidth="3" />
        <motion.circle
          cx={cx} cy={cy} r={ringR}
          fill="none"
          stroke={ringColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={ringCirc}
          initial={{ strokeDashoffset: ringCirc }}
          animate={{ strokeDashoffset: (1 - overall / 100) * ringCirc }}
          transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="700"
          fill="#D4EDE0" fontFamily="var(--font-sora)">{displayScore}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9"
          fill="rgba(141,184,154,0.5)" fontFamily="var(--font-jetbrains-mono)" letterSpacing="0.15em">SCORE</text>
      </svg>

      <AnimatePresence>
        {hoveredAxis !== null && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="w-full px-3 py-2 text-center"
            style={{
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: '10px',
              color: 'rgba(141,184,154,0.75)',
              background: 'rgba(13,21,13,0.7)',
              border: '1px solid rgba(45,158,107,0.12)',
              borderRadius: '2px',
            }}>
            <span style={{ color: 'rgba(212,237,224,0.9)', fontWeight: 600 }}>{axes[hoveredAxis].label}: </span>
            {AXIS_TOOLTIPS[hoveredAxis]}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBars && (
          <motion.div
            className="w-full flex flex-col gap-2.5 px-1 overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}>
            {axes.map(ax => (
              <div key={ax.label} className="flex items-center gap-3">
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(141,184,154,0.75)', width: '68px', flexShrink: 0 }}>
                  {ax.label}
                </span>
                <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(45,158,107,0.1)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: ax.value > 65 ? '#5DFFA8' : ax.value > 35 ? '#2D9E6B' : '#C47A5A' }}
                    initial={{ width: 0 }} animate={{ width: `${ax.value}%` }}
                    transition={{ duration: 0.5 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(141,184,154,0.6)', width: '28px', textAlign: 'right', flexShrink: 0 }}>
                  {ax.value}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
