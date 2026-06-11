'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  Wallet,
  X,
} from 'lucide-react'
import { cn, shortenAddress } from '@/lib/utils'

type ConnectWalletButtonProps = {
  label?: string
  className?: string
}

const CONNECTOR_PRIORITY = ['metaMask', 'walletConnect', 'safe', 'injected']

// Connector icon + description mapping
const CONNECTOR_META: Record<string, { icon: string; desc: string }> = {
  metaMask: { icon: '🦊', desc: 'The most popular Ethereum browser wallet' },
  walletConnect: { icon: '🔗', desc: 'Scan with any mobile wallet app' },
  safe: { icon: '🔐', desc: 'Connect with Safe (multisig wallets)' },
  injected: { icon: '💉', desc: 'Use your browser-detected wallet' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handle}
      title="Copy address"
      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition hover:bg-white/10 hover:text-gray-300"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export default function ConnectWalletButton({
  label = 'Connect Wallet',
  className,
}: ConnectWalletButtonProps) {
  const { address, isConnected, chain } = useAccount()
  const { connectors, connect, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()

  const [modalOpen, setModalOpen] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close modals on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false)
        setShowAccount(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close modal after successful connection
  useEffect(() => {
    if (isConnected && modalOpen) setModalOpen(false)
  }, [isConnected, modalOpen])

  const sortedConnectors = useMemo(() => {
    return [...connectors].sort((a, b) => {
      const ai = CONNECTOR_PRIORITY.indexOf(a.id)
      const bi = CONNECTOR_PRIORITY.indexOf(b.id)
      const an = ai === -1 ? 999 : ai
      const bn = bi === -1 ? 999 : bi
      if (an !== bn) return an - bn
      return a.name.localeCompare(b.name)
    })
  }, [connectors])

  // ── Connected state ─────────────────────────────────────────────────────────
  if (isConnected && address) {
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setShowAccount((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/20"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-mono">{shortenAddress(address)}</span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 opacity-60 transition-transform', showAccount && 'rotate-180')}
          />
        </button>

        {showAccount && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowAccount(false)}
            />
            {/* Dropdown */}
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-gray-900 shadow-2xl shadow-black/60 ring-1 ring-white/5">
              {/* Address row */}
              <div className="border-b border-white/8 px-4 py-4">
                <p className="mb-1 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  Connected Account
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm text-white">{shortenAddress(address)}</span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <CopyButton text={address} />
                    <a
                      href={`https://etherscan.io/address/${address}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View on Etherscan"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition hover:bg-white/10 hover:text-gray-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                {chain && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-gray-400">{chain.name}</span>
                  </div>
                )}
              </div>

              {/* Disconnect */}
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    disconnect()
                    setShowAccount(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect Wallet
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Disconnected state ───────────────────────────────────────────────────────
  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
        aria-haspopup="dialog"
      >
        <Wallet className="h-4 w-4" />
        {label}
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 shadow-2xl shadow-black/80">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-white">Connect Wallet</h2>
                <p className="mt-0.5 text-xs text-gray-400">Choose your preferred wallet</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Connector list */}
            <div className="space-y-1.5 p-3">
              {sortedConnectors.map((connector) => {
                const meta = CONNECTOR_META[connector.id] ?? { icon: '🔌', desc: 'Connect with this wallet' }
                return (
                  <button
                    key={connector.id}
                    type="button"
                    onClick={() => connect({ connector })}
                    disabled={isPending}
                    className="group flex w-full items-center gap-3.5 rounded-xl border border-white/5 bg-white/3 px-4 py-3.5 text-left transition hover:border-blue-500/30 hover:bg-blue-500/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="text-2xl leading-none" role="img" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{connector.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{meta.desc}</p>
                    </div>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-gray-600 transition group-hover:text-blue-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-3 mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-400">{error.message}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-white/8 px-5 py-3.5">
              <a
                href="https://metamask.io/download"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 transition hover:text-blue-300"
              >
                <ExternalLink className="h-3 w-3" />
                Don&apos;t have a wallet? Install MetaMask
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
