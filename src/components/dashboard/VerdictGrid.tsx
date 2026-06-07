'use client'

import { RefreshCw, Activity } from 'lucide-react'
import { MONITORED_COINS } from '@/lib/coins'
import { formatRelativeTime } from '@/lib/utils'
import CoinCard from './CoinCard'
import type { VerdictMap } from '@/lib/types'

type PriceData = {
  usd: number
  usd_1h_change: number
}

type Props = {
  verdicts: VerdictMap
  prices: Record<string, PriceData>
  priorityCoin: string | null
  lastUpdated: Date | null
  isLoading?: boolean
  hasScanned?: boolean
}

export default function VerdictGrid({
  verdicts,
  prices,
  priorityCoin,
  lastUpdated,
  isLoading = false,
  hasScanned = false,
}: Props) {
  const coins = Object.values(MONITORED_COINS)

  if (isLoading) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Portfolio Verdicts</h2>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Analyzing…
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: coins.length }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-gray-800 bg-gray-900"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!hasScanned) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Portfolio Verdicts</h2>
          <span className="text-xs text-gray-600">Not yet scanned</span>
        </div>
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-800 bg-gray-900/50 p-8 text-center">
          <Activity className="h-8 w-8 text-gray-700" />
          <p className="text-sm text-gray-500">
            Run your first scan to see live AI verdicts for each coin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Portfolio Verdicts</h2>
        {lastUpdated && (
          <span className="text-xs text-gray-500">Updated {formatRelativeTime(lastUpdated)}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {coins.map((coin) => {
          const verdict = verdicts[coin.symbol] ?? 'NEUTRAL'
          const priceData = prices[coin.symbol]

          return (
            <CoinCard
              key={coin.symbol}
              coin={coin}
              verdict={verdict}
              price={priceData?.usd ?? 0}
              change1h={priceData?.usd_1h_change ?? 0}
              isPriority={coin.symbol === priorityCoin}
            />
          )
        })}
      </div>
    </div>
  )
}
