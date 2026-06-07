import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Verdict } from './types'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format USD amount */
export function formatUSD(amount: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

/** Format a price change percentage with + sign */
export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

/** Format a wallet address to short form: 0x1234...5678 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/** Format relative time: "2 minutes ago", "just now" */
export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Format countdown: "in 12m 30s" */
export function formatCountdown(targetDate: Date): string {
  const ms = targetDate.getTime() - Date.now()
  if (ms <= 0) return 'now'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) return `in ${minutes}m ${seconds}s`
  return `in ${seconds}s`
}

/** Get Tailwind color classes for a verdict */
export function getVerdictColors(verdict: Verdict): {
  bg: string
  border: string
  text: string
  badge: string
} {
  switch (verdict) {
    case 'DANGER':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/50',
        text: 'text-red-400',
        badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
      }
    case 'CAUTION':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/50',
        text: 'text-yellow-400',
        badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      }
    case 'OPPORTUNITY':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/50',
        text: 'text-green-400',
        badge: 'bg-green-500/20 text-green-400 border border-green-500/30',
      }
    case 'NEUTRAL':
    default:
      return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-400',
        badge: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
      }
  }
}

/** Get verdict emoji */
export function getVerdictEmoji(verdict: Verdict): string {
  switch (verdict) {
    case 'DANGER':
      return '🔴'
    case 'CAUTION':
      return '🟡'
    case 'OPPORTUNITY':
      return '🟢'
    case 'NEUTRAL':
    default:
      return '⚪'
  }
}

/** Explorer link for a transaction — chain-aware */
export function getBasescanUrl(txHash: string): string {
  const explorerUrl =
    typeof window !== 'undefined'
      ? (document.querySelector('meta[name="explorer-url"]')?.getAttribute('content') ??
        'https://sepolia.etherscan.io')
      : 'https://sepolia.etherscan.io'
  return `${explorerUrl}/tx/${txHash}`
}
