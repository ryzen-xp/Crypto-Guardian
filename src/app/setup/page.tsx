'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useSwitchChain, useSignMessage } from 'wagmi'

export const dynamic = 'force-dynamic'

import {
  Check,
  CheckCircle,
  ChevronRight,
  Wallet,
  Coins,
  Lock,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Info,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton'
import { MONITORED_COINS, STABLECOINS } from '@/lib/coins'
import { CHAIN_CONFIG, ACTIVE_CHAIN } from '@/lib/chain-config'
import { useCoinStore } from '@/store/coinStore'
import { useWalletBalances } from '@/hooks/useWalletBalances'
import { cn, shortenAddress } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'Connect Wallet', icon: Wallet },
  { id: 2, label: 'Your Holdings', icon: Coins },
  { id: 3, label: 'Permissions', icon: Lock },
]

function formatBalance(amount: number, decimals = 4): string {
  if (amount === 0) return '0'
  if (amount < 0.0001) return '< 0.0001'
  return amount.toFixed(Math.min(decimals, amount < 1 ? 6 : 4))
}

export default function SetupPage() {
  const router = useRouter()
  const { address, isConnected, chain } = useAccount()
  const { switchChain } = useSwitchChain()
  const {
    selectedCoins,
    setSelectedCoins,
    selectedStablecoin,
    setSelectedStablecoin,
    coinSettings,
    updateCoinSetting,
  } = useCoinStore()

  const {
    balances,
    heldCoins,
    isLoading: balancesLoading,
    error: balancesError,
    refetch,
  } = useWalletBalances()

  const [step, setStep] = useState(1)
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [signatureError, setSignatureError] = useState<string | null>(null)

  const { signMessageAsync } = useSignMessage()

  const stablecoins = Object.values(STABLECOINS)
  const isOnCorrectChain = chain?.id === ACTIVE_CHAIN.id

  // Auto-select coins when balances load — only held coins
  useEffect(() => {
    if (heldCoins.length > 0 && step === 2) {
      setSelectedCoins(heldCoins)
    }
  }, [heldCoins, step, setSelectedCoins])

  const canProceedStep1 = isConnected && isOnCorrectChain
  const canProceedStep2 = selectedCoins.length > 0
  const canProceedStep3 = permissionsGranted

  const handleContinue = () => {
    if (step === 1 && canProceedStep1) setStep(2)
    else if (step === 2 && canProceedStep2) setStep(3)
    else if (step === 3) router.push('/dashboard?autoStart=1')
  }

  const handleGrantPermissions = async () => {
    setIsSigning(true)
    setSignatureError(null)
    try {
      const msg = `Authorize Crypto-Guardian agent rules on Sepolia Testnet.

Monitored Coins & Daily Limits:
${selectedCoins
  .map((symbol) => {
    const setting = coinSettings[symbol] ?? {
      maxSwapUSD: 300,
      dailyLimitUSD: 600,
      riskSensitivity: 'conservative',
    }
    return `- ${symbol}: Max $${setting.maxSwapUSD}/swap, Daily Limit: $${setting.dailyLimitUSD}, Risk: ${setting.riskSensitivity}`
  })
  .join('\n')}

Safe Stablecoin: ${selectedStablecoin}
Agent Validity: 30 Days (ERC-7715 & 1Shot API Relay)`

      const signature = await signMessageAsync({ message: msg })
      console.warn('Permission signature obtained:', signature)
      setPermissionsGranted(true)
    } catch (err) {
      console.error('Signing failed:', err)
      setSignatureError(err instanceof Error ? err.message : 'Signature request rejected.')
    } finally {
      setIsSigning(false)
    }
  }

  const canContinue =
    (step === 1 && canProceedStep1) ||
    (step === 2 && canProceedStep2) ||
    (step === 3 && canProceedStep3)

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Setup CryptoGuardian</h1>
          <p className="mt-2 text-sm text-gray-400">
            We detect your holdings automatically — no manual selection needed.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-10 flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all',
                    step > s.id
                      ? 'bg-green-500 text-white'
                      : step === s.id
                        ? 'bg-blue-600 text-white ring-4 ring-blue-600/20'
                        : 'border border-white/10 bg-white/5 text-gray-500'
                  )}
                >
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    step === s.id ? 'text-white' : 'text-gray-500'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 mb-4 h-px flex-1 transition-all',
                    step > s.id ? 'bg-green-500/50' : 'bg-white/8'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Connect Wallet ── */}
        {step === 1 && (
          <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
            <h2 className="mb-1 text-xl font-bold">Connect your wallet</h2>
            <p className="mb-6 text-sm text-gray-400">
              CryptoGuardian reads your on-chain balances and monitors only what you actually hold.
            </p>

            {!isConnected ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <ConnectWalletButton label="Connect Wallet" />
                </div>
                <p className="text-center text-xs text-gray-500">
                  Don&apos;t have a wallet?{' '}
                  <a
                    href="https://metamask.io/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Install one free
                  </a>
                </p>
              </div>
            ) : !isOnCorrectChain ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400">Wrong network</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      You&apos;re on <strong>{chain?.name ?? 'unknown'}</strong>. Switch to{' '}
                      <strong>{CHAIN_CONFIG.name}</strong> to continue.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}
                  className="w-full rounded-xl bg-yellow-600 py-3 text-sm font-semibold transition hover:bg-yellow-500"
                >
                  Switch to {CHAIN_CONFIG.name}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
                    <div>
                      <p className="text-sm font-semibold text-green-400">Wallet connected</p>
                      <p className="mt-0.5 font-mono text-xs text-gray-400">
                        {address ? shortenAddress(address) : ''}
                      </p>
                    </div>
                    <div className="ml-auto rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                      {CHAIN_CONFIG.name}
                    </div>
                  </div>
                </div>

                {CHAIN_CONFIG.isTestnet && (
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-orange-300">
                    <span className="font-semibold">Testnet mode</span> — no real funds at risk. Get
                    test tokens from{' '}
                    <a
                      href={CHAIN_CONFIG.faucetUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-orange-400 underline"
                    >
                      Alchemy Faucet <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Detected Holdings ── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Stablecoin picker */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
              <h2 className="mb-1 text-xl font-bold">Choose your safe asset</h2>
              <p className="mb-5 text-sm text-gray-400">
                DANGER swaps convert your holdings into this stablecoin.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {stablecoins.map((stable) => (
                  <button
                    key={stable.symbol}
                    onClick={() => setSelectedStablecoin(stable.symbol)}
                    className={cn(
                      'relative rounded-xl border p-4 text-left transition-all',
                      selectedStablecoin === stable.symbol
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
                        : 'border-white/8 bg-white/3 hover:border-white/15'
                    )}
                  >
                    {selectedStablecoin === stable.symbol && (
                      <Check className="absolute top-3 right-3 h-4 w-4 text-blue-400" />
                    )}
                    <div className="text-base font-bold">{stable.symbol}</div>
                    <div className="mt-0.5 text-xs text-gray-500">{stable.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-detected holdings */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Detected holdings</h2>
                  <p className="mt-0.5 text-sm text-gray-400">
                    Read from your wallet on {CHAIN_CONFIG.name}. Only these will be monitored.
                  </p>
                </div>
                <button
                  onClick={refetch}
                  disabled={balancesLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-white/10 disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3 w-3', balancesLoading && 'animate-spin')} />
                  Refresh
                </button>
              </div>

              {balancesLoading ? (
                <div className="flex items-center justify-center gap-3 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  <span className="text-sm text-gray-400">Reading balances from blockchain...</span>
                </div>
              ) : balancesError ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
                  <p className="text-sm text-red-400">Failed to read balances</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">{balancesError}</p>
                  <button
                    onClick={refetch}
                    className="mt-3 rounded-lg bg-red-600/20 px-4 py-1.5 text-xs text-red-400 transition hover:bg-red-600/30"
                  >
                    Try again
                  </button>
                </div>
              ) : balances ? (
                <div className="space-y-2">
                  {Object.values(MONITORED_COINS).map((coin) => {
                    const balance = balances[coin.symbol]
                    const isHeld = balance?.isHeld ?? false
                    const formatted = balance?.formatted ?? 0

                    return (
                      <div
                        key={coin.symbol}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-4 transition-all',
                          isHeld
                            ? 'border-green-500/25 bg-green-500/5'
                            : 'border-white/5 bg-white/2 opacity-50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
                            isHeld ? 'bg-green-500/15 text-green-300' : 'bg-white/8 text-gray-500'
                          )}
                        >
                          {coin.symbol.slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{coin.symbol}</span>
                            {isHeld && (
                              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-400">
                                HELD
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{coin.name}</span>
                        </div>
                        <div className="text-right">
                          {isHeld ? (
                            <div className="font-mono text-sm font-semibold text-white">
                              {formatBalance(formatted)} {coin.symbol}
                            </div>
                          ) : (
                            <div className="font-mono text-xs text-gray-600">0 balance</div>
                          )}
                        </div>
                        {isHeld && <Check className="h-4 w-4 flex-shrink-0 text-green-400" />}
                      </div>
                    )
                  })}

                  {heldCoins.length === 0 && (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center">
                      <Info className="mx-auto mb-2 h-6 w-6 text-yellow-400" />
                      <p className="text-sm font-medium text-yellow-300">
                        No monitored assets found
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Your wallet doesn&apos;t hold ETH, WBTC, LINK or UNI on {CHAIN_CONFIG.name}.
                      </p>
                      {CHAIN_CONFIG.isTestnet && (
                        <a
                          href={CHAIN_CONFIG.faucetUrl ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs text-orange-400 underline"
                        >
                          Get test tokens from faucet <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {heldCoins.length > 0 && (
                    <p className="pt-2 text-center text-xs text-gray-500">
                      {heldCoins.length} asset{heldCoins.length > 1 ? 's' : ''} will be monitored ·{' '}
                      <span className="text-gray-400">
                        {Object.values(MONITORED_COINS).length - heldCoins.length} with zero balance
                        skipped
                      </span>
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ── Step 3: Grant Permissions ── */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Custom Rules Configurator */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
              <h2 className="mb-1 text-xl font-bold text-white">Configure Swap Rules</h2>
              <p className="mb-5 text-sm text-gray-400">
                Manually customize the protection parameters for each asset.
              </p>

              <div className="space-y-4">
                {selectedCoins.map((symbol) => {
                  const setting = coinSettings[symbol] ?? {
                    enabled: true,
                    maxSwapUSD: 300,
                    dailyLimitUSD: 600,
                    minHoldUSD: 100,
                    riskSensitivity: 'conservative',
                  }

                  return (
                    <div
                      key={symbol}
                      className="rounded-xl border border-white/8 bg-gray-900/50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-400" />
                          <span className="font-bold text-white">{symbol} Protection Rules</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-400">
                            Max Per Swap (USD)
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 font-mono text-sm text-gray-500">
                              $
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={setting.maxSwapUSD}
                              onChange={(e) =>
                                updateCoinSetting(symbol, {
                                  maxSwapUSD: Math.max(1, Number(e.target.value)),
                                })
                              }
                              className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pr-3 pl-7 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-400">
                            Daily Limit (USD)
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 font-mono text-sm text-gray-500">
                              $
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={setting.dailyLimitUSD}
                              onChange={(e) =>
                                updateCoinSetting(symbol, {
                                  dailyLimitUSD: Math.max(1, Number(e.target.value)),
                                })
                              }
                              className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pr-3 pl-7 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-gray-400">
                            Risk Sensitivity Mode
                          </label>
                          <select
                            value={setting.riskSensitivity}
                            onChange={(e) =>
                              updateCoinSetting(symbol, {
                                riskSensitivity: e.target.value as
                                  | 'conservative'
                                  | 'moderate'
                                  | 'aggressive',
                              })
                            }
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none [&>option]:bg-gray-950"
                          >
                            <option value="conservative">Conservative (Swap 25% on DANGER)</option>
                            <option value="moderate">Moderate (Swap 50% on DANGER)</option>
                            <option value="aggressive">
                              Aggressive (Swap 75% on DANGER, BUY on OPPORTUNITY)
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cryptographic signature verification and grant */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
              <h2 className="mb-1 text-xl font-bold">Sign &amp; Enable Agent</h2>
              <p className="mb-6 text-sm text-gray-400">
                Verify authorization parameters by signing a cryptographic message with MetaMask.
              </p>

              <div className="mb-6 rounded-xl border border-white/8 bg-gray-950 p-4">
                <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Current Settings Summary
                </p>
                <div className="space-y-2">
                  {selectedCoins.map((symbol) => {
                    const setting = coinSettings[symbol]
                    return (
                      <div key={symbol} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          <span className="text-sm font-medium">{symbol}</span>
                        </div>
                        <span className="font-mono text-xs text-gray-400">
                          max ${setting?.maxSwapUSD ?? 300}/swap · ${setting?.dailyLimitUSD ?? 600}
                          /day
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-sm font-medium text-gray-300">Target safe asset</span>
                    <span className="text-xs font-semibold text-blue-400">
                      {selectedStablecoin}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Grant expiry</span>
                    <span className="text-xs text-gray-400">30 days from now</span>
                  </div>
                </div>
              </div>

              {signatureError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                  <span className="font-semibold">Signature Error:</span> {signatureError}
                </div>
              )}

              {!permissionsGranted ? (
                <>
                  {address && (
                    <p className="mb-4 text-center font-mono text-xs text-gray-500">
                      Signer: {shortenAddress(address)}
                    </p>
                  )}
                  <button
                    onClick={handleGrantPermissions}
                    disabled={isSigning}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-semibold shadow-lg shadow-green-600/20 transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSigning ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Requesting Signature...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Sign &amp; Enable Protection
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-xs text-gray-600">
                    Triggers a cryptographic MetaMask signature request to authorize EIP-7702 and
                    1Shot relayer execution.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 text-center">
                  <CheckCircle className="mx-auto mb-2 h-10 w-10 animate-bounce text-green-400" />
                  <p className="font-semibold text-green-400">Signature authorized successfully!</p>
                  <p className="mt-1 text-xs text-gray-400">
                    CryptoGuardian agent is now running and monitoring your assets.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="rounded-lg border border-white/8 bg-white/3 px-5 py-2.5 text-sm font-medium transition hover:bg-white/8"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 3 ? 'Go to Dashboard' : 'Continue'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  )
}
