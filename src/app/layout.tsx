import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CryptoGuardian — AI Portfolio Protection',
  description:
    'AI-powered portfolio protection agent. Monitors 10 volatile EVM coins, auto-swaps to USDC on danger — powered by Venice AI, MetaMask Smart Accounts, and 1Shot.',
  keywords: ['crypto', 'DeFi', 'portfolio', 'AI', 'protection', 'MetaMask', 'Base'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-gray-950 text-white antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
