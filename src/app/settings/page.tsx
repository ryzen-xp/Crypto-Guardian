'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertCircle, Check, Lock } from 'lucide-react'
import { useAccount } from 'wagmi'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import { useCoinStore } from '@/store/coinStore'
import { MONITORED_COINS, STABLECOINS } from '@/lib/coins'
import type { RiskSensitivity } from '@/lib/types'

export const dynamic = 'force-dynamic'

const RISK_OPTIONS: { value: RiskSensitivity; label: string; desc: string }[] = [
  { value: 'conservative', label: 'Conservative', desc: 'DANGER only' },
  { value: 'moderate', label: 'Moderate', desc: 'DANGER + CAUTION' },
  { value: 'aggressive', label: 'Aggressive', desc: 'DANGER + CAUTION + Buy on OPPORTUNITY' },
]

export default function SettingsPage() {
  const { address } = useAccount()
  const [hasPermission, setHasPermission] = useState(false)
  const [isGranting, setIsGranting] = useState(false)

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

  // Check if permission is stored
  useEffect(() => {
    if (address) {
      const storedPerm = localStorage.getItem(`delegated_${address}`)
      setHasPermission(!!storedPerm)
    }
  }, [address])

  // Grant delegation permission - use ERC-7715 to get real delegations
  const handleGrantPermission = async () => {
    if (!address) return

    setIsGranting(true)
    try {
      const { createWalletPermissionsClient, budgetWithHeadroom } = await import('@/lib/erc7715-permissions')
      const client = createWalletPermissionsClient()

      // Verify MetaMask support
      const { hasProvider, supported } = await client.detect()
      if (!hasProvider) {
        throw new Error('MetaMask not installed')
      }
      if (!supported) {
        throw new Error('Your MetaMask version does not support ERC-7715 advanced permissions')
      }

      console.warn(`[Permission] Requesting ERC-7715 permission from MetaMask...`)

      // Request permission with realistic budget (1000 USDC for swaps + fees)
      const { delegations, expiry } = await client.grantPermission({
        budgetUsdc: budgetWithHeadroom('1000'),
        targetAddress: '0x02c9979a75fbdbc3a77485024ab8b6474308591e', // 1-Shot relayer
        usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
        justification: 'Crypto-Guardian automated swap execution',
      })

      if (!delegations.length) {
        throw new Error('No delegations returned from MetaMask')
      }

      console.warn(`[Permission] ERC-7715 permission granted! ${delegations.length} delegation(s)`)

      // Store delegations locally (encrypted would be ideal, but localStorage for MVP)
      localStorage.setItem(
        `delegated_${address}`,
        JSON.stringify({
          grantedAt: new Date().toISOString(),
          delegations, // Real cryptographic signatures
          expiry,
          authorizedAccount: address,
          version: '1.0',
        })
      )

      setHasPermission(true)
      console.warn(`[Permission] Delegations stored in localStorage`)
    } catch (err) {
      console.error('Failed to grant permission:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      alert(`Permission grant failed: ${errorMsg}`)
    } finally {
      setIsGranting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>

        {/* Permission Section */}
        <section className={cn(
          'mb-6 rounded-xl border p-5 transition-all',
          hasPermission
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-yellow-500/30 bg-yellow-500/5'
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0',
              hasPermission ? 'bg-green-500/20' : 'bg-yellow-500/20'
            )}>
              {hasPermission ? (
                <Check className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">
                {hasPermission ? '✅ Relayer Permission Granted' : '⚠️  Relayer Permission Required'}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {hasPermission
                  ? 'Your wallet has authorized the 1-Shot relayer to execute swaps and charge gas fees in USDC.'
                  : 'Grant permission to allow the 1-Shot relayer to execute swaps on your behalf and pay gas fees from USDC.'}
              </p>
              {!hasPermission && (
                <button
                  onClick={handleGrantPermission}
                  disabled={isGranting || !address}
                  className={cn(
                    'mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                    'bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Lock className="h-4 w-4" />
                  {isGranting ? 'Granting...' : 'Grant Permission'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Show warning if no permission */}
        {!hasPermission && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <p className="text-sm text-red-300">
              🔒 <strong>Permission required:</strong> You must grant permission above before swaps can execute.
            </p>
          </div>
        )}

        {/* Safe Asset Selection */}
        <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-1 font-semibold">Safe Asset (Stablecoin)</h2>
          <p className="mb-4 text-sm text-gray-400">
            When protecting holdings, swap to this stablecoin.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(STABLECOINS).map((stable) => (
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
              </button>
            ))}
          </div>
        </section>

        {/* Coin Monitoring */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 font-semibold">Monitored Coins</h2>
          <div className="space-y-3">
            {Object.values(MONITORED_COINS).map((coin) => {
              const isActive = selectedCoins.includes(coin.symbol)
              const setting = coinSettings[coin.symbol]

              return (
                <div key={coin.symbol}>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors">
                    <button
                      onClick={() => toggleCoin(coin.symbol)}
                      className={cn(
                        'relative h-5 w-9 rounded-full transition-colors flex-shrink-0',
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
                    <div className="flex-1">
                      <span className="text-sm font-semibold">{coin.symbol}</span>
                      <span className="ml-2 text-xs text-gray-500">{coin.name}</span>
                    </div>
                  </div>

                  {isActive && setting && (
                    <div className="mt-2 ml-12 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Max Swap ($)</label>
                          <input
                            type="number"
                            value={setting.maxSwapUSD}
                            onChange={(e) =>
                              updateCoinSetting(coin.symbol, { maxSwapUSD: Number(e.target.value) })
                            }
                            className="w-full rounded px-2 py-1.5 bg-gray-900 border border-gray-700 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Risk Level</label>
                          <select
                            value={setting.riskSensitivity}
                            onChange={(e) =>
                              updateCoinSetting(coin.symbol, {
                                riskSensitivity: e.target.value as RiskSensitivity,
                              })
                            }
                            className="w-full rounded px-2 py-1.5 bg-gray-900 border border-gray-700 text-sm"
                          >
                            {RISK_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Info Footer */}
        <div className="mt-8 rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-center text-xs text-gray-500">
          <Shield className="mx-auto mb-2 h-4 w-4 text-gray-600" />
          Your settings are saved locally and synced across sessions.
        </div>
      </main>
    </div>
  )
}
