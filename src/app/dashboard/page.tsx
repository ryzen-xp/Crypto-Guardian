'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Play, RefreshCw, Pause, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import Header from '@/components/layout/Header'
import VerdictGrid from '@/components/dashboard/VerdictGrid'
import PriorityCoin from '@/components/dashboard/PriorityCoin'
import AgentFeed from '@/components/dashboard/AgentFeed'
import StatsBar from '@/components/dashboard/StatsBar'
import { useAgentStore } from '@/store/agentStore'
import { useCoinStore } from '@/store/coinStore'
import { cn } from '@/lib/utils'
import { CHAIN_CONFIG } from '@/lib/chain-config'
import {
  DEMO_PRICES,
  DEMO_REASONING,
  DEMO_PRIORITY_COIN,
  DEMO_FEAR_GREED,
  DEMO_ACTIONS,
  DEMO_VERDICTS,
} from '@/lib/demo-data'
import type { AgentLoopResult, VerdictMap } from '@/lib/types'

// Placeholder address used when no wallet is connected
const DEMO_ADDRESS = '0x0000000000000000000000000000000000000001'

type PriceEntry = { usd: number; usd_1h_change: number; usd_24h_change: number }

export default function DashboardPage() {
  const {
    status,
    verdicts,
    priorityCoin,
    reasoning,
    actionFeed,
    lastRunAt,
    nextRunAt,
    totalProtectedUSD,
    totalSwapsExecuted,
    newsSnippets,
    setStatus,
    setVerdicts,
    setPriorityCoin,
    setReasoning,
    addAction,
    setLastRunAt,
    setNextRunAt,
    setNewsSnippets,
    addProtectedValue,
    setError,
    error,
  } = useAgentStore()

  const { isPaused, togglePause, selectedCoins, coinSettings, selectedStablecoin } = useCoinStore()

  const [prices, setPrices] = useState<Record<string, PriceEntry>>(DEMO_PRICES)
  const [fearGreed, setFearGreed] = useState(DEMO_FEAR_GREED)
  const [isLive, setIsLive] = useState(false)
  const [isBooted, setIsBooted] = useState(false)
  const scanRef = useRef(false)

  // ── Load real market prices ────────────────────────────────────────────────
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/market-data')
      if (!res.ok) return
      const json = (await res.json()) as {
        success: boolean
        data: { prices: Record<string, PriceEntry>; fearGreed: { value: number; label: string } }
      }
      if (json.success) {
        setPrices(json.data.prices)
        setFearGreed(json.data.fearGreed)
        setIsLive(true)
      }
    } catch {
      // stay on demo prices silently
    }
  }, [])

  // ── Boot: seed demo data + fetch real prices once ──────────────────────────
  useEffect(() => {
    if (isBooted) return
    setIsBooted(true)

    // Seed demo state so dashboard is never empty
    setVerdicts(DEMO_VERDICTS)
    setPriorityCoin(DEMO_PRIORITY_COIN)
    setReasoning(DEMO_REASONING)
    setLastRunAt(new Date(Date.now() - 5 * 60 * 1000))
    setNextRunAt(new Date(Date.now() + 10 * 60 * 1000))
    setStatus('active')
    addProtectedValue(730)
    ;[...DEMO_ACTIONS].reverse().forEach((a) => addAction(a))

    // Then try to get real prices
    fetchPrices()
  }, [
    isBooted,
    setVerdicts,
    setPriorityCoin,
    setReasoning,
    setLastRunAt,
    setNextRunAt,
    setStatus,
    addAction,
    addProtectedValue,
    fetchPrices,
  ])

  // ── Real agent scan ────────────────────────────────────────────────────────
  const runAgentScan = useCallback(
    async (force = false) => {
      if (scanRef.current) return
      scanRef.current = true
      setStatus('running')
      setError(null)

      const activeCoins = selectedCoins.length > 0 ? selectedCoins : Object.keys(DEMO_VERDICTS)

      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: DEMO_ADDRESS,
            activeCoins,
            coinSettings,
            stablecoinSymbol: selectedStablecoin,
            forceRun: force,
          }),
        })

        const json = (await res.json()) as {
          success: boolean
          data?: AgentLoopResult
          error?: string
        }

        if (json.success && json.data) {
          const d = json.data
          setVerdicts(d.verdicts as VerdictMap)
          setPriorityCoin(d.priorityCoin)
          setReasoning(d.reasoning)
          setNewsSnippets(d.newsSnippets)
          setLastRunAt(new Date(d.ranAt))
          setNextRunAt(new Date(d.nextRunAt))
          setStatus('active')

          if (d.actionTaken) {
            addAction({
              ...d.actionTaken,
              timestamp: new Date(d.actionTaken.timestamp),
            })
            if (d.actionTaken.status === 'confirmed' && d.actionTaken.amountUSD > 0) {
              addProtectedValue(d.actionTaken.amountUSD)
            }
          }

          // Refresh prices after a successful scan
          await fetchPrices()
        } else {
          setError(json.error ?? 'Agent scan failed')
          setStatus('error')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        setError(msg)
        setStatus('error')
      } finally {
        scanRef.current = false
      }
    },
    [
      selectedCoins,
      coinSettings,
      selectedStablecoin,
      setStatus,
      setError,
      setVerdicts,
      setPriorityCoin,
      setReasoning,
      setNewsSnippets,
      setLastRunAt,
      setNextRunAt,
      addAction,
      addProtectedValue,
      fetchPrices,
    ]
  )

  // ── Countdown timer — auto-trigger scan when nextRunAt passes ─────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused && status === 'active' && nextRunAt && new Date() >= nextRunAt) {
        runAgentScan(true)
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [isPaused, status, nextRunAt, runAgentScan])

  const currentVerdict = verdicts[priorityCoin ?? ''] ?? 'NEUTRAL'
  const priorityPrice = prices[priorityCoin ?? '']

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Network + status bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Agent status */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
                isPaused
                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                  : status === 'running'
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    : status === 'error'
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-green-500/30 bg-green-500/10 text-green-400'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isPaused
                    ? 'bg-yellow-400'
                    : status === 'running'
                      ? 'animate-pulse bg-blue-400'
                      : status === 'error'
                        ? 'bg-red-400'
                        : 'animate-pulse bg-green-400'
                )}
              />
              {isPaused
                ? 'PAUSED'
                : status === 'running'
                  ? 'SCANNING...'
                  : status === 'error'
                    ? 'ERROR'
                    : 'ACTIVE'}
            </div>

            {/* Network badge */}
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-semibold',
                CHAIN_CONFIG.isTestnet
                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
              )}
            >
              {CHAIN_CONFIG.name}
            </span>

            {/* Live prices indicator */}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              {isLive ? (
                <>
                  <Wifi className="h-3 w-3 text-green-400" />
                  Live prices
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-gray-600" />
                  Demo prices
                </>
              )}
            </span>

            <span className="text-xs text-gray-500">
              Safe asset: <span className="font-semibold text-gray-300">{selectedStablecoin}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs transition-colors hover:border-gray-500"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => runAgentScan(true)}
              disabled={status === 'running' || isPaused}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', status === 'running' && 'animate-spin')} />
              Run Scan Now
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Agent scan failed</p>
              <p className="mt-1 font-mono text-xs text-red-400/70">{error}</p>
              <p className="mt-1 text-xs text-gray-500">
                Venice AI or CoinGecko may be unavailable. Showing last known verdicts.
              </p>
            </div>
          </div>
        )}

        {/* Testnet info banner */}
        {CHAIN_CONFIG.isTestnet && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-orange-300">
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 font-bold text-orange-400">
              TESTNET
            </span>
            Running on {CHAIN_CONFIG.name}. Prices are real (CoinGecko). Swaps are simulated — no
            real funds at risk.
            {CHAIN_CONFIG.faucetUrl && (
              <>
                {' '}
                Get test ETH at{' '}
                <a
                  href={CHAIN_CONFIG.faucetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Alchemy Faucet
                </a>
                .
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6">
          <StatsBar
            totalProtectedUSD={totalProtectedUSD}
            totalSwaps={totalSwapsExecuted}
            nextRunAt={nextRunAt}
            fearGreed={fearGreed}
          />
        </div>

        {/* Main grid */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VerdictGrid
              verdicts={verdicts}
              prices={prices}
              priorityCoin={priorityCoin}
              lastUpdated={lastRunAt}
              isLoading={status === 'running'}
            />
          </div>

          <div>
            {priorityCoin ? (
              <PriorityCoin
                coinSymbol={priorityCoin}
                verdict={currentVerdict}
                reasoning={reasoning ?? ''}
                price={priorityPrice}
                lastAction={actionFeed[0] ?? null}
                stablecoin={selectedStablecoin}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-500">
                Click &quot;Run Scan Now&quot; to get your first AI analysis
              </div>
            )}
          </div>
        </div>

        {/* News snippets */}
        {Object.keys(newsSnippets).length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 text-sm font-semibold">Latest News (from Venice AI)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(newsSnippets)
                .slice(0, 6)
                .map(([symbol, snippet]) => (
                  <div key={symbol} className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                    <span className="mb-1 block text-xs font-bold text-gray-400">{symbol}</span>
                    <p className="line-clamp-2 text-xs text-gray-500">{snippet}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Feed */}
        <AgentFeed actions={actionFeed.slice(0, 10)} />
      </main>
    </div>
  )
}
