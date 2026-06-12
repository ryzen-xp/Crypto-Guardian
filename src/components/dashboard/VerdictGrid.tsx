'use client'

import { RefreshCw, Activity } from 'lucide-react'
import { MONITORED_COINS } from '@/lib/coins'
import { formatRelativeTime } from '@/lib/utils'
import CoinCard from './CoinCard'
import type { VerdictMap } from '@/lib/types'
import type { ClientWalletBalances } from '@/hooks/useWalletBalances'

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
  balances?: ClientWalletBalances | null
}

export default function VerdictGrid({
  verdicts,
  prices,
  priorityCoin,
  lastUpdated,
  isLoading = false,
  hasScanned = false,
  balances = null,
}: Props) {
  const coins = Object.values(MONITORED_COINS)

  if (isLoading) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Portfolio</h2>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Analyzing…
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: coins.length }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-gray-800 bg-gray-900"
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
          <h2 className="text-lg font-semibold">Your Portfolio</h2>
          <span className="text-xs text-gray-600">Not yet scanned</span>
        </div>
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-800 bg-gray-900/30 p-6 text-center">
          <Activity className="h-8 w-8 text-gray-700" />
          <p className="text-sm text-gray-500">
            Run your first scan to see portfolio analysis.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Portfolio</h2>
        {lastUpdated && (
          <span className="text-xs text-gray-500">Updated {formatRelativeTime(lastUpdated)}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {coins.map((coin) => {
          const verdict = verdicts[coin.symbol] ?? 'NEUTRAL'
          const priceData = prices[coin.symbol]
          const balance = balances?.[coin.symbol]?.formatted ?? 0

          return (
            <CoinCard
              key={coin.symbol}
              coin={coin}
              verdict={verdict}
              price={priceData?.usd ?? 0}
              change1h={priceData?.usd_1h_change ?? 0}
              isPriority={coin.symbol === priorityCoin}
              balance={balance}
            />
          )
        })}
      </div>
    </div>
  )
}
