'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Check, Wallet, Settings as SettingsIcon, CheckCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import { MONITORED_COINS, STABLECOINS } from '@/lib/coins'
import { useCoinStore } from '@/store/coinStore'
import { cn } from '@/lib/utils'

export default function SetupPage() {
  const router = useRouter()
  const { selectedCoins, toggleCoin, selectedStablecoin, setSelectedStablecoin } = useCoinStore()
  const [step, setStep] = useState(1)
  const [walletConnected, setWalletConnected] = useState(false)

  const coins = Object.values(MONITORED_COINS)
  const stablecoins = Object.values(STABLECOINS)

  const handleContinue = () => {
    if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    else if (step === 3) router.push('/dashboard')
  }

  const canContinue =
    (step === 1 && walletConnected) || (step === 2 && selectedCoins.length > 0) || step === 3

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Progress */}
        <div className="mb-8 flex justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-700 bg-gray-900 text-gray-500'
                )}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={cn('h-0.5 flex-1', step > s ? 'bg-blue-600' : 'bg-gray-800')} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-bold">Connect Wallet</h2>
            </div>
            <p className="mb-6 text-sm text-gray-400">
              Connect your MetaMask wallet and upgrade to a Smart Account for permissionless swaps.
            </p>

            {!walletConnected ? (
              <button
                onClick={() => setWalletConnected(true)}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold transition-colors hover:bg-blue-500"
              >
                Connect MetaMask
              </button>
            ) : (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-semibold">Wallet Connected</span>
                </div>
                <div className="font-mono text-xs text-gray-400">0x1234...5678 (Demo Wallet)</div>
                <div className="mt-3 text-xs text-green-400">Smart Account active ✓</div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-4 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-bold">Select Coins & Stablecoin</h2>
            </div>
            <p className="mb-6 text-sm text-gray-400">
              Choose which coins to monitor and your preferred safe asset (stablecoin).
            </p>

            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-300">Safe Asset (Stablecoin)</h3>
              <div className="grid grid-cols-2 gap-2">
                {stablecoins.map((stable) => (
                  <button
                    key={stable.symbol}
                    onClick={() => setSelectedStablecoin(stable.symbol)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      selectedStablecoin === stable.symbol
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{stable.symbol}</span>
                      {selectedStablecoin === stable.symbol && (
                        <Check className="ml-auto h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{stable.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-300">
                Coins to Monitor ({selectedCoins.length}/10)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {coins.map((coin) => {
                  const isSelected = selectedCoins.includes(coin.symbol)
                  return (
                    <button
                      key={coin.symbol}
                      onClick={() => toggleCoin(coin.symbol)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-2.5 transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      )}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs font-bold">
                        {coin.symbol.slice(0, 2)}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-xs font-semibold">{coin.symbol}</div>
                        <div className="text-[10px] text-gray-500">{coin.name}</div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-400" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-400" />
              <h2 className="text-xl font-bold">Grant Permissions</h2>
            </div>
            <p className="mb-6 text-sm text-gray-400">
              Grant CryptoGuardian permission to protect your portfolio for 30 days.
            </p>

            <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4">
              <div className="mb-3 text-sm font-semibold">You are granting permission for:</div>
              <ul className="space-y-1 text-xs text-gray-400">
                {selectedCoins.map((symbol) => (
                  <li key={symbol} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-400" />
                    <span>{symbol} — max $300/swap, $600/day</span>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-400" />
                  <span>Safe asset: {selectedStablecoin}</span>
                </li>
              </ul>
              <div className="mt-3 text-xs text-gray-500">Expires: 30 days from now</div>
            </div>

            <button
              onClick={() => {}}
              className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold transition-colors hover:bg-green-500"
            >
              Sign & Grant Permissions
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm transition-colors hover:border-gray-500"
            >
              Back
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {step === 3 ? 'Go to Dashboard' : 'Continue'}
          </button>
        </div>
      </main>
    </div>
  )
}
