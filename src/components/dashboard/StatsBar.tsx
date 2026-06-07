import { Shield, Zap, Clock, TrendingUp } from 'lucide-react'
import { formatUSD, formatCountdown } from '@/lib/utils'

type Props = {
  totalProtectedUSD: number
  totalSwaps: number
  nextRunAt: Date | null
  fearGreed: { value: number; label: string }
}

function FearGreedBar({ value }: { value: number }) {
  const color =
    value < 25
      ? 'bg-red-500'
      : value < 45
        ? 'bg-orange-500'
        : value < 55
          ? 'bg-yellow-500'
          : value < 75
            ? 'bg-lime-500'
            : 'bg-green-500'

  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [formatted, setFormatted] = useState('—')

  useEffect(() => {
    const update = () => {
      // If target date has passed, show "now" or "scanning..."
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) {
        setFormatted('now')
      } else {
        setFormatted(formatCountdown(targetDate))
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return <span>{formatted}</span>
}

export default function StatsBar({ totalProtectedUSD, totalSwaps, nextRunAt, fearGreed }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
          <Shield className="h-3.5 w-3.5 text-green-400" />
          Total Protected
        </div>
        <div className="font-mono text-xl font-bold text-green-400">
          {formatUSD(totalProtectedUSD)}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
          <Zap className="h-3.5 w-3.5 text-blue-400" />
          Swaps Executed
        </div>
        <div className="font-mono text-xl font-bold">{totalSwaps}</div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5 text-yellow-400" />
          Next Scan
        </div>
        <div className="font-mono text-xl font-bold text-yellow-400">
          {nextRunAt ? <CountdownTimer targetDate={new Date(nextRunAt)} /> : '—'}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
          <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
          Fear & Greed
        </div>
        <div className="font-mono text-xl font-bold">{fearGreed.value}</div>
        <FearGreedBar value={fearGreed.value} />
        <div className="mt-1 text-xs text-gray-500">{fearGreed.label}</div>
      </div>
    </div>
  )
}
