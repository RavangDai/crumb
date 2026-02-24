'use client'

import { Waves } from '@/components/ui/wave-background'

export default function WaveBackground() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.5 }}>
            <Waves
                className="w-full h-full"
                strokeColor="rgba(6, 182, 212, 0.06)"
                backgroundColor="transparent"
                pointerSize={0.3}
            />
        </div>
    )
}
