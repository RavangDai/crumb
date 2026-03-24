import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'CrumbCraft — AI Memory Compression & Prompt Crafting'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#020810',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Left: Crumb */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#040D12', gap: 20 }}>
          <div style={{ width: 64, height: 2, background: 'rgba(6,182,212,0.5)' }} />
          <div style={{ fontSize: 52, fontWeight: 700, color: '#E8F4F8', letterSpacing: -1 }}>Crumb</div>
          <div style={{ fontSize: 16, color: 'rgba(6,182,212,0.55)', textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>
            Compress AI conversations into portable memory files
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.05)', alignSelf: 'stretch' }} />

        {/* Right: Craft */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080D08', gap: 20 }}>
          <div style={{ width: 64, height: 2, background: 'rgba(45,158,107,0.5)' }} />
          <div style={{ fontSize: 52, fontWeight: 700, color: '#D4EDE0', letterSpacing: -1 }}>Craft</div>
          <div style={{ fontSize: 16, color: 'rgba(45,158,107,0.6)', textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>
            Build expert-level AI prompts from any idea
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
