import crypto from 'crypto'
import { formatUnits, parseUnits } from 'viem'
import { IS_TESTNET } from './chain-config'
import type { RelayResult } from './types'

// 1Shot uses JSON-RPC, not REST
function getMockRelayResult(relayId?: string): RelayResult {
  return {
    relayId: relayId ?? `relay_${Math.random().toString(36).substring(2, 11)}`,
    status: 'confirmed',
    txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    estimatedGasUSDC: (Math.random() * 0.5 + 0.1).toFixed(2),
  }
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
  /** Chain ID — 11155111 for Sepolia, 1 for mainnet */
  chainId: number
}

type OneShotRelayResponse = {
  relayId: string
  status: string
  txHash?: string
  estimatedGasUSDC: string
}

type RelayerCall = {
  target: string
  value: string
  data: string
}

type RelayerFeeData = {
  chainId: string
  token: {
    address: string
    decimals: number
    symbol?: string
    name?: string
  }
  rate: number
  minFee: string
  expiry?: number
  gasPrice?: string
  feeCollector?: string
  targetAddress?: string
  context?: string
}

type RelayerQuoteResponse = {
  gasUsed?: string
  gasUsedL1?: string
  gasPrice?: string
  fee?: {
    amount: string
    rate?: number
    token?: {
      address: string
      decimals: number | string
      symbol?: string
      name?: string
    }
  }
  relayer_payment_address?: string
  relayerCalls?: RelayerCall[]
  revert_reason?: string
}

type Relayer7710Execution = {
  target: string
  value: string
  data: string
}

type Relayer7710Delegation = Record<string, unknown>

type Relayer7710Bundle = {
  permissionContext: Relayer7710Delegation[]
  executions: Relayer7710Execution[]
}

type RelayerTokenInfo = {
  address: string
  symbol: string
  decimals: string
}

type RelayerCapabilities = {
  feeCollector?: string
  targetAddress?: string
  tokens?: RelayerTokenInfo[]
}

type Relayer7710Transaction = {
  chainId: string
  transactions: Relayer7710Bundle[]
  taskId?: string
}

function getRelayerUrl(chainId: number): string {
  return IS_TESTNET || chainId === 11155111
    ? 'https://relayer.1shotapi.dev/relayers'
    : 'https://relayer.1shotapi.com/relayers'
}

async function fetchRelayerJson(body: unknown, relayerUrl: string) {
  const res = await fetch(relayerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  return { res, json }
}

async function getRelayerCapabilities(chainId: number): Promise<RelayerCapabilities | null> {
  const relayerUrl = getRelayerUrl(chainId)
  const body = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).substring(2, 11),
    method: 'relayer_getCapabilities',
    params: [String(chainId)],
  }

  const { res, json } = await fetchRelayerJson(body, relayerUrl)
  if (!res.ok || !json) return null
  const caps = json.result?.[String(chainId)] as RelayerCapabilities | undefined
  return caps ?? null
}

async function getRelayerFeeData(chainId: number, tokenAddress: string): Promise<RelayerFeeData | null> {
  const relayerUrl = getRelayerUrl(chainId)
  const body = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).substring(2, 11),
    method: 'relayer_getFeeData',
    params: {
      chainId: String(chainId),
      token: tokenAddress,
    },
  }

  const { res, json } = await fetchRelayerJson(body, relayerUrl)
  if (!res.ok || !json?.result) return null
  return json.result as RelayerFeeData
}

async function getRelayerQuote(
  chainId: number,
  transaction: Relayer7710Transaction,
  paymentToken: string
): Promise<RelayerQuoteResponse | null> {
  const relayerUrl = getRelayerUrl(chainId)
  const body = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).substring(2, 11),
    method: 'relayer_getQuote',
    params: [
      {
        ...transaction,
        capabilities: {
          payment: {
            type: 'erc20',
            token: paymentToken,
          },
        },
      },
    ],
  }

  const { res, json } = await fetchRelayerJson(body, relayerUrl)
  if (!res.ok || !json) return null
  if (json.error) return null
  return json.result as RelayerQuoteResponse
}

type Relayer7710EstimateResponse = {
  success?: boolean
  requiredPaymentAmount?: string
  gasUsed?: Record<string, string> | string
  context?: string
  contextByChainId?: Record<string, string>
  error?: unknown
}

async function estimateRelayerTransaction(
  chainId: number,
  transaction: Relayer7710Transaction,
  paymentToken: string
): Promise<Relayer7710EstimateResponse | null> {
  const relayerUrl = getRelayerUrl(chainId)
  const body = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).substring(2, 11),
    method: 'relayer_estimate7710Transaction',
    params: [
      {
        ...transaction,
        payment: { type: 'token', address: paymentToken },
      },
    ],
  }

  const { res, json } = await fetchRelayerJson(body, relayerUrl)
  if (!res.ok || !json) return null
  if (json.error) return null
  return json.result as Relayer7710EstimateResponse
}

async function sendRelayerTransaction(
  chainId: number,
  transaction: Relayer7710Transaction,
  paymentToken: string,
  context?: string
): Promise<string | null> {
  const relayerUrl = getRelayerUrl(chainId)
  const body = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).substring(2, 11),
    method: 'relayer_send7710Transaction',
    params: {
      ...transaction,
      payment: { type: 'token', address: paymentToken },
      ...(context ? { context } : {}),
    },
  }

  console.warn(`[1Shot] Sending JSON-RPC request to ${relayerUrl}`)
  console.warn(`[1Shot] Method: relayer_send7710Transaction`)
  console.warn(`[1Shot] Request body: ${JSON.stringify(body)}`)

  const { res, json } = await fetchRelayerJson(body, relayerUrl)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`1Shot sendTransaction error ${res.status}: ${text}`)
  }

  if (json?.error) {
    throw new Error(`1Shot sendTransaction failed: ${JSON.stringify(json.error)}`)
  }

  if (typeof json?.result === 'string') return json.result

  if (json?.result && typeof json.result === 'object') {
    const result = json.result as { id?: string; taskId?: string }
    return result.id ?? result.taskId ?? null
  }

  return null
}

function parseAmountToBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(Math.trunc(value))
  const trimmed = value.trim()
  return trimmed.startsWith('0x') ? BigInt(trimmed) : BigInt(trimmed)
}

// ─── Relay Transaction ────────────────────────────────────────────────────────

/**
 * Submit a transaction to the 1Shot relayer via JSON-RPC.
 * Gas is paid in USDC from the user's Smart Account.
 * 
 * 1Shot uses JSON-RPC API, not REST:
 * - Mainnet: https://relayer.1shotapi.com/relayers
 * - Testnet: https://relayer.1shotapi.dev/relayers
 */
export async function relayTransaction(
  params: RelayParams,
  capabilities?: RelayerCapabilities | null,
  context?: string
): Promise<RelayResult> {
  const { to, data, value = '0x0', chainId } = params
  const transaction: Relayer7710Transaction = {
    chainId: String(chainId),
    transactions: [
      {
        permissionContext: [],
        executions: [
          {
            target: to,
            value,
            data,
          },
        ],
      },
    ],
  }

  try {
    // Discover relayer capabilities and payment token
    const relayerCapabilities = capabilities ?? await getRelayerCapabilities(chainId)
    if (!relayerCapabilities || !relayerCapabilities.tokens?.length) {
      console.error(
        `[1Shot] No supported payment tokens available for chain ${chainId}. Capabilities: ${JSON.stringify(relayerCapabilities)}`
      )
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_IS_TESTNET === 'true') {
        return getMockRelayResult()
      }
      throw new Error('1Shot relayer has no supported payment token for this chain.')
    }

    const paymentToken = relayerCapabilities.tokens?.[0]?.address
    if (!paymentToken) {
      console.error(`[1Shot] Relayer capabilities missing token address: ${JSON.stringify(relayerCapabilities)}`)
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_IS_TESTNET === 'true') {
        return getMockRelayResult()
      }
      throw new Error('1Shot relayer capabilities returned no payment token address.')
    }
    console.warn(`[1Shot] Using payment token from capabilities: ${paymentToken}`)
    if (relayerCapabilities.targetAddress) {
      console.warn(`[1Shot] Relayer target address available: ${relayerCapabilities.targetAddress}`)
    }

    const feeData = await getRelayerFeeData(chainId, paymentToken)
    const tokenDecimals = relayerCapabilities.tokens?.[0]?.decimals ? Number(relayerCapabilities.tokens[0].decimals) : 6

    const minFeeAmount = feeData?.minFee
      ? parseUnits(feeData.minFee, tokenDecimals)
      : BigInt(0)

    let feeAmount = minFeeAmount
    const estimateResult = await estimateRelayerTransaction(chainId, transaction, paymentToken)
    const quoteResult = await getRelayerQuote(chainId, transaction, paymentToken)
    if (estimateResult?.success !== false) {
      const estimatedPayment = estimateResult?.requiredPaymentAmount
      if (estimatedPayment) {
        feeAmount = parseAmountToBigInt(estimatedPayment)
      } else if (quoteResult?.fee?.amount) {
        feeAmount = parseAmountToBigInt(quoteResult.fee.amount)
      }
    } else if (quoteResult?.fee?.amount) {
      feeAmount = parseAmountToBigInt(quoteResult.fee.amount)
    }

    const contextToUse =
      estimateResult?.context ??
      (estimateResult?.contextByChainId ? estimateResult.contextByChainId[String(chainId)] : undefined) ??
      feeData?.context ??
      context
    const taskId = await sendRelayerTransaction(
      chainId,
      transaction,
      paymentToken,
      contextToUse ?? undefined
    )
    if (!taskId) {
      throw new Error('1Shot relayer returned empty task id for transaction')
    }

    const estimatedGasUSDC = formatUnits(feeAmount, tokenDecimals)

    return {
      relayId: taskId,
      status: 'pending',
      estimatedGasUSDC,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[1Shot] Full error: ${errorMsg}`)

    if (
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
      process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
    ) {
      console.warn(
        `[1Shot] Relayer failed: ${errorMsg}. Falling back to simulation mode.`
      )
      return getMockRelayResult()
    }
    throw error
  }
}

export async function relayUniswapSwap(params: RelayParams): Promise<RelayResult> {
  try {
    return await relayTransaction(params)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[1Shot] relayUniswapSwap failed: ${errorMsg}`)

    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_IS_TESTNET === 'true') {
      console.warn('[1Shot] Falling back to simulation mode due to relayUniswapSwap failure.')
      return getMockRelayResult()
    }
    throw error
  }
}

// ─── Get Relay Status ─────────────────────────────────────────────────────────

export async function getRelayStatus(relayId: string): Promise<RelayResult> {
  try {
    const relayerUrl = IS_TESTNET
      ? 'https://relayer.1shotapi.dev/relayers'
      : 'https://relayer.1shotapi.com/relayers'

    const jsonRpcBody = {
      jsonrpc: '2.0',
      id: Math.random().toString(36).substring(2, 11),
      method: 'relayer_getStatus',
      // relayer_getStatus expects an object: { id: TaskId, logs: boolean }
      params: [
        {
          id: relayId,
          logs: false,
        },
      ],
    }

    const res = await fetch(relayerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonRpcBody),
    })

    if (!res.ok) {
      if (
        process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
        process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
      ) {
        console.warn(
          `[1Shot] Status check returned error ${res.status}. Returning simulated confirmed status.`
        )
        return getMockRelayResult(relayId)
      }
      throw new Error(`1Shot status check error ${res.status}`)
    }

    const result = (await res.json()) as { result?: OneShotRelayResponse; error?: unknown }

    if (result.error) {
      if (
        process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
        process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
      ) {
        console.warn(
          `[1Shot] Status check failed: ${JSON.stringify(result.error)}. Returning simulated confirmed status.`
        )
        return getMockRelayResult(relayId)
      }
      throw new Error(`1Shot status check failed: ${JSON.stringify(result.error)}`)
    }

    if (!result.result) {
      throw new Error('1Shot status check returned empty result')
    }

    const relayResult = result.result

    return {
      relayId: relayResult.relayId,
      status:
        relayResult.status === 'confirmed'
          ? 'confirmed'
          : relayResult.status === 'failed'
            ? 'failed'
            : 'pending',
      txHash: relayResult.txHash,
      estimatedGasUSDC: relayResult.estimatedGasUSDC,
    }
  } catch (error) {
    if (
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
      process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
    ) {
      console.warn(
        `[1Shot] Status check failed: ${error instanceof Error ? error.message : String(error)}. Returning simulated confirmed status.`
      )
      return getMockRelayResult(relayId)
    }
    throw error
  }
}

// ─── Upgrade to Smart Account (EIP-7702) ─────────────────────────────────────

/**
 * Upgrade a regular EOA to a Smart Account via 1Shot's EIP-7702 upgrade.
 * Returns the Smart Account address (same as original address).
 * 
 * NOTE: The EIP-7702 upgrade endpoint is not part of the public relayer.
 * This is a placeholder that gracefully falls back to demo mode.
 */
export async function upgradeAccountEIP7702(walletAddress: string): Promise<string> {
  try {
    console.warn(
      '[1Shot] EIP-7702 upgrade requires 1Shot Dev Platform API key (not public relayer)'
    )

    if (
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
      process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
    ) {
      console.warn(
        '[1Shot] Demo mode active — skipping EIP-7702 upgrade and returning original address'
      )
      return walletAddress
    }

    throw new Error(
      'EIP-7702 upgrade requires ONESHOT_API_KEY (Dev Platform access). In testnet/demo mode, upgrade is skipped.'
    )
  } catch (error) {
    if (
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
      process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
    ) {
      console.warn(
        `[1Shot] EIP-7702 upgrade failed: ${error instanceof Error ? error.message : String(error)}. Falling back to simulation mode.`
      )
      return walletAddress
    }
    throw error
  }
}

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
