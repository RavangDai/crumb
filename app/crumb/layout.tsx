import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crumb',
  description: 'Compress AI conversations into portable .crumb files that restore your full context anywhere, instantly.',
  openGraph: {
    title: 'Crumb',
    description: 'Compress AI conversations into portable .crumb files that restore your full context anywhere, instantly.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crumb',
    description: 'Compress AI conversations into portable .crumb files that restore your full context anywhere.',
  },
}

export default function CrumbLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
