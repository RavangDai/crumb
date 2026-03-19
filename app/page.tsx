'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { TransitionLink } from '@/context/transition'

export default function CrumbCraftLanding() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#020810', color: '#fff' }}>

      {/* ─── Wordmark ─── */}
      <div className="relative z-20 flex flex-col items-center pt-8 sm:pt-10 pb-4">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            filter: 'drop-shadow(0 0 28px rgba(6,182,212,0.18)) drop-shadow(0 0 56px rgba(16,253,172,0.07))',
          }}
        >
          <Image
            src="/leafcrumbcraft.png"
            alt="CrumbCraft"
            width={28}
            height={28}
            className="h-6 sm:h-7 w-auto object-contain opacity-80"
            priority
          />
          <span
            className="font-heading tracking-[0.18em]"
            style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.05rem)' }}
          >
            <span style={{ color: '#6B7280', fontWeight: 700 }}>CRUMB</span>
            <span style={{ color: '#374151', fontWeight: 400 }}>CRAFT</span>
          </span>
        </motion.div>
      </div>

      {/* ─── Split Hero ─── */}
      <div className="flex-1 flex flex-col md:flex-row">

        {/* ── Left: Crumb ── */}
        <TransitionLink
          href="/crumb"
          type="crumb"
          className="group relative flex-1 flex flex-col items-center justify-center min-h-[50vh] md:min-h-0 p-8 sm:p-12 md:p-20 transition-[filter] duration-500 hover:brightness-[1.12]"
          style={{ background: '#040D12' }}
        >
          {/* Hover border glow */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 100px rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.1)' }}
          />

          {/* Ambient radial */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(6,182,212,0.055) 0%, transparent 100%)' }}
          />

          {/* Sonar decoration */}
          <svg
            className="absolute bottom-8 right-8 w-32 h-32 opacity-[0.06] pointer-events-none"
            viewBox="0 0 128 128" fill="none"
          >
            <circle cx="64" cy="64" r="24" stroke="#06B6D4" strokeWidth="0.8" />
            <circle cx="64" cy="64" r="44" stroke="#06B6D4" strokeWidth="0.8" />
            <circle cx="64" cy="64" r="62" stroke="#06B6D4" strokeWidth="0.5" />
          </svg>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.25 }}
            className="relative z-10 flex flex-col items-center text-center gap-7"
          >
            {/* Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 relative opacity-90 group-hover:opacity-100 transition-opacity duration-300"
              style={{ filter: 'drop-shadow(0 0 18px rgba(6,182,212,0.15))' }}>
              <Image src="/Crumbv2.png" alt="Crumb" fill className="object-contain" />
            </div>

            {/* Name + divider */}
            <div className="flex flex-col items-center gap-2">
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: '#E8F4F8' }}>Crumb</h2>
              <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.6), transparent)' }} />
            </div>

            {/* Pitch */}
            <p className="text-sm leading-relaxed max-w-[240px] sm:max-w-[260px] font-mono text-center" style={{ color: 'rgba(6,182,212,0.55)' }}>
              Compress AI context into portable files that restore sessions anywhere.
            </p>

            {/* CTA */}
            <div
              className="flex items-center gap-2 text-sm font-mono mt-1 px-4 py-2 rounded-full transition-all duration-300 group-hover:bg-cyan-500/10"
              style={{ color: '#06B6D4', border: '1px solid rgba(6,182,212,0.15)' }}
            >
              <span>Open Crumb</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="translate-x-0 group-hover:translate-x-1.5 transition-transform duration-300"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </motion.div>
        </TransitionLink>

        {/* ── Divider ── */}
        <div
          className="hidden md:block w-px self-stretch flex-shrink-0"
          style={{ background: 'linear-gradient(to bottom, transparent 5%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.05) 60%, transparent 95%)' }}
        />
        <div
          className="md:hidden h-px w-full flex-shrink-0"
          style={{ background: 'linear-gradient(to right, transparent 5%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.05) 60%, transparent 95%)' }}
        />

        {/* ── Right: Craft ── */}
        <TransitionLink
          href="/craft"
          type="craft"
          className="group relative flex-1 flex flex-col items-center justify-center min-h-[50vh] md:min-h-0 p-8 sm:p-12 md:p-20 transition-[filter] duration-500 hover:brightness-[1.12]"
          style={{ background: '#080D08' }}
        >
          {/* Hover border glow */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 100px rgba(45,158,107,0.07)', border: '1px solid rgba(45,158,107,0.1)' }}
          />

          {/* Ambient radial */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(45,158,107,0.065) 0%, transparent 100%)' }}
          />

          {/* Grid decoration */}
          <div
            className="absolute top-8 left-8 w-28 h-28 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(45,158,107,1) 1px, transparent 1px), linear-gradient(90deg, rgba(45,158,107,1) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.35 }}
            className="relative z-10 flex flex-col items-center text-center gap-7"
          >
            {/* Craft logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 relative opacity-85 group-hover:opacity-100 transition-opacity duration-300"
              style={{ filter: 'drop-shadow(0 0 18px rgba(45,158,107,0.15))' }}>
              <Image src="/Craftv2.png" alt="Craft" fill className="object-contain" />
            </div>

            {/* Name + divider */}
            <div className="flex flex-col items-center gap-2">
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: '#D4EDE0' }}>Craft</h2>
              <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(45,158,107,0.6), transparent)' }} />
            </div>

            {/* Pitch */}
            <p className="text-sm leading-relaxed max-w-[240px] sm:max-w-[260px] font-mono text-center" style={{ color: 'rgba(45,158,107,0.6)' }}>
              Build smarter prompts with structure, AI-ready templates, and guided builders.
            </p>

            {/* CTA */}
            <div
              className="flex items-center gap-2 text-sm font-mono mt-1 px-4 py-2 rounded-full transition-all duration-300 group-hover:bg-emerald-500/10"
              style={{ color: '#2D9E6B', border: '1px solid rgba(45,158,107,0.15)' }}
            >
              <span>Open Craft</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="translate-x-0 group-hover:translate-x-1.5 transition-transform duration-300"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </motion.div>
        </TransitionLink>
      </div>

      {/* ─── Footer ─── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.75 }}
        className="relative z-20 flex justify-center py-5"
        style={{ background: '#020810' }}
      >
        <span className="font-mono text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.1)' }}>
          crumbcraft · 2026
        </span>
      </motion.footer>

    </main>
  )
}
