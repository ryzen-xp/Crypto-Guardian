/**
 * MetaMask Smart Accounts Kit integration.
 *
 * Uses @metamask/delegation-toolkit for ERC-7715 permission granting.
 * EIP-7702 upgrades are handled via the 1Shot API (see oneshot.ts).
 *
 * NOTE: This module is client-safe — no server secrets used here.
 * All operations require the user's wallet to sign.
 */

import type { CoinConfig, CoinSettings, PermissionGrant, PermissionStatus } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

/** 30-day permission expiry in seconds */
const PERMISSION_DURATION_SECONDS = 30 * 24 * 60 * 60

// ─── Permission Status ────────────────────────────────────────────────────────

/**
 * Check the current permission status for an address.
 * Reads from localStorage (for MVP) — swap for onchain check in production.
 */
export function getPermissionStatus(address: string): PermissionStatus {
  if (typeof window === 'undefined') {
    return { active: false, coinsPermitted: [], needsRenewal: false }
  }

  const stored = localStorage.getItem(`cg_permissions_${address.toLowerCase()}`)
  if (!stored) {
    return { active: false, coinsPermitted: [], needsRenewal: false }
  }

  const grant = JSON.parse(stored) as {
    expiresAt: string
    coinsPermitted: string[]
  }

  const expiresAt = new Date(grant.expiresAt)
  const now = new Date()
  const isExpired = expiresAt < now
  const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    active: !isExpired,
    expiresAt,
    daysLeft: Math.max(0, daysLeft),
    coinsPermitted: grant.coinsPermitted,
    needsRenewal: !isExpired && daysLeft < 7,
  }
}

/**
 * Save permission grant to localStorage after successful ERC-7715 grant.
 */
export function savePermissionGrant(address: string, grant: PermissionGrant): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(
    `cg_permissions_${address.toLowerCase()}`,
    JSON.stringify({
      expiresAt: grant.expiresAt.toISOString(),
      coinsPermitted: grant.coinsPermitted,
      grantId: grant.grantId,
    })
  )
}

/**
 * Clear stored permissions (on revoke or wallet change).
 */
export function clearPermissions(address: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`cg_permissions_${address.toLowerCase()}`)
}

// ─── Permission Grant (ERC-7715) ──────────────────────────────────────────────

type GrantPermissionsParams = {
  coins: CoinConfig[]
  limits: CoinSettings
  walletAddress: string
}

/**
 * Build the ERC-7715 permission grant request.
 *
 * This constructs the permissions object for @metamask/delegation-toolkit.
 * The actual signing is handled by the wallet (MetaMask).
 *
 * TODO: Replace placeholder implementation with actual delegation-toolkit calls
 * once @metamask/delegation-toolkit API is confirmed for the hackathon.
 */
export function buildPermissionRequest(params: GrantPermissionsParams): {
  permissions: unknown[]
  expiry: number
} {
  const { coins, limits } = params

  const expiry = Math.floor(Date.now() / 1000) + PERMISSION_DURATION_SECONDS

  // Build ERC20 transfer permission for each coin
  const permissions = coins
    .filter((coin) => limits[coin.symbol]?.enabled)
    .map((coin) => {
      const limit = limits[coin.symbol]
      if (!limit) return null

      return {
        type: 'erc20-transfer',
        data: {
          token: coin.baseAddress,
          allowance: limit.dailyLimitUSD * 100, // TODO: convert to token units
        },
      }
    })
    .filter(Boolean)

  return { permissions, expiry }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format expiry date for display */
export function formatPermissionExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
