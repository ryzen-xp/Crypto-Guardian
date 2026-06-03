'use client'

import { AlertTriangle, TrendingUp, Brain } from 'lucide-react'
import { MONITORED_COINS } from '@/lib/coins'
import { cn, formatUSD, formatChange, getVerdictColors } from '@/lib/utils'
import VerdictBadge from './VerdictBadge'
import type { Verdict, AgentAction } from '@/lib/types'

type PriceData = { usd: number; usd_1h_change: number }

type Props = {
  coinSymbol: string
  verdict: Verdict
  reasoning: string
  price?: PriceData
  lastAction?: AgentAction | null
  stablecoin?: string
}

export default function PriorityCoin({
  coinSymbol,
  verdict,
  reasoning,
  price,
  lastAction,
  stablecoin = 'USDC',
}: Props) {
  const coin = MONITORED_COINS[coinSymbol]
  const colors = getVerdictColors(verdict)
  const isDanger = verdict === 'DANGER'
  const isOpportunity = verdict === 'OPPORTUNITY'

  if (!coin) return null

  return (
    <div className={cn('rounded-xl border p-5', colors.bg, colors.border)}>
      <div className="mb-4 flex items-center gap-2">
        {isDanger ? (
          <AlertTriangle className="h-4 w-4 text-red-400" />
        ) : isOpportunity ? (
          <TrendingUp className="h-4 w-4 text-green-400" />
        ) : (
          <Brain className="h-4 w-4 text-purple-400" />
        )}
        <span className="text-sm font-semibold text-gray-300">Priority Action</span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-base font-bold">
          {coin.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="text-xl font-bold">{coin.symbol}</div>
          <div className="text-sm text-gray-400">{coin.name}</div>
        </div>
        <div className="ml-auto">
          <VerdictBadge verdict={verdict} size="lg" />
        </div>
      </div>

      {price && (
        <div className="mb-4 flex gap-4">
          <div>
            <div className="text-xs text-gray-500">Price</div>
            <div className="font-mono text-sm font-semibold">
              {price.usd < 0.01 ? price.usd.toFixed(6) : formatUSD(price.usd)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">1h Change</div>
            <div
              className={cn(
                'font-mono text-sm font-semibold',
                price.usd_1h_change >= 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {formatChange(price.usd_1h_change)}
            </div>
          </div>
        </div>
      )}

      {/* Venice AI reasoning */}
      <div className="mb-4 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <Brain className="h-3 w-3 text-purple-400" />
          <span className="text-xs font-medium text-purple-400">Venice AI</span>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">{reasoning}</p>
      </div>

      {/* Last action */}
      {lastAction && lastAction.coin === coinSymbol && lastAction.action !== 'SKIPPED' && (
        <div
          className={cn(
            'flex items-center justify-between rounded-lg px-3 py-2 text-xs',
            lastAction.status === 'confirmed'
              ? 'bg-green-500/10 text-green-400'
              : lastAction.status === 'failed'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-blue-500/10 text-blue-400'
          )}
        >
          <span>
            {lastAction.action === 'SELL'
              ? `Swapped $${lastAction.amountUSD} → ${stablecoin}`
              : `Bought $${lastAction.amountUSD} ${coinSymbol}`}
          </span>
          <span className="font-semibold capitalize">{lastAction.status}</span>
        </div>
      )}
    </div>
  )
}
