'use client'

import { useEffect, useRef } from 'react'

export default function WaveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationId: number
        let time = 0

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        const waveConfigs = [
            { amplitude: 60, frequency: 0.008, speed: 0.012, yOffset: 0.35, color: 'rgba(6, 182, 212, 0.08)', lineWidth: 1.5 },
            { amplitude: 45, frequency: 0.012, speed: 0.018, yOffset: 0.40, color: 'rgba(6, 182, 212, 0.12)', lineWidth: 1.2 },
            { amplitude: 70, frequency: 0.006, speed: 0.008, yOffset: 0.45, color: 'rgba(59, 130, 246, 0.07)', lineWidth: 1.8 },
            { amplitude: 35, frequency: 0.015, speed: 0.025, yOffset: 0.50, color: 'rgba(6, 182, 212, 0.15)', lineWidth: 1 },
            { amplitude: 55, frequency: 0.010, speed: 0.015, yOffset: 0.55, color: 'rgba(59, 130, 246, 0.10)', lineWidth: 1.4 },
            { amplitude: 40, frequency: 0.018, speed: 0.022, yOffset: 0.48, color: 'rgba(6, 182, 212, 0.06)', lineWidth: 0.8 },
            { amplitude: 80, frequency: 0.005, speed: 0.010, yOffset: 0.42, color: 'rgba(59, 130, 246, 0.05)', lineWidth: 2 },
            { amplitude: 30, frequency: 0.020, speed: 0.030, yOffset: 0.52, color: 'rgba(6, 182, 212, 0.10)', lineWidth: 0.6 },
        ]

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            time += 1

            for (const wave of waveConfigs) {
                ctx.beginPath()
                ctx.strokeStyle = wave.color
                ctx.lineWidth = wave.lineWidth

                const baseY = canvas.height * wave.yOffset

                for (let x = 0; x <= canvas.width; x += 2) {
                    const y = baseY +
                        Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude +
                        Math.sin(x * wave.frequency * 1.5 + time * wave.speed * 0.7) * (wave.amplitude * 0.4) +
                        Math.cos(x * wave.frequency * 0.5 + time * wave.speed * 1.3) * (wave.amplitude * 0.3)

                    if (x === 0) {
                        ctx.moveTo(x, y)
                    } else {
                        ctx.lineTo(x, y)
                    }
                }

                ctx.stroke()
            }

            // Floating particles / dots
            for (let i = 0; i < 12; i++) {
                const px = ((Math.sin(time * 0.005 + i * 2.1) + 1) / 2) * canvas.width
                const py = ((Math.cos(time * 0.008 + i * 1.7) + 1) / 2) * canvas.height * 0.6 + canvas.height * 0.2
                const size = 1.5 + Math.sin(time * 0.02 + i) * 0.5
                const alpha = 0.15 + Math.sin(time * 0.015 + i * 0.5) * 0.1

                ctx.beginPath()
                ctx.fillStyle = i % 2 === 0
                    ? `rgba(6, 182, 212, ${alpha})`
                    : `rgba(59, 130, 246, ${alpha})`
                ctx.arc(px, py, size, 0, Math.PI * 2)
                ctx.fill()
            }

            animationId = requestAnimationFrame(draw)
        }

        draw()

        return () => {
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.9 }}
        />
    )
}
