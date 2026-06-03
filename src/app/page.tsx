import Link from 'next/link'
import { Shield, Zap, Brain, TrendingDown, Check, ArrowRight } from 'lucide-react'
import { MONITORED_COINS, STABLECOINS } from '@/lib/coins'

const VERDICTS = [
  'DANGER',
  'CAUTION',
  'NEUTRAL',
  'NEUTRAL',
  'OPPORTUNITY',
  'CAUTION',
  'NEUTRAL',
  'DANGER',
  'CAUTION',
  'NEUTRAL',
]
const VERDICT_COLORS: Record<string, string> = {
  DANGER: 'border-red-500/40 bg-red-500/5 text-red-400',
  CAUTION: 'border-yellow-500/40 bg-yellow-500/5 text-yellow-400',
  NEUTRAL: 'border-gray-700 bg-gray-900 text-gray-500',
  OPPORTUNITY: 'border-green-500/40 bg-green-500/5 text-green-400',
}

export default function LandingPage() {
  const coins = Object.values(MONITORED_COINS)
  const stablecoins = Object.values(STABLECOINS)

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <span className="font-bold tracking-tight">CryptoGuardian</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/setup"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-blue-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
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
          CryptoGuardian monitors 10 volatile EVM coins every 15 minutes. Venice AI detects danger,
          auto-swaps to your chosen stablecoin, and buys back on opportunity — all within your
          limits, with no gas fees.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/setup"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold transition-colors hover:bg-blue-500"
          >
            Start Protecting <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-gray-700 px-8 py-3.5 text-base font-semibold transition-colors hover:border-gray-500"
          >
            View Live Demo
          </Link>
        </div>
      </section>

      {/* Live preview mockup */}
      <section className="mx-auto mb-20 max-w-6xl px-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-gray-800 pb-3">
            <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              ACTIVE
            </span>
            <span className="text-xs text-gray-500">Scanning 10 coins · Next run in 12m 30s</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {coins.map((coin, i) => {
              const v = VERDICTS[i] ?? 'NEUTRAL'
              return (
                <div
                  key={coin.symbol}
                  className={`rounded-lg border p-2.5 ${VERDICT_COLORS[v] ?? VERDICT_COLORS['NEUTRAL']}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold">{coin.symbol}</span>
                    {v === 'DANGER' && <span className="text-[10px]">🔴</span>}
                    {v === 'CAUTION' && <span className="text-[10px]">🟡</span>}
                    {v === 'NEUTRAL' && <span className="text-[10px]">⚪</span>}
                    {v === 'OPPORTUNITY' && <span className="text-[10px]">🟢</span>}
                  </div>
                  <div className="font-mono text-[10px] text-gray-500">{v}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-800 bg-gray-900/40 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <Brain className="h-7 w-7 text-purple-400" />,
                step: '01',
                title: 'Venice AI Monitors',
                desc: 'Every 15 minutes, Venice AI scans price momentum, breaking news, and Fear & Greed across all coins simultaneously.',
              },
              {
                icon: <TrendingDown className="h-7 w-7 text-red-400" />,
                step: '02',
                title: 'Danger Detected',
                desc: 'When a coin shows DANGER — sharp drop, bad news, extreme fear — the agent flags it as the priority action.',
              },
              {
                icon: <Shield className="h-7 w-7 text-green-400" />,
                step: '03',
                title: 'Auto-Protected',
                desc: 'Swaps execute via MetaMask Smart Account. Gas paid in your chosen stablecoin via 1Shot. Zero ETH needed.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-3 flex items-center justify-between">
                  {item.icon}
                  <span className="font-mono text-xs text-gray-600">{item.step}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stablecoins */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-2xl font-bold">Choose Your Safe Asset</h2>
          <p className="mb-10 text-center text-gray-400">
            Pick the stablecoin that DANGER swaps go into — not hardcoded, your choice.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stablecoins.map((stable) => (
              <div
                key={stable.symbol}
                className="rounded-xl border border-gray-800 bg-gray-900 p-4"
              >
                <div className="mb-2 text-lg font-bold">{stable.symbol}</div>
                <div className="mb-1 text-xs font-medium text-gray-300">{stable.name}</div>
                <div className="text-xs text-gray-500">{stable.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coins */}
      <section className="border-t border-gray-800 bg-gray-900/40 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-2xl font-bold">10 Coins Monitored</h2>
          <p className="mb-10 text-center text-gray-400">
            Toggle which ones you hold — agent only protects what you own.
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
                  <div className="text-sm font-semibold">{coin.symbol}</div>
                  <div className="text-xs text-gray-500">{coin.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features list */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-2xl font-bold">Everything Included</h2>
          <div className="space-y-3">
            {[
              'AI verdict for every coin every 15 minutes — DANGER / CAUTION / NEUTRAL / OPPORTUNITY',
              'Auto-swap on DANGER into your chosen stablecoin (USDC, USDT, DAI, or USDbC)',
              'Buy-back on OPPORTUNITY (aggressive mode)',
              'Per-coin limits: max single swap, daily cap, minimum to always keep',
              'Gas paid in stablecoin via 1Shot — zero ETH required',
              'One-time permission grant via MetaMask Smart Account — valid 30 days',
              'Full AI reasoning shown for every decision',
              'Real-time transaction feed with Basescan links',
            ].map((feat) => (
              <div
                key={feat}
                className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3"
              >
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                <span className="text-sm text-gray-300">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800 bg-gray-900/40 px-6 py-16 text-center">
        <h2 className="mb-3 text-3xl font-bold">Ready to protect your portfolio?</h2>
        <p className="mb-8 text-gray-400">Setup in 2 minutes. Protection for 30 days.</p>
        <Link
          href="/setup"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold transition-colors hover:bg-blue-500"
        >
          Connect Wallet & Start <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-600">
        Built for MetaMask Smart Accounts × 1Shot API × Venice AI Hackathon &middot;{' '}
        <a
          href="https://github.com/ryzen-xp/Crypto-Guardian"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400"
        >
          GitHub
        </a>
      </footer>
    </div>
  )
}
