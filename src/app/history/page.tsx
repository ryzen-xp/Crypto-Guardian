'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ArrowUpRight, ArrowDownLeft, SkipForward, ExternalLink, Activity } from 'lucide-react'
import Header from '@/components/layout/Header'
import { useAgentStore } from '@/store/agentStore'
import { cn, formatRelativeTime, getBasescanUrl } from '@/lib/utils'
import type { AgentAction } from '@/lib/types'

function ActionIcon({ action }: { action: AgentAction['action'] }) {
  if (action === 'SELL') return <ArrowDownLeft className="h-4 w-4 text-red-400" />
  if (action === 'BUY') return <ArrowUpRight className="h-4 w-4 text-green-400" />
  if (action === 'SKIPPED') return <SkipForward className="h-4 w-4 text-gray-500" />
  return <Activity className="h-4 w-4 text-blue-400" />
}

function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold',
        verdict === 'DANGER' && 'bg-red-500/20 text-red-400',
        verdict === 'CAUTION' && 'bg-yellow-500/20 text-yellow-400',
        verdict === 'NEUTRAL' && 'bg-gray-500/20 text-gray-400',
        verdict === 'OPPORTUNITY' && 'bg-green-500/20 text-green-400'
      )}
    >
      {verdict}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold uppercase',
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

export default function HistoryPage() {
  const { isConnected } = useAccount()
  const { actionFeed } = useAgentStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Header />

      <main className="flex-1 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Decision History</h1>
            <p className="mt-2 text-gray-400">
              View all agent decisions and transaction history
            </p>
          </div>

          {!isConnected ? (
            <div className="flex h-96 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/5">
              <div className="text-center">
                <Activity className="mx-auto mb-3 h-8 w-8 text-blue-400" />
                <p className="text-sm font-medium text-blue-300">Connect your wallet to view history</p>
              </div>
            </div>
          ) : actionFeed.length === 0 ? (
            <div className="flex h-96 items-center justify-center rounded-xl border border-gray-800 bg-gray-900">
              <div className="text-center">
                <SkipForward className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">No decisions yet. Start the agent to begin monitoring.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {actionFeed.map((action) => (
                <div
                  key={action.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition hover:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Icon + Details */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-800">
                        <ActionIcon action={action.action} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-lg font-bold">{action.coin}</span>
                          <VerdictBadge verdict={action.verdict} />
                          <StatusBadge status={action.status} />
                        </div>

                        <p className="text-sm text-gray-400 mb-2">{action.reasoning}</p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {action.amountUSD > 0 && (
                            <span>
                              {action.action === 'SELL' ? '→' : '←'} ${action.amountUSD.toFixed(2)}
                            </span>
                          )}
                          <span>{formatRelativeTime(action.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: TX Link */}
                    {action.txHash && (
                      <a
                        href={getBasescanUrl(action.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-gray-700"
                      >
                        View TX <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
