import type { Metadata } from 'next'
import './globals.css'
import 'katex/dist/katex.min.css'
import { AuthProvider } from '@/components/providers/auth-provider'

// Use system fonts - no Google Fonts download required
const systemFontClass = "font-sans"

export const metadata: Metadata = {
  title: 'AllergyAI - Your Expert Allergist Assistant',
  description: 'AI-powered allergy management and advice',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={systemFontClass}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

