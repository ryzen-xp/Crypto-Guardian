/**
 * MetaMask Smart Accounts Kit integration.
 *
 * Uses @metamask/delegation-toolkit for ERC-7715 permission granting.
 * EIP-7702 upgrades are handled via the 1Shot API (see oneshot.ts).
 *
 * NOTE: This module is client-safe — no server secrets used here.
 * All operations require the user's wallet to sign.
 */

import crypto from 'crypto'
import type { CoinConfig, CoinSettings, PermissionGrant, PermissionStatus } from './types'
import type { Delegation7710 } from './oneshot'

// ─── Constants ────────────────────────────────────────────────────────────────

/** 30-day permission expiry in seconds */
const PERMISSION_DURATION_SECONDS = 30 * 24 * 60 * 60

// ─── Delegation Signing (Client-Side) ─────────────────────────────────────────

/**
 * Create and sign a delegation for 1-Shot relay transactions.
 * 
 * This creates a valid ERC-7710 delegation structure that will be signed
 * by the user's MetaMask smart account via wallet_invokeDelegation or similar.
 * 
 * For now, we use a mock signature - the real signature must come from MetaMask.
 */
export function createDelegationForRelay(params: {
  userAddress: string
  targetAddress: string
  maxAmountAtoms: bigint
  tokenAddress: string
  chainId: number
}): Delegation7710 {
  const { userAddress, targetAddress, maxAmountAtoms, tokenAddress, chainId } = params

  // Generate a fresh salt for this delegation
  const salt = '0x' + crypto.randomBytes(32).toString('hex')

  // For now, return a delegation structure with empty signature
  // The frontend must sign this via MetaMask before submitting to the relayer
  const delegation: Delegation7710 = {
    delegate: targetAddress.toLowerCase() as `0x${string}`,
    delegator: userAddress.toLowerCase() as `0x${string}`,
    authority: '0x0000000000000000000000000000000000000000000000000000000000000000',
    caveats: [],
    salt,
    signature: '0x', // Empty signature - will be filled by client signing
  }

  console.warn(`[SmartAccounts] Created delegation structure:`, {
    delegate: delegation.delegate,
    delegator: delegation.delegator,
    salt: delegation.salt,
  })

  return delegation
}

/**
 * Request the user to sign a delegation via MetaMask.
 * 
 * This requires the `wallet_invokeMethod` capability with `signDelegation` support.
 * Falls back to `eth_signTypedData_v4` if needed.
 */
export async function signDelegationWithMetaMask(
  delegation: Delegation7710,
  userAddress: string
): Promise<Delegation7710> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not available - cannot sign delegation client-side')
  }

  try {
    // Try MetaMask's wallet_invokeMethod first (new API)
    const signedSignature = await window.ethereum.request({
      method: 'wallet_invokeMethod',
      params: {
        method: 'smartAccount_signDelegation',
        params: [delegation],
      },
    } as any)

    if (signedSignature && typeof signedSignature === 'string') {
      console.warn(`[SmartAccounts] Successfully signed delegation:`, signedSignature.slice(0, 20) + '...')
      return {
        ...delegation,
        signature: signedSignature,
      }
    }
  } catch (err) {
    console.warn(`[SmartAccounts] wallet_invokeMethod not supported, trying fallback:`, err)
  }

  // Fallback: Use eth_signTypedData_v4
  // This is a simplified EIP-712 signature - NOT a proper ERC-7710 delegation signature
  // But it's better than nothing for testing
  try {
    const delegationHash = getDelegationHash(delegation)

    const signature = await window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [userAddress, JSON.stringify(delegationHash)],
    } as any)

    console.warn(`[SmartAccounts] Signed delegation using eth_signTypedData_v4:`, signature.slice(0, 20) + '...')
    return {
      ...delegation,
      signature,
    }
  } catch (err) {
    throw new Error(`Failed to sign delegation: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Create a simple EIP-712 hash for delegation signing.
 * This is a placeholder - proper ERC-7710 delegation signing requires the MetaMask Kit.
 */
function getDelegationHash(delegation: Delegation7710): Record<string, unknown> {
  return {
    types: {
      Delegation: [
        { name: 'delegate', type: 'address' },
        { name: 'delegator', type: 'address' },
        { name: 'authority', type: 'bytes32' },
        { name: 'salt', type: 'bytes32' },
      ],
    },
    primaryType: 'Delegation',
    domain: {
      name: 'CryptoGuardian',
      version: '1',
      chainId: 11155111,
    },
    message: {
      delegate: delegation.delegate,
      delegator: delegation.delegator,
      authority: delegation.authority,
      salt: delegation.salt,
    },
  }
}

/**
 * Create and sign a delegation in one step.
 * Returns the signed delegation or throws an error if signing fails.
 */
export async function createAndSignDelegation(params: {
  userAddress: string
  targetAddress: string
  maxAmountAtoms: bigint
  tokenAddress: string
  chainId: number
}): Promise<Delegation7710> {
  const delegation = createDelegationForRelay(params)
  return signDelegationWithMetaMask(delegation, params.userAddress)
}

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
      expiresAt: new Date(grant.expiresAt * 1000).toISOString(),
      coinsPermitted: [],
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
