'use client'

import { motion, Reorder, useDragControls } from 'framer-motion'
import type { Block, TechniqueId } from './types'
import { BLOCK_META, TECHNIQUES, FORMAT_CHIPS } from './constants'

export function BlockCard({ block, onChange, onDelete }: {
  block: Block
  onChange: (b: Block) => void
  onDelete: () => void
}) {
  const meta = BLOCK_META[block.type]
  const BlockIcon = meta.Icon
  const controls = useDragControls()

  return (
    <Reorder.Item value={block} dragListener={false} dragControls={controls} className="select-none">
      <motion.div
        layout
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96, y: -4 }}
        whileDrag={{ scale: 1.025, boxShadow: `0 20px 48px rgba(0,0,0,0.55), 0 0 0 1px ${meta.color}35` }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className="group relative mb-2.5"
        style={{ background: meta.bg, border: `1px solid ${meta.color}1e`, borderLeft: `3px solid ${meta.color}`, borderRadius: '4px' }}
        whileHover={{ boxShadow: `0 2px 20px rgba(0,0,0,0.3), 0 0 0 1px ${meta.color}28` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: `1px solid ${meta.color}18` }}>
          <span style={{
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px',
            color: meta.color, letterSpacing: '0.07em',
            background: `${meta.color}14`,
            border: `1px solid ${meta.color}28`,
            padding: '2px 8px 2px 6px', borderRadius: '3px',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
          }}>
            <BlockIcon size={11} strokeWidth={1.5} />
            {meta.label}
          </span>
          <div className="flex items-center gap-2.5">
            <div
              onPointerDown={e => controls.start(e)}
              className="cursor-grab active:cursor-grabbing touch-none transition-opacity"
              style={{ color: meta.color, opacity: 0.5 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              title="Drag to reorder">
              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                <circle cx="2.5" cy="2.5" r="1.3"/>
                <circle cx="7.5" cy="2.5" r="1.3"/>
                <circle cx="2.5" cy="7" r="1.3"/>
                <circle cx="7.5" cy="7" r="1.3"/>
                <circle cx="2.5" cy="11.5" r="1.3"/>
                <circle cx="7.5" cy="11.5" r="1.3"/>
              </svg>
            </div>
            <button onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-60"
              style={{ color: 'rgba(196,122,90,0.8)', fontSize: '13px', lineHeight: 1 }}>&#10005;</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {block.type === 'technique' ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(TECHNIQUES) as [TechniqueId, typeof TECHNIQUES[TechniqueId]][]).map(([id, tech]) => (
                  <button key={id} onClick={() => onChange({ ...block, techniqueId: id })}
                    className="text-[11px] px-2.5 py-1"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      transition: 'background 100ms ease, color 100ms ease, border-color 100ms ease',
                      ...(block.techniqueId === id
                        ? { color: '#080D08', background: '#A8D4BA', border: '1px solid #A8D4BA' }
                        : { color: 'rgba(168,212,186,0.8)', background: 'rgba(168,212,186,0.05)', border: '1px solid rgba(168,212,186,0.22)' }
                      ),
                    }}
                    onMouseEnter={e => { if (block.techniqueId !== id) { e.currentTarget.style.background = 'rgba(168,212,186,0.12)'; e.currentTarget.style.borderColor = 'rgba(168,212,186,0.38)'; e.currentTarget.style.color = 'rgba(168,212,186,1)' } }}
                    onMouseLeave={e => { if (block.techniqueId !== id) { e.currentTarget.style.background = 'rgba(168,212,186,0.05)'; e.currentTarget.style.borderColor = 'rgba(168,212,186,0.22)'; e.currentTarget.style.color = 'rgba(168,212,186,0.8)' } }}
                  >
                    {tech.label}
                  </button>
                ))}
              </div>
              {block.techniqueId && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <p style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12px', color: 'rgba(168,212,186,0.85)', lineHeight: '1.6' }}>
                    &rarr; {TECHNIQUES[block.techniqueId].content}
                  </p>
                  <p style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px', color: 'rgba(168,212,186,0.55)' }}>
                    {TECHNIQUES[block.techniqueId].description}
                  </p>
                </div>
              )}
            </div>
          ) : block.type === 'example' ? (
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[11px] mb-1.5" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(196,164,90,0.75)', letterSpacing: '0.07em' }}>INPUT</div>
                <textarea className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none"
                  style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
                  rows={2} placeholder="Example input..."
                  value={block.exampleInput || ''}
                  onChange={e => onChange({ ...block, exampleInput: e.target.value })} />
              </div>
              <div className="h-px" style={{ background: 'rgba(196,164,90,0.08)' }} />
              <div>
                <div className="text-[11px] mb-1.5" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(196,164,90,0.75)', letterSpacing: '0.07em' }}>EXPECTED OUTPUT</div>
                <textarea className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none"
                  style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
                  rows={2} placeholder="What the ideal response looks like..."
                  value={block.exampleOutput || ''}
                  onChange={e => onChange({ ...block, exampleOutput: e.target.value })} />
              </div>
            </div>
          ) : block.type === 'format' ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                {FORMAT_CHIPS.map(fmt => (
                  <button key={fmt} onClick={() => onChange({ ...block, content: fmt })}
                    className="text-[11px] px-2.5 py-1"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)', borderRadius: '2px',
                      transition: 'background 100ms ease, color 100ms ease, border-color 100ms ease',
                      ...(block.content === fmt
                        ? { color: '#080D08', background: '#7A8DC4', border: '1px solid #7A8DC4' }
                        : { color: 'rgba(122,141,196,0.82)', background: 'rgba(122,141,196,0.06)', border: '1px solid rgba(122,141,196,0.22)' }
                      ),
                    }}
                    onMouseEnter={e => { if (block.content !== fmt) { e.currentTarget.style.background = 'rgba(122,141,196,0.13)'; e.currentTarget.style.borderColor = 'rgba(122,141,196,0.38)'; e.currentTarget.style.color = 'rgba(122,141,196,1)' } }}
                    onMouseLeave={e => { if (block.content !== fmt) { e.currentTarget.style.background = 'rgba(122,141,196,0.06)'; e.currentTarget.style.borderColor = 'rgba(122,141,196,0.22)'; e.currentTarget.style.color = 'rgba(122,141,196,0.82)' } }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <div className="h-px" style={{ background: 'rgba(122,141,196,0.1)' }} />
              <input className="w-full bg-transparent text-sm focus:outline-none"
                style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
                placeholder="Or describe a custom format..."
                value={block.content} onChange={e => onChange({ ...block, content: e.target.value })} />
            </div>
          ) : (
            <textarea
              className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none"
              style={{ fontFamily: 'var(--font-dm-sans)', color: '#D4EDE0' }}
              rows={block.type === 'context' ? 4 : 2}
              placeholder={meta.placeholder}
              value={block.content}
              onChange={e => onChange({ ...block, content: e.target.value })}
            />
          )}
        </div>
      </motion.div>
    </Reorder.Item>
  )
}
