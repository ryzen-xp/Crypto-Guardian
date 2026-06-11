import Link from 'next/link'
import {
  Shield,
  Zap,
  Brain,
  TrendingDown,
  Check,
  ArrowRight,
  Activity,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { MONITORED_COINS, STABLECOINS } from '@/lib/coins'
import LiveMockup from '@/components/layout/LiveMockup'
import LandingPageClient from '@/components/layout/LandingPageClient'
import ConnectKitButtonWrapper from '@/components/wallet/ConnectKitButtonWrapper'

export default function LandingPage() {
  const stablecoins = Object.values(STABLECOINS)

  return (
    <LandingPageClient>
      <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <header className="border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold">CryptoGuardian</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:text-white"
            >
              Dashboard
            </Link>
            <ConnectKitButtonWrapper />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center lg:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
            <Zap className="h-3.5 w-3.5" />
            MetaMask Smart Accounts × Venice AI × 1Shot
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-7xl">
            Your portfolio,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
              guarded 24/7
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-400">
            AI monitors ETH, WBTC, LINK and UNI every 15 minutes. When danger hits, it auto-swaps to
            USDC or USDT — no manual signing, no gas fees, no sleepless nights.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ConnectKitButtonWrapper />
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold transition hover:bg-white/10"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Live mockup — fetches real prices client-side */}
      <section className="mx-auto mb-24 max-w-3xl px-4">
        <LiveMockup />
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 bg-white/2 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">How it works</h2>
            <p className="text-gray-400">Three steps. Fully automated. No ETH needed for gas.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Brain,
                iconColor: 'text-purple-400',
                iconBg: 'bg-purple-500/10',
                step: '01',
                title: 'AI Monitors Constantly',
                desc: 'Venice AI fetches live prices, scans breaking news, and checks Fear & Greed every 15 minutes across all 4 coins simultaneously.',
              },
              {
                icon: TrendingDown,
                iconColor: 'text-red-400',
                iconBg: 'bg-red-500/10',
                step: '02',
                title: 'Danger Detected',
                desc: 'Sharp drop + bad news + extreme fear triggers DANGER. The AI identifies the highest-risk coin and prepares a swap — within your preset limits.',
              },
              {
                icon: Shield,
                iconColor: 'text-green-400',
                iconBg: 'bg-green-500/10',
                step: '03',
                title: 'Auto-Swap Executes',
                desc: 'Swap runs via your MetaMask Smart Account. Gas is paid in USDC through 1Shot — no ETH required, no popup, no manual action.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-white/3 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg}`}
                  >
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <span className="font-mono text-xs font-bold text-gray-600">{item.step}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coins + Stablecoins */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 lg:grid-cols-2">
            {/* Coins */}
            <div>
              <h2 className="mb-2 text-2xl font-bold">4 EVM Tokens on Sepolia</h2>
              <p className="mb-8 text-sm text-gray-400">
                The blue chips and high-volatility L2s that move markets.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(MONITORED_COINS).map((coin) => (
                  <div
                    key={coin.symbol}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-sm font-bold">
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
            {/* Stablecoins */}
            <div>
              <h2 className="mb-2 text-2xl font-bold">2 Safe Assets</h2>
              <p className="mb-8 text-sm text-gray-400">Pick one. DANGER swaps always go here.</p>
              <div className="space-y-3">
                {stablecoins.map((stable) => (
                  <div
                    key={stable.symbol}
                    className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/3 p-4"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-400">
                      $
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{stable.symbol}</div>
                      <div className="text-xs text-gray-500">{stable.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-white/5 bg-white/2 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Everything you need</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Activity,
                title: 'Real-Time Verdicts',
                desc: 'DANGER / CAUTION / NEUTRAL / OPPORTUNITY per coin, refreshed every 15 minutes.',
              },
              {
                icon: Zap,
                title: 'Zero Gas Friction',
                desc: '1Shot Relayer pays all swap fees in USDC. You never need ETH in your wallet.',
              },
              {
                icon: Lock,
                title: 'One-Time Permissions',
                desc: 'MetaMask Smart Account grants protect you for 30 days without re-signing.',
              },
              {
                icon: Brain,
                title: 'AI with Web Search',
                desc: 'Venice AI reads breaking news, not just price charts. Context-aware verdicts.',
              },
              {
                icon: RefreshCw,
                title: 'Fully Autonomous',
                desc: 'Agent runs every 15 minutes in the background. Set limits and forget it.',
              },
              {
                icon: Shield,
                title: 'Your Limits Always Enforced',
                desc: 'Max swap, daily cap, minimum hold — all checked before any swap executes.',
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-white/8 bg-white/3 p-5">
                <f.icon className="mb-3 h-5 w-5 text-blue-400" />
                <h3 className="mb-1.5 text-sm font-semibold">{f.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-4xl font-bold">Start protecting today</h2>
          <p className="mb-10 text-gray-400">
            Connect MetaMask, select your coins, set your limits. Takes under 2 minutes.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ConnectKitButtonWrapper />
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 px-8 py-3.5 text-base font-semibold transition hover:bg-white/5"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features checklist */}
      <section className="border-t border-white/5 px-4 pb-16">
        <div className="mx-auto max-w-xl pt-12">
          <div className="grid grid-cols-2 gap-2">
            {[
              'Real MetaMask wallet',
              'Live CoinGecko prices',
              'Venice AI analysis',
              'Groq / Gemini fallback',
              'USDC or USDT swaps',
              'Ethereum Sepolia testnet',
              'No real funds at risk',
              'Open source on GitHub',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-400">
                <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-gray-600">
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
    </LandingPageClient>
  )
}
