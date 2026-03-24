import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Crumb — AI Memory Compression'
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0B1929 0%, #040D12 100%)',
          fontFamily: 'system-ui, sans-serif',
          gap: 28,
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(6,182,212,0.07) 0%, transparent 100%)' }} />

        <div style={{ fontSize: 14, color: 'rgba(6,182,212,0.4)', letterSpacing: 6, textTransform: 'uppercase' }}>CrumbCraft</div>

        <div style={{ fontSize: 72, fontWeight: 700, color: '#E8F4F8', letterSpacing: -2 }}>Crumb</div>

        <div style={{ width: 48, height: 2, background: 'rgba(6,182,212,0.5)' }} />

        <div style={{ fontSize: 22, color: 'rgba(6,182,212,0.55)', textAlign: 'center', maxWidth: 560, lineHeight: 1.6 }}>
          Compress AI conversations into portable .crumb files that restore your full context anywhere, instantly.
        </div>

        <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(6,182,212,0.25)', letterSpacing: 4, textTransform: 'uppercase' }}>crumbcraft.app</div>
      </div>
    ),
    { ...size }
  )
}
