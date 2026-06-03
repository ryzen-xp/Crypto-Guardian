import type { RelayResult } from './types'

const ONESHOT_BASE_URL = process.env.ONESHOT_API_URL ?? 'https://api.1shotapi.com'

function getApiKey(): string {
  const key = process.env.ONESHOT_API_KEY
  if (!key) throw new Error('ONESHOT_API_KEY environment variable is not set')
  return key
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RelayParams = {
  /** Contract address to call */
  to: string
  /** Encoded calldata */
  data: string
  /** ETH value in wei (usually 0 for ERC20 swaps) */
  value?: string
  /** User's Smart Account address */
  userAddress: string
  /** Chain ID — 8453 for Base */
  chainId: number
}

type OneShotRelayResponse = {
  relayId: string
  status: string
  txHash?: string
  estimatedGasUSDC: string
}

// ─── Relay Transaction ────────────────────────────────────────────────────────

/**
 * Submit a transaction to the 1Shot relayer.
 * Gas is paid in USDC from the user's Smart Account.
 */
export async function relayTransaction(params: RelayParams): Promise<RelayResult> {
  const { to, data, value = '0x0', userAddress, chainId } = params

  const res = await fetch(`${ONESHOT_BASE_URL}/v1/relay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      data,
      value,
      from: userAddress,
      chainId,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`1Shot relay error ${res.status}: ${text}`)
  }

  const result = (await res.json()) as OneShotRelayResponse

  return {
    relayId: result.relayId,
    status: result.status === 'confirmed' ? 'confirmed' : 'pending',
    txHash: result.txHash,
    estimatedGasUSDC: result.estimatedGasUSDC,
  }
}

// ─── Get Relay Status ─────────────────────────────────────────────────────────

export async function getRelayStatus(relayId: string): Promise<RelayResult> {
  const res = await fetch(`${ONESHOT_BASE_URL}/v1/relay/${relayId}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })

  if (!res.ok) {
    throw new Error(`1Shot status check error ${res.status}`)
  }

  const result = (await res.json()) as OneShotRelayResponse

  return {
    relayId: result.relayId,
    status:
      result.status === 'confirmed'
        ? 'confirmed'
        : result.status === 'failed'
          ? 'failed'
          : 'pending',
    txHash: result.txHash,
    estimatedGasUSDC: result.estimatedGasUSDC,
  }
}

// ─── Upgrade to Smart Account (EIP-7702) ─────────────────────────────────────

/**
 * Upgrade a regular EOA to a Smart Account via 1Shot's EIP-7702 upgrade.
 * Returns the Smart Account address (same as original address).
 */
export async function upgradeAccountEIP7702(walletAddress: string): Promise<string> {
  const res = await fetch(`${ONESHOT_BASE_URL}/v1/upgrade`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: walletAddress,
      chainId: 8453,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`1Shot EIP-7702 upgrade error ${res.status}: ${text}`)
  }

  const result = (await res.json()) as { smartAccountAddress: string; txHash: string }
  return result.smartAccountAddress
}

import crypto from 'crypto'

// ─── Webhook Signature Verification ──────────────────────────────────────────

/**
 * Verify a 1Shot webhook payload signature.
 * Call this in /api/webhooks before processing any webhook.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.ONESHOT_WEBHOOK_SECRET
  if (!secret) {
    console.warn('ONESHOT_WEBHOOK_SECRET not set — skipping signature verification')
    return true
  }

  // 1Shot uses HMAC-SHA256
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
