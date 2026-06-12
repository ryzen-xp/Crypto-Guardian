'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatUSD, formatChange } from '@/lib/utils'
import type { Verdict } from '@/lib/types'
import type { CoinConfig } from '@/lib/types'

type Props = {
  coin: CoinConfig
  verdict: Verdict
  price: number
  change1h: number
  isPriority?: boolean
  balance?: number
}

export default function CoinCard({ coin, verdict, price, change1h, isPriority = false, balance = 0 }: Props) {
  const isPositive = change1h >= 0
  const balanceUSD = balance * price

  // Token logo URLs from CoinGecko - comprehensive list
  const getTokenLogo = (symbol: string): string => {
    const logoMap: Record<string, string> = {
      'WETH': 'https://assets.coingecko.com/coins/images/2518/large/weth.png',
      'USDC': 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
      'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      'USDT': 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
      'DAI': 'https://assets.coingecko.com/coins/images/9956/large/dai-multi-collateral-mcd.png',
      'USDP': 'https://assets.coingecko.com/coins/images/13422/large/usdp.png',
      'WBTC': 'https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png',
      'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      'ARB': 'https://assets.coingecko.com/coins/images/16792/large/arbitrum-arb-logo.png',
      'OP': 'https://assets.coingecko.com/coins/images/25244/large/optimism-ethereum-op-logo.png',
      'LINK': 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
      'UNI': 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
      'AAVE': 'https://assets.coingecko.com/coins/images/12645/large/AAVE.png',
      'CURVE': 'https://assets.coingecko.com/coins/images/12124/large/Curve.png',
    }
    return logoMap[symbol] || ''
  }

  return (
    <Link href={`/coin/${coin.symbol}`}>
      <div
        className={cn(
          'cursor-pointer rounded-lg border border-gray-800 bg-gray-900/50 p-3 sm:p-4',
          'transition-all duration-200 hover:bg-gray-900 hover:border-gray-700',
          isPriority && 'ring-2 ring-blue-500/50 bg-gray-900'
        )}
      >
        {/* Top row: Logo + Name + Price */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Token Logo or Fallback */}
            {getTokenLogo(coin.symbol) ? (
              <img
                src={getTokenLogo(coin.symbol)}
                alt={coin.symbol}
                className="h-10 w-10 flex-shrink-0 rounded-full border border-gray-700 object-cover bg-gray-800"
                loading="lazy"
              />
            ) : (
              <div className="h-10 w-10 flex-shrink-0 rounded-full border border-gray-700 bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                {coin.symbol.slice(0, 2)}
              </div>
            )}
            
            {/* Coin info */}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">{coin.symbol}</div>
              <div className="text-xs text-gray-500 truncate">{coin.name}</div>
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-sm font-bold text-white whitespace-nowrap">
              {price < 0.001 ? price.toFixed(6) : price < 1 ? price.toFixed(4) : formatUSD(price, 0)}
            </div>
          </div>
        </div>

        {/* Middle row: 1h Change */}
        <div className="mb-3 flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 flex-shrink-0 text-green-400" />
          ) : (
            <TrendingDown className="h-4 w-4 flex-shrink-0 text-red-400" />
          )}
          <span
            className={cn(
              'text-xs font-semibold font-mono',
              isPositive ? 'text-green-400' : 'text-red-400'
            )}
          >
            {formatChange(change1h)} <span className="text-gray-600">1h</span>
          </span>
        </div>

        {/* Bottom row: Balance info */}
        <div className="border-t border-gray-800 pt-2 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Balance:</span>
            <span className="font-mono font-semibold text-gray-200">
              {balance > 0 ? (balance < 0.0001 ? balance.toExponential(2) : balance.toFixed(4)) : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Value:</span>
            <span className={cn(
              'font-mono font-semibold',
              balanceUSD > 0 ? 'text-green-400' : 'text-gray-500'
            )}>
              {balanceUSD > 0 ? formatUSD(balanceUSD, 2) : '—'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
