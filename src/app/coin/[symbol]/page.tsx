'use client'

import { use } from 'react'
import { ArrowLeft, ExternalLink, Brain } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import VerdictBadge from '@/components/dashboard/VerdictBadge'
import AgentFeed from '@/components/dashboard/AgentFeed'
import { MONITORED_COINS } from '@/lib/coins'
import { CHAIN_CONFIG } from '@/lib/chain-config'
import { cn, formatUSD, formatChange } from '@/lib/utils'
import { useAgentStore } from '@/store/agentStore'
import { DEMO_PRICES, DEMO_VERDICTS, DEMO_NEWS, DEMO_ACTIONS } from '@/lib/demo-data'
import type { Verdict } from '@/lib/types'

const VERDICT_HISTORY: { time: string; verdict: Verdict }[] = [
  { time: '15m ago', verdict: 'DANGER' },
  { time: '30m ago', verdict: 'CAUTION' },
  { time: '45m ago', verdict: 'CAUTION' },
  { time: '1h ago', verdict: 'NEUTRAL' },
  { time: '1h 15m ago', verdict: 'NEUTRAL' },
  { time: '1h 30m ago', verdict: 'OPPORTUNITY' },
]

export default function CoinDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params)
  const upperSymbol = symbol.toUpperCase()
  const coin = MONITORED_COINS[upperSymbol]

  const { verdicts, newsSnippets } = useAgentStore()
  const liveVerdict = verdicts[upperSymbol]
  const verdict = liveVerdict ?? DEMO_VERDICTS[upperSymbol] ?? 'NEUTRAL'

  const priceData = DEMO_PRICES[upperSymbol]
  const news = newsSnippets[upperSymbol] ?? DEMO_NEWS[upperSymbol] ?? 'No news available.'
  const coinActions = DEMO_ACTIONS.filter((a) => a.coin === upperSymbol)

  if (!coin) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-gray-400">Coin &quot;{upperSymbol}&quot; not found.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
            ← Back to Dashboard
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-6 flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Header card */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-xl font-bold">
                {coin.symbol.slice(0, 2)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{coin.symbol}</h1>
                <p className="text-gray-400">{coin.name}</p>
              </div>
            </div>
            <VerdictBadge verdict={verdict} size="lg" />
          </div>

          {priceData && (
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-800 pt-5 sm:grid-cols-4">
              <div>
                <div className="text-xs text-gray-500">Price</div>
                <div className="font-mono text-lg font-bold">
                  {priceData.usd < 0.001
                    ? priceData.usd.toFixed(8)
                    : priceData.usd < 1
                      ? priceData.usd.toFixed(4)
                      : formatUSD(priceData.usd)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">1h Change</div>
                <div
                  className={cn(
                    'font-mono text-lg font-bold',
                    priceData.usd_1h_change >= 0 ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {formatChange(priceData.usd_1h_change)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">24h Change</div>
                <div
                  className={cn(
                    'font-mono text-lg font-bold',
                    priceData.usd_24h_change >= 0 ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {formatChange(priceData.usd_24h_change)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Network</div>
                <div className="text-sm font-semibold">Base</div>
                <a
                  href={`${CHAIN_CONFIG.explorerUrl}/token/${coin.baseAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  {CHAIN_CONFIG.explorerName} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Verdict history */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 font-semibold">24h Verdict History</h2>
          <div className="space-y-2">
            {VERDICT_HISTORY.map((entry, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{entry.time}</span>
                <VerdictBadge verdict={entry.verdict} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* News */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <h2 className="font-semibold">Latest News</h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-300">{news}</p>
        </div>

        {/* Swap history */}
        <div>
          <h2 className="mb-4 font-semibold">Swap History</h2>
          {coinActions.length > 0 ? (
            <AgentFeed actions={coinActions} />
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-500">
              No swaps executed for {coin.symbol} yet.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
