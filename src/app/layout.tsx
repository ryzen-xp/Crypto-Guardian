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

const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
const explorerUrl = isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org'
const chainName = isTestnet ? 'Base Sepolia Testnet' : 'Base Mainnet'

export const metadata: Metadata = {
  title: `CryptoGuardian — AI Portfolio Protection${isTestnet ? ' (Testnet)' : ''}`,
  description:
    'AI-powered portfolio protection agent. Monitors volatile EVM coins, auto-swaps to stablecoins on danger — powered by Venice AI, MetaMask Smart Accounts, and 1Shot.',
  keywords: ['crypto', 'DeFi', 'portfolio', 'AI', 'protection', 'MetaMask', 'Base'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="explorer-url" content={explorerUrl} />
        <meta name="chain-name" content={chainName} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-gray-950 text-white antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
