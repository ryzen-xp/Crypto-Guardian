import Link from 'next/link'
import { Shield, Zap, Brain, TrendingDown } from 'lucide-react'
import { MONITORED_COINS } from '@/lib/coins'

export default function LandingPage() {
  const coins = Object.values(MONITORED_COINS)

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-bold tracking-tight">CryptoGuardian</span>
          </div>
          <Link
            href="/setup"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-blue-500"
          >
            Get Protected
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
          <Zap className="h-3.5 w-3.5" />
          MetaMask Smart Accounts × Venice AI × 1Shot
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
          Your portfolio,{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            protected by AI
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400">
          CryptoGuardian watches 10 volatile EVM coins simultaneously — every 15 minutes. When
          Venice AI detects danger, it auto-swaps to USDC. No gas needed. No manual signing. Just
          protection.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/setup"
            className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold transition-colors hover:bg-blue-500"
          >
            Start Protecting My Portfolio
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-gray-700 px-8 py-3.5 text-base font-semibold transition-colors hover:border-gray-500"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-gray-800 bg-gray-900/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <Brain className="h-8 w-8 text-purple-400" />,
                title: '1. Venice AI Monitors',
                desc: 'Every 15 minutes, Venice AI scans prices, news, and sentiment across all your coins simultaneously.',
              },
              {
                icon: <TrendingDown className="h-8 w-8 text-red-400" />,
                title: '2. Danger Detected',
                desc: 'When a coin shows DANGER signals — bad news, sharp drop, or extreme fear — the agent acts immediately.',
              },
              {
                icon: <Shield className="h-8 w-8 text-green-400" />,
                title: '3. Auto-Protected',
                desc: 'Swaps execute via your MetaMask Smart Account. Gas paid in USDC via 1Shot. No ETH needed, no signing required.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-4">{item.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coins */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold">10 Coins Monitored</h2>
          <p className="mb-12 text-center text-gray-400">
            All major volatile EVM coins — you choose which ones to protect
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {coins.map((coin) => (
              <div
                key={coin.symbol}
                className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-sm font-bold">
                  {coin.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-medium">{coin.symbol}</div>
                  <div className="text-xs text-gray-500">{coin.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800 bg-gray-900/50 px-6 py-20 text-center">
        <h2 className="mb-4 text-3xl font-bold">Ready to protect your portfolio?</h2>
        <p className="mb-8 text-gray-400">Setup takes 2 minutes. Protection lasts 30 days.</p>
        <Link
          href="/setup"
          className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold transition-colors hover:bg-blue-500"
        >
          Connect Wallet & Start
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-500">
        <p>
          Built for the MetaMask Smart Accounts Kit × 1Shot API × Venice AI Hackathon &middot;{' '}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300"
          >
            GitHub
          </a>
        </p>
      </footer>
    </main>
  )
}
