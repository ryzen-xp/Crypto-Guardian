'use client'

import { ExternalLink, ArrowRightLeft, SkipForward, TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatRelativeTime, getBasescanUrl } from '@/lib/utils'
import VerdictBadge from './VerdictBadge'
import type { AgentAction } from '@/lib/types'

type Props = {
  actions: AgentAction[]
}

function ActionIcon({ action }: { action: AgentAction['action'] }) {
  if (action === 'SELL') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />
  if (action === 'BUY') return <TrendingUp className="h-3.5 w-3.5 text-green-400" />
  if (action === 'SKIPPED') return <SkipForward className="h-3.5 w-3.5 text-gray-500" />
  return <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />
}

function StatusChip({ status }: { status: AgentAction['status'] }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
        status === 'confirmed' && 'bg-green-500/15 text-green-400',
        status === 'pending' && 'bg-blue-500/15 text-blue-400',
        status === 'failed' && 'bg-red-500/15 text-red-400',
        status === 'skipped' && 'bg-gray-500/15 text-gray-500'
      )}
    >
      {status}
    </span>
  )
}

export default function AgentFeed({ actions }: Props) {
  if (actions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
        <p className="text-sm text-gray-500">
          No agent decisions yet. Start the agent to begin monitoring.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-3">
        <h3 className="text-sm font-semibold">Recent Decisions</h3>
      </div>
      <div className="divide-y divide-gray-800">
        {actions.map((action) => (
          <div key={action.id} className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-800">
              <ActionIcon action={action.action} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{action.coin}</span>
                <VerdictBadge verdict={action.verdict} size="sm" showEmoji={false} />
                {action.action !== 'SKIPPED' && action.amountUSD > 0 && (
                  <span className="text-xs text-gray-400">
                    {action.action === 'SELL' ? '→' : '←'} ${action.amountUSD}
                  </span>
                )}
                <StatusChip status={action.status} />
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{action.reasoning}</p>
            </div>

            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <span className="text-[11px] text-gray-600">
                {formatRelativeTime(action.timestamp)}
              </span>
              {action.txHash && (
                <a
                  href={getBasescanUrl(action.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-[11px] text-blue-400 hover:text-blue-300"
                >
                  tx <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
