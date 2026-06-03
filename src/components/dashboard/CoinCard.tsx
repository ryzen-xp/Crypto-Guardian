'use client'

import Link from 'next/link'
import { cn, formatUSD, formatChange, getVerdictColors } from '@/lib/utils'
import VerdictBadge from './VerdictBadge'
import type { Verdict } from '@/lib/types'
import type { CoinConfig } from '@/lib/types'

type Props = {
  coin: CoinConfig
  verdict: Verdict
  price: number
  change1h: number
  isPriority?: boolean
}

export default function CoinCard({ coin, verdict, price, change1h, isPriority = false }: Props) {
  const colors = getVerdictColors(verdict)
  const isPositive = change1h >= 0

  return (
    <Link href={`/coin/${coin.symbol}`}>
      <div
        className={cn(
          'relative cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02]',
          colors.bg,
          colors.border,
          isPriority && verdict === 'DANGER' && 'pulse-danger',
          isPriority && verdict === 'OPPORTUNITY' && 'pulse-opportunity',
          isPriority && 'ring-2',
          isPriority && verdict === 'DANGER' && 'ring-red-500/40',
          isPriority && verdict === 'OPPORTUNITY' && 'ring-green-500/40',
          isPriority && verdict === 'CAUTION' && 'ring-yellow-500/40'
        )}
      >
        {isPriority && (
          <span className="absolute -top-1 -right-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            PRIORITY
          </span>
        )}

        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold',
                'bg-gray-800'
              )}
            >
              {coin.symbol.slice(0, 2)}
            </div>
            <div>
              <div className="text-sm font-semibold">{coin.symbol}</div>
              <div className="text-xs text-gray-500">{coin.name}</div>
            </div>
          </div>
          <VerdictBadge verdict={verdict} size="sm" showEmoji={false} />
        </div>

        <div className="font-mono text-lg font-bold">
          {price < 0.001 ? price.toFixed(8) : price < 1 ? price.toFixed(4) : formatUSD(price, 2)}
        </div>

        <div
          className={cn(
            'mt-1 font-mono text-xs font-medium',
            isPositive ? 'text-green-400' : 'text-red-400'
          )}
        >
          {formatChange(change1h)} <span className="text-gray-500">1h</span>
        </div>
      </div>
    </Link>
  )
}
