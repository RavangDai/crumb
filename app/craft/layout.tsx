import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Craft',
  description: 'Build powerful AI prompts with structure, techniques, and AI-assisted generation. Turn vague ideas into expert-level prompts.',
  openGraph: {
    title: 'Craft',
    description: 'Build powerful AI prompts with structure, techniques, and AI-assisted generation. Turn vague ideas into expert-level prompts.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Craft',
    description: 'Turn vague ideas into expert-level AI prompts with Craft.',
  },
}

export default function CraftLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
