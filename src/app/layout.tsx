import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Providers from '@/providers/Providers'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'

export const metadata: Metadata = {
  title: `CryptoGuardian — AI Portfolio Protection${isTestnet ? ' (Testnet)' : ''}`,
  description:
    'AI-powered portfolio protection agent. Monitors ETH, WBTC, ARB and OP every 15 minutes. Auto-swaps to safety on danger.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-gray-950 text-white antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
