'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton'

export const dynamic = 'force-dynamic'
import { Shield, LayoutDashboard, Settings, Pause, Play, Activity, TerminalSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCoinStore } from '@/store/coinStore'
import { useAgentStore } from '@/store/agentStore'
import { CHAIN_CONFIG } from '@/lib/chain-config'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/terminal',  label: 'Terminal',  icon: TerminalSquare },
  { href: '/settings',  label: 'Settings',  icon: Settings },
]

export default function Header() {
  const pathname = usePathname()
  const { isPaused, togglePause } = useCoinStore()
  const { status } = useAgentStore()

  const agentRunning = status === 'running'

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Shield className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-bold tracking-tight">CryptoGuardian</span>
            {CHAIN_CONFIG.isTestnet && (
              <span className="ml-1.5 rounded bg-orange-500/20 px-1 py-0.5 text-[9px] font-bold tracking-wider text-orange-400 uppercase">
                Testnet
              </span>
            )}
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                pathname === href
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Agent status pill */}
          <div
            className={cn(
              'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold md:flex',
              isPaused
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                : agentRunning
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-green-500/30 bg-green-500/10 text-green-400'
            )}
          >
            <Activity
              className={cn(
                'h-3 w-3',
                !isPaused && !agentRunning && 'text-green-400',
                agentRunning && 'animate-pulse text-blue-400',
                isPaused && 'text-yellow-400'
              )}
            />
            {isPaused ? 'Paused' : agentRunning ? 'Scanning' : 'Active'}
          </div>

          {/* Pause / Resume */}
          <button
            onClick={togglePause}
            title={isPaused ? 'Resume monitoring' : 'Pause monitoring'}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
              isPaused
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            )}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          {/* Wallet */}
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  )
}
