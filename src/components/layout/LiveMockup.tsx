'use client'

import { useEffect, useState } from 'react'
import { Brain } from 'lucide-react'

type PriceEntry = { usd: number; usd_1h_change: number; usd_24h_change: number }
type FearGreed = { value: number; label: string }

type MarketData = {
  prices: Record<string, PriceEntry>
  fearGreed: FearGreed
}

const VERDICT_BG: Record<string, string> = {
  NEUTRAL: 'border-white/10 bg-white/3',
  OPPORTUNITY: 'border-green-500/30 bg-green-500/5',
  DANGER: 'border-red-500/30 bg-red-500/5',
  CAUTION: 'border-yellow-500/30 bg-yellow-500/5',
}

const VERDICT_COLOR: Record<string, string> = {
  NEUTRAL: 'text-gray-400',
  OPPORTUNITY: 'text-green-400',
  DANGER: 'text-red-400',
  CAUTION: 'text-yellow-400',
}

const VERDICT_DOT: Record<string, string> = {
  NEUTRAL: '⚪',
  OPPORTUNITY: '🟢',
  DANGER: '🔴',
  CAUTION: '🟡',
}

const COINS = ['ETH', 'WBTC', 'ARB', 'OP']

function getVerdict(change1h: number, change24h: number): string {
  if (change1h < -8 || change24h < -15) return 'DANGER'
  if (change1h < -3 || change24h < -7) return 'CAUTION'
  if (change1h > 3 || change24h > 6) return 'OPPORTUNITY'
  return 'NEUTRAL'
}

export default function LiveMockup() {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    async function load() {
      try {
        const res = await fetch('/api/market-data')
        const json = (await res.json()) as { success: boolean; data: MarketData }
        if (json.success) setData(json.data)
      } catch {
        // silently stay loading
      } finally {
        setLoading(false)
      }
    }
    load()
    // refresh live clock every second
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  // Compute verdicts from live data
  const coinRows = COINS.map((symbol) => {
    const price = data?.prices[symbol]
    const verdict = price ? getVerdict(price.usd_1h_change, price.usd_24h_change) : 'NEUTRAL'
    const change = price
      ? `${price.usd_1h_change >= 0 ? '+' : ''}${price.usd_1h_change.toFixed(1)}%`
      : '—'
    return { symbol, verdict, change }
  })

  // Find priority coin (most extreme)
  const priorityCoin = data
    ? (coinRows.reduce<(typeof coinRows)[0] | undefined>((prev, curr) => {
      const score = (s: string) =>
        s === 'DANGER' ? 4 : s === 'CAUTION' ? 3 : s === 'OPPORTUNITY' ? 2 : 1
      if (!prev) return curr
      return score(curr.verdict) > score(prev.verdict) ? curr : prev
    }, undefined) ?? null)
    : null

  const fearVal = data?.fearGreed.value ?? null
  const fearLabel = data?.fearGreed.label ?? null

  // Next scan: round up to nearest 15-minute mark
  const msInCycle = 15 * 60 * 1000
  const nextMs = msInCycle - (now.getTime() % msInCycle)
  const nextMins = Math.floor(nextMs / 60000)
  const nextSecs = Math.floor((nextMs % 60000) / 1000)
  const nextStr = `${nextMins}m ${nextSecs.toString().padStart(2, '0')}s`

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl shadow-black/40">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-white/5 bg-gray-900/80 px-5 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            {loading ? 'Connecting…' : 'Agent Active · Ethereum Sepolia'}
          </span>
        </div>
        <span suppressHydrationWarning className="text-xs text-gray-500">
          Next scan in {mounted ? nextStr : '—'}
        </span>
      </div>

      {/* Verdict grid */}
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        {loading
          ? COINS.map((s) => (
            <div
              key={s}
              className="h-24 animate-pulse rounded-xl border border-gray-800 bg-gray-800/50"
            />
          ))
          : coinRows.map((coin) => (
            <div
              key={coin.symbol}
              className={`rounded-xl border p-4 ${VERDICT_BG[coin.verdict] ?? ''}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold">
                  {coin.symbol.slice(0, 2)}
                </div>
                <span className="text-sm">{VERDICT_DOT[coin.verdict]}</span>
              </div>
              <div className="text-sm font-bold">{coin.symbol}</div>
              <div
                className={`mt-0.5 font-mono text-xs font-medium ${VERDICT_COLOR[coin.verdict]}`}
              >
                {coin.change}
              </div>
              <div className="mt-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                {coin.verdict}
              </div>
            </div>
          ))}
      </div>

      {/* AI reasoning / status */}
      <div className="border-t border-white/5 bg-purple-500/3 px-5 py-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-purple-400">Venice AI Status</span>
          {priorityCoin && (
            <span
              className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold ${priorityCoin.verdict === 'DANGER'
                  ? 'bg-red-500/20 text-red-400'
                  : priorityCoin.verdict === 'CAUTION'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : priorityCoin.verdict === 'OPPORTUNITY'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                }`}
            >
              {priorityCoin.symbol} · {priorityCoin.verdict}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-gray-400">
          {loading
            ? 'Fetching live market data…'
            : fearVal !== null
              ? `Fear & Greed Index: ${fearVal} (${fearLabel}). Connect your wallet and run a scan to get full AI analysis and auto-swap recommendations.`
              : 'Connect your wallet and run a scan to activate the AI guardian.'}
        </p>
      </div>
    </div>
  )
}
