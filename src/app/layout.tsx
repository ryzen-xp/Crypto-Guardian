import type { Metadata } from 'next'
import Providers from '@/providers/Providers'
import './globals.css'

const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'

export const metadata: Metadata = {
  title: `CryptoGuardian — AI Portfolio Protection${isTestnet ? ' (Testnet)' : ''}`,
  description:
    'AI-powered portfolio protection agent. Monitors ETH, WBTC, LINK and UNI every 15 minutes. Auto-swaps to safety on danger.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
