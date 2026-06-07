'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export const dynamic = 'force-dynamic'
import { Play, RefreshCw, Pause, AlertTriangle, Wifi, WifiOff, Brain } from 'lucide-react'
import Header from '@/components/layout/Header'
import VerdictGrid from '@/components/dashboard/VerdictGrid'
import PriorityCoin from '@/components/dashboard/PriorityCoin'
import AgentFeed from '@/components/dashboard/AgentFeed'
import StatsBar from '@/components/dashboard/StatsBar'
import { useAgentStore } from '@/store/agentStore'
import { useCoinStore } from '@/store/coinStore'
import { cn } from '@/lib/utils'
import { CHAIN_CONFIG, ACTIVE_CHAIN, IS_TESTNET } from '@/lib/chain-config'
import { MONITORED_COINS } from '@/lib/coins'
import { useWalletBalances } from '@/hooks/useWalletBalances'
import type { AgentLoopResult, VerdictMap } from '@/lib/types'

type PriceEntry = { usd: number; usd_1h_change: number; usd_24h_change: number }

const EMPTY_FEAR_GREED = { value: 0, label: '—' }

export default function DashboardPage() {
  const { address, isConnected, chain } = useAccount()
  const isOnCorrectChain = chain?.id === ACTIVE_CHAIN.id

  // Detect which coins the wallet actually holds
  const { heldCoins, isLoading: balancesLoading } = useWalletBalances()
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

  const [prices, setPrices] = useState<Record<string, PriceEntry>>({})
  const [fearGreed, setFearGreed] = useState(EMPTY_FEAR_GREED)
  const [isLive, setIsLive] = useState(false)
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
      // prices stay empty — UI shows dashes
    }
  }, [])

  // ── Boot: fetch real prices immediately, start idle ────────────────────────
  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  // ── Real agent scan ────────────────────────────────────────────────────────
  const runAgentScan = useCallback(
    async (force = false) => {
      if (!address) return // require wallet connection for real scans
      if (scanRef.current) return
      scanRef.current = true
      setStatus('running')
      setError(null)

      // Priority: real on-chain holdings → manually selected → all coins (testnet fallback)
      const activeCoins =
        heldCoins.length > 0
          ? heldCoins // real on-chain holdings detected
          : selectedCoins.length > 0
            ? selectedCoins // user manually selected coins in Setup
            : IS_TESTNET
              ? Object.keys(MONITORED_COINS) // testnet: scan all monitored coins by default
              : [] // mainnet: require explicit selection

      if (activeCoins.length === 0) {
        setStatus('idle')
        setError('No coins selected to monitor. Go to Setup to choose your coins.')
        scanRef.current = false
        return
      }

      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: address,
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
          setError(null)

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
      address,
      selectedCoins,
      heldCoins,
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
    }, 1000)
    return () => clearInterval(timer)
  }, [isPaused, status, nextRunAt, runAgentScan])

  const currentVerdict = verdicts[priorityCoin ?? ''] ?? 'NEUTRAL'
  const priorityPrice = prices[priorityCoin ?? '']

  const hasScanned = Object.keys(verdicts).length > 0

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
                      : status === 'active'
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : 'border-gray-700/50 bg-gray-800/50 text-gray-500'
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
                        : status === 'active'
                          ? 'animate-pulse bg-green-400'
                          : 'bg-gray-600'
                )}
              />
              {isPaused
                ? 'PAUSED'
                : status === 'running'
                  ? 'SCANNING...'
                  : status === 'error'
                    ? 'ERROR'
                    : status === 'active'
                      ? 'ACTIVE'
                      : 'IDLE'}
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
                  Fetching prices…
                </>
              )}
            </span>

            <span className="text-xs text-gray-500">
              Safe asset: <span className="font-semibold text-gray-300">{selectedStablecoin}</span>
            </span>

            {/* Held coins indicator */}
            {isConnected && !balancesLoading && heldCoins.length > 0 && (
              <span className="text-xs text-gray-500">
                Detected:{' '}
                <span className="font-semibold text-green-400">{heldCoins.join(', ')}</span>
              </span>
            )}
            {isConnected && !balancesLoading && heldCoins.length === 0 && IS_TESTNET && (
              <span className="text-xs text-blue-400">
                Testnet: will scan all 4 coins
              </span>
            )}
            {isConnected && !balancesLoading && heldCoins.length === 0 && !IS_TESTNET && (
              <span className="text-xs text-yellow-500">No monitored assets detected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              disabled={!isConnected || status === 'idle'}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs transition-colors hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => runAgentScan(true)}
              disabled={!isConnected || status === 'running' || isPaused}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={cn('h-3 w-3', status === 'running' && 'animate-spin')} />
              Run Scan Now
            </button>
          </div>
        </div>

        {/* Hard error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Agent scan failed</p>
              <p className="mt-1 font-mono text-xs text-red-400/70">{error}</p>
              <p className="mt-1 text-xs text-gray-500">
                Check your network connection or API keys.
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
          </div>
        )}

        {/* Wallet connect prompt */}
        {!isConnected && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center gap-3">
              <Brain className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-300">
                  Connect your wallet to get started
                </p>
                <p className="text-xs text-gray-500">
                  Connect MetaMask to run live AI scans and activate the agent.
                </p>
              </div>
            </div>
            <ConnectButton label="Connect" />
          </div>
        )}

        {/* Wrong chain warning */}
        {isConnected && !isOnCorrectChain && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-400" />
            <p className="text-sm text-yellow-300">
              Wrong network. Switch to <strong>{CHAIN_CONFIG.name}</strong> to run scans.
            </p>
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
              hasScanned={hasScanned}
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
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
                <Brain className="h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">
                  {isConnected
                    ? 'Click "Run Scan Now" to get your first AI analysis'
                    : 'Connect your wallet to start monitoring'}
                </p>
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
