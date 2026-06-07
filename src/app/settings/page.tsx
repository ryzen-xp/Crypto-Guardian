'use client'

import { Shield, Pause, Play, Check } from 'lucide-react'
import Header from '@/components/layout/Header'

export const dynamic = 'force-dynamic'
import { MONITORED_COINS, STABLECOINS } from '@/lib/coins'
import { useCoinStore } from '@/store/coinStore'
import { cn } from '@/lib/utils'
import type { RiskSensitivity } from '@/lib/types'

const RISK_OPTIONS: { value: RiskSensitivity; label: string; desc: string }[] = [
  { value: 'conservative', label: 'Conservative', desc: 'Sell on DANGER only. Never buys.' },
  { value: 'moderate', label: 'Moderate', desc: 'Sell on DANGER + CAUTION. No buys.' },
  {
    value: 'aggressive',
    label: 'Aggressive',
    desc: 'Sell on DANGER + CAUTION. Buys on OPPORTUNITY.',
  },
]

export default function SettingsPage() {
  const {
    selectedCoins,
    coinSettings,
    isPaused,
    togglePause,
    toggleCoin,
    updateCoinSetting,
    selectedStablecoin,
    setSelectedStablecoin,
  } = useCoinStore()

  const stablecoins = Object.values(STABLECOINS)

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>

        {/* Master pause */}
        <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Agent Status</h2>
              <p className="mt-1 text-sm text-gray-400">
                {isPaused
                  ? 'Agent is paused. No swaps will execute.'
                  : 'Agent is actively monitoring your portfolio.'}
              </p>
            </div>
            <button
              onClick={togglePause}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                isPaused ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'
              )}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Resume Agent' : 'Pause Agent'}
            </button>
          </div>
        </section>

        {/* Stablecoin */}
        <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-1 font-semibold">Safe Asset (Stablecoin)</h2>
          <p className="mb-4 text-sm text-gray-400">
            All DANGER swaps convert your holdings into this stablecoin.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {stablecoins.map((stable) => (
              <button
                key={stable.symbol}
                onClick={() => setSelectedStablecoin(stable.symbol)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all',
                  selectedStablecoin === stable.symbol
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{stable.symbol}</span>
                  {selectedStablecoin === stable.symbol && (
                    <Check className="ml-auto h-4 w-4 text-blue-400" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{stable.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Per-coin settings */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 font-semibold">Coin Monitoring</h2>
          <div className="space-y-4">
            {Object.values(MONITORED_COINS).map((coin) => {
              const isActive = selectedCoins.includes(coin.symbol)
              const setting = coinSettings[coin.symbol]

              return (
                <div
                  key={coin.symbol}
                  className={cn(
                    'rounded-lg border transition-all',
                    isActive ? 'border-gray-700 bg-gray-800' : 'border-gray-800 opacity-50'
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-xs font-bold">
                      {coin.symbol.slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold">{coin.symbol}</span>
                      <span className="ml-2 text-xs text-gray-500">{coin.name}</span>
                    </div>
                    <button
                      onClick={() => toggleCoin(coin.symbol)}
                      className={cn(
                        'relative h-5 w-9 rounded-full transition-colors',
                        isActive ? 'bg-blue-600' : 'bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                          isActive ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>

                  {isActive && setting && (
                    <div className="grid grid-cols-1 gap-3 border-t border-gray-700 p-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Max Swap ($)</label>
                        <input
                          type="number"
                          value={setting.maxSwapUSD}
                          onChange={(e) =>
                            updateCoinSetting(coin.symbol, { maxSwapUSD: Number(e.target.value) })
                          }
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Daily Limit ($)</label>
                        <input
                          type="number"
                          value={setting.dailyLimitUSD}
                          onChange={(e) =>
                            updateCoinSetting(coin.symbol, {
                              dailyLimitUSD: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Min Hold ($)</label>
                        <input
                          type="number"
                          value={setting.minHoldUSD}
                          onChange={(e) =>
                            updateCoinSetting(coin.symbol, { minHoldUSD: Number(e.target.value) })
                          }
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="mb-2 block text-xs text-gray-500">Risk Sensitivity</label>
                        <div className="flex gap-2">
                          {RISK_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() =>
                                updateCoinSetting(coin.symbol, { riskSensitivity: opt.value })
                              }
                              title={opt.desc}
                              className={cn(
                                'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors',
                                setting.riskSensitivity === opt.value
                                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-center text-xs text-gray-500">
          <Shield className="mx-auto mb-2 h-4 w-4 text-gray-600" />
          Permissions active for 28 more days.{' '}
          <button className="text-blue-400 hover:text-blue-300">Renew early</button>
        </div>
      </main>
    </div>
  )
}
