'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TType = 'crumb' | 'craft' | 'home'
type TPhase = 'idle' | 'covering' | 'covered' | 'uncovering'

interface CtxValue {
  trigger: (href: string, type: TType) => void
  phase: TPhase
}

// ─── Context ─────────────────────────────────────────────────────────────────

const Ctx = createContext<CtxValue>({ trigger: () => {}, phase: 'idle' })

// Cubic bezier: quick start, smooth settle
const EASE = [0.76, 0, 0.24, 1] as const

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [phase, setPhase] = useState<TPhase>('idle')
  const [type, setType] = useState<TType>('crumb')
  const [tick, setTick] = useState(0) // forces ring/deco re-mount each transition
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const trigger = useCallback(
    (href: string, t: TType) => {
      // Clear any in-flight timers
      timers.current.forEach(clearTimeout)
      timers.current = []

      setType(t)
      setTick(n => n + 1)
      setPhase('covering')

      const t1 = setTimeout(() => {
        setPhase('covered')
        router.push(href)

        const t2 = setTimeout(() => {
          setPhase('uncovering')

          const t3 = setTimeout(() => {
            setPhase('idle')
          }, 460)
          timers.current.push(t3)
        }, 90)
        timers.current.push(t2)
      }, 390)
      timers.current.push(t1)
    },
    [router],
  )

  return (
    <Ctx.Provider value={{ trigger, phase }}>
      {children}
      <TransitionOverlay phase={phase} type={type} tick={tick} />
    </Ctx.Provider>
  )
}

export const usePageTransition = () => useContext(Ctx)

// ─── TransitionLink ───────────────────────────────────────────────────────────

export function TransitionLink({
  href,
  type,
  children,
  className,
  style,
  ...rest
}: {
  href: string
  type: TType
  children: ReactNode
  className?: string
  style?: CSSProperties
  [key: string]: unknown
}) {
  const { trigger, phase } = usePageTransition()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let modifier-key clicks work normally (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (phase !== 'idle') return
    trigger(href, type)
  }

  return (
    <a href={href} onClick={handleClick} className={className} style={style} {...rest}>
      {children}
    </a>
  )
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

function TransitionOverlay({ phase, type, tick }: { phase: TPhase; type: TType; tick: number }) {
  const active = phase !== 'idle'

  if (type === 'crumb') return <CrumbOverlay phase={phase} active={active} tick={tick} />
  if (type === 'craft') return <CraftOverlay phase={phase} active={active} tick={tick} />
  return <HomeOverlay phase={phase} active={active} />
}

// ─── Crumb Overlay ────────────────────────────────────────────────────────────
// Navy slab slides in from LEFT → exits to RIGHT
// Leading edge: bright cyan right-side glow
// Decorative: sonar rings expand from center

function CrumbOverlay({ phase, active, tick }: { phase: TPhase; active: boolean; tick: number }) {
  const xVal =
    phase === 'idle' ? '-100%' :
    phase === 'uncovering' ? '100%' :
    '0%'

  const glowVal =
    phase === 'covering'
      ? '5px 0 35px rgba(6,182,212,0.85), 1px 0 6px rgba(6,182,212,1)'
      : '5px 0 0px rgba(6,182,212,0), 1px 0 0px rgba(6,182,212,0)'

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0,
        background: '#040D12',
        zIndex: 9999,
        pointerEvents: active ? 'all' : 'none',
        overflow: 'hidden',
      }}
      animate={{ x: xVal, boxShadow: glowVal }}
      initial={false}
      transition={{
        x: {
          duration: phase === 'idle' ? 0 : phase === 'uncovering' ? 0.46 : 0.39,
          ease: phase === 'idle' ? [0, 0, 1, 1] : EASE,
        },
        boxShadow: { duration: phase === 'covering' ? 0.08 : 0.22, ease: 'linear' },
      }}
    >
      {/* Ambient cyan radial */}
      <motion.div
        animate={{ opacity: active ? 0.07 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 55% 55% at 50% 45%, rgba(6,182,212,1) 0%, transparent 100%)',
        }}
      />

      {/* Sonar rings — re-mount each transition via tick in key */}
      {active && [0, 1, 2].map(i => (
        <motion.div
          key={`sonar-${tick}-${i}`}
          initial={{ scale: 0.08, opacity: 0.75 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 1.4, delay: i * 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: 90, height: 90,
            marginLeft: -45, marginTop: -45,
            borderRadius: '50%',
            border: `1px solid rgba(6,182,212,${0.7 - i * 0.15})`,
          }}
        />
      ))}

      {/* Scan-line sweep (subtle horizontal shimmer) */}
      {active && (
        <motion.div
          key={`scan-${tick}`}
          initial={{ y: '-5%', opacity: 0 }}
          animate={{ y: '110%', opacity: [0, 0.12, 0.12, 0] }}
          transition={{ duration: 0.8, ease: 'linear', times: [0, 0.1, 0.9, 1] }}
          style={{
            position: 'absolute', left: 0, right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.9), transparent)',
          }}
        />
      )}
    </motion.div>
  )
}

// ─── Craft Overlay ────────────────────────────────────────────────────────────
// Forest slab slides in from RIGHT → exits to LEFT
// Leading edge: green left-side glow
// Decorative: grid materialises + core glow

function CraftOverlay({ phase, active, tick }: { phase: TPhase; active: boolean; tick: number }) {
  const xVal =
    phase === 'idle' ? '100%' :
    phase === 'uncovering' ? '-100%' :
    '0%'

  const glowVal =
    phase === 'covering'
      ? '-5px 0 35px rgba(45,158,107,0.85), -1px 0 6px rgba(45,158,107,1)'
      : '-5px 0 0px rgba(45,158,107,0), -1px 0 0px rgba(45,158,107,0)'

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0,
        background: '#080D08',
        zIndex: 9999,
        pointerEvents: active ? 'all' : 'none',
        overflow: 'hidden',
      }}
      animate={{ x: xVal, boxShadow: glowVal }}
      initial={false}
      transition={{
        x: {
          duration: phase === 'idle' ? 0 : phase === 'uncovering' ? 0.46 : 0.39,
          ease: phase === 'idle' ? [0, 0, 1, 1] : EASE,
        },
        boxShadow: { duration: phase === 'covering' ? 0.08 : 0.22, ease: 'linear' },
      }}
    >
      {/* Grid pattern — fades in on cover */}
      <motion.div
        animate={{ opacity: active ? 0.055 : 0 }}
        transition={{ duration: 0.35 }}
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(45,158,107,1) 1px, transparent 1px), linear-gradient(90deg, rgba(45,158,107,1) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Radial core glow */}
      <motion.div
        animate={{ opacity: active ? 0.1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 50% 50% at 50% 45%, rgba(45,158,107,1) 0%, transparent 100%)',
        }}
      />

      {/* Corner dot burst — top-left grid origin */}
      {active && [0, 1, 2].map(i => (
        <motion.div
          key={`dot-${tick}-${i}`}
          initial={{ scale: 0.1, opacity: 0.8 }}
          animate={{ scale: 5, opacity: 0 }}
          transition={{ duration: 1.2, delay: i * 0.18, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: 60, height: 60,
            marginLeft: -30, marginTop: -30,
            border: `1px solid rgba(93,255,168,${0.6 - i * 0.15})`,
            borderRadius: 4,
          }}
        />
      ))}

      {/* Vertical scan sweep (right-to-left) */}
      {active && (
        <motion.div
          key={`vscan-${tick}`}
          initial={{ y: '110%', opacity: 0 }}
          animate={{ y: '-5%', opacity: [0, 0.1, 0.1, 0] }}
          transition={{ duration: 0.7, ease: 'linear', times: [0, 0.1, 0.9, 1] }}
          style={{
            position: 'absolute', left: 0, right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(45,158,107,0.9), transparent)',
          }}
        />
      )}
    </motion.div>
  )
}

// ─── Home Overlay ─────────────────────────────────────────────────────────────
// Two curtains close inward from both edges to center
// Seam: glowing vertical line where they meet
// Open outward to reveal landing

function HomeOverlay({ phase, active }: { phase: TPhase; active: boolean }) {
  const leftX =
    phase === 'idle' ? '-100%' :
    phase === 'uncovering' ? '-100%' :
    '0%'

  const rightX =
    phase === 'idle' ? '100%' :
    phase === 'uncovering' ? '100%' :
    '0%'

  const seamOpacity =
    phase === 'covering' || phase === 'covered' ? 1 : 0

  return (
    <>
      {/* ── Left curtain (Crumb navy) ── */}
      <motion.div
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '50vw', height: '100%',
          background: 'linear-gradient(to right, #030C12, #051624)',
          zIndex: 9999,
          pointerEvents: active ? 'all' : 'none',
          overflow: 'hidden',
        }}
        animate={{ x: leftX }}
        initial={false}
        transition={{
          duration: phase === 'idle' ? 0 : 0.40,
          ease: EASE,
        }}
      >
        {/* Sonar decoration on left half */}
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.06 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 85% 50%, rgba(6,182,212,1) 0%, transparent 70%)',
            }}
          />
        )}
      </motion.div>

      {/* ── Right curtain (Craft forest) ── */}
      <motion.div
        style={{
          position: 'fixed', top: 0, right: 0,
          width: '50vw', height: '100%',
          background: 'linear-gradient(to left, #060C06, #081209)',
          zIndex: 9999,
          pointerEvents: active ? 'all' : 'none',
          overflow: 'hidden',
        }}
        animate={{ x: rightX }}
        initial={false}
        transition={{
          duration: phase === 'idle' ? 0 : 0.40,
          ease: EASE,
        }}
      >
        {/* Grid decoration on right half */}
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.045 }}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage:
                'linear-gradient(rgba(45,158,107,1) 1px, transparent 1px), linear-gradient(90deg, rgba(45,158,107,1) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
            }}
          />
        )}
      </motion.div>

      {/* ── Center seam ── */}
      <motion.div
        style={{
          position: 'fixed', top: 0, left: '50%',
          width: 1, height: '100%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          pointerEvents: 'none',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(6,182,212,0.4) 30%, rgba(255,255,255,0.6) 50%, rgba(45,158,107,0.4) 70%, transparent 100%)',
        }}
        animate={{ opacity: seamOpacity, scaleY: seamOpacity }}
        initial={false}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
      />
    </>
  )
}
