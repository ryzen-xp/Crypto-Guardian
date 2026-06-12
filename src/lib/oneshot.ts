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

  try {
    console.warn(`[1Shot] Fetching relayer capabilities from ${relayerUrl}`)
    const { res, json } = await fetchRelayerJson(body, relayerUrl)
    if (!res.ok) {
      console.error(`[1Shot] Capabilities request failed with status ${res.status}`)
      return null
    }
    if (!json) {
      console.error(`[1Shot] Capabilities request returned invalid JSON`)
      return null
    }
    const caps = json.result?.[String(chainId)] as RelayerCapabilities | undefined
    if (caps) {
      console.warn(`[1Shot] Capabilities retrieved: tokens=${caps.tokens?.length ?? 0}`)
    }
    return caps ?? null
  } catch (err) {
    console.error(`[1Shot] Failed to get capabilities: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

async function getRelayerFeeData(chainId: number, tokenAddress: string): Promise<RelayerFeeData | null> {
  const relayerUrl = getRelayerUrl(chainId)
  const body = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).substring(2, 11),
    method: 'relayer_getFeeData',
    params: [String(chainId), tokenAddress],
  }

  try {
    console.warn(`[1Shot] Fetching fee data for token ${tokenAddress}`)
    const { res, json } = await fetchRelayerJson(body, relayerUrl)
    if (!res.ok) {
      console.error(`[1Shot] Fee data request failed with status ${res.status}`)
      return null
    }
    if (!json?.result) {
      console.error(`[1Shot] Fee data request returned no result`)
      return null
    }
    console.warn(`[1Shot] Fee data retrieved: minFee=${(json.result as RelayerFeeData).minFee}`)
    return json.result as RelayerFeeData
  } catch (err) {
    console.error(`[1Shot] Failed to get fee data: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
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
        chainId: String(chainId),
        transactions: transaction.transactions,
        payment: {
          type: 'erc20',
          token: paymentToken,
        },
      },
    ],
  }

  try {
    console.warn(`[1Shot] Requesting quote for transaction`)
    const { res, json } = await fetchRelayerJson(body, relayerUrl)
    if (!res.ok) {
      console.error(`[1Shot] Quote request failed with status ${res.status}`)
      return null
    }
    if (!json) {
      console.error(`[1Shot] Quote request returned invalid JSON`)
      return null
    }
    if (json.error) {
      console.error(`[1Shot] Quote error: ${JSON.stringify(json.error)}`)
      return null
    }
    console.warn(`[1Shot] Quote retrieved: fee=${(json.result as RelayerQuoteResponse).fee?.amount ?? 'unknown'}`)
    return json.result as RelayerQuoteResponse
  } catch (err) {
    console.error(`[1Shot] Failed to get quote: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
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
        chainId: String(chainId),
        transactions: transaction.transactions,
        payment: { type: 'erc20', token: paymentToken },
      },
    ],
  }

  try {
    console.warn(`[1Shot] Estimating transaction`)
    const { res, json } = await fetchRelayerJson(body, relayerUrl)
    if (!res.ok) {
      console.error(`[1Shot] Estimate request failed with status ${res.status}`)
      return null
    }
    if (!json) {
      console.error(`[1Shot] Estimate request returned invalid JSON`)
      return null
    }
    if (json.error) {
      console.error(`[1Shot] Estimate error: ${JSON.stringify(json.error)}`)
      return null
    }
    console.warn(`[1Shot] Estimate retrieved: success=${(json.result as Relayer7710EstimateResponse).success}`)
    return json.result as Relayer7710EstimateResponse
  } catch (err) {
    console.error(`[1Shot] Failed to estimate: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
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
    params: [
      {
        chainId: String(chainId),
        transactions: transaction.transactions,
        payment: { type: 'erc20', token: paymentToken },
        ...(context ? { context } : {}),
      },
    ],
  }

  console.warn(`[1Shot] Sending JSON-RPC request to ${relayerUrl}`)
  console.warn(`[1Shot] Method: relayer_send7710Transaction`)
  console.warn(`[1Shot] Payment token: ${paymentToken}`)
  console.warn(`[1Shot] Chain ID: ${chainId}`)

  try {
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
  } catch (err) {
    console.error(`[1Shot] Send transaction error: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  }
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
    console.warn(`[1Shot] Starting relay transaction for chain ${chainId}`)
    const relayerCapabilities = capabilities ?? await getRelayerCapabilities(chainId)
    
    let paymentToken: string | undefined
    let tokenDecimals = 6 // Default USDC decimals

    if (relayerCapabilities?.tokens && relayerCapabilities.tokens.length > 0) {
      paymentToken = relayerCapabilities.tokens[0]?.address
      tokenDecimals = relayerCapabilities.tokens[0]?.decimals ? Number(relayerCapabilities.tokens[0].decimals) : 6
      console.warn(`[1Shot] Using payment token from capabilities: ${paymentToken} (decimals: ${tokenDecimals})`)
      if (relayerCapabilities.targetAddress) {
        console.warn(`[1Shot] Relayer target address: ${relayerCapabilities.targetAddress}`)
      }
    } else {
      // Fallback: use USDC address from chain config
      if (chainId === 11155111) {
        paymentToken = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Sepolia USDC
        console.warn(`[1Shot] No capabilities found, using fallback USDC: ${paymentToken}`)
      } else {
        throw new Error('1Shot relayer capabilities not available and no fallback token configured')
      }
    }

    if (!paymentToken) {
      throw new Error('No payment token could be determined for relay')
    }

    // Get fee data for the payment token
    const feeData = await getRelayerFeeData(chainId, paymentToken)
    const minFeeAmount = feeData?.minFee
      ? parseUnits(feeData.minFee, tokenDecimals)
      : BigInt(0)

    let feeAmount = minFeeAmount
    console.warn(`[1Shot] Min fee from relayer: ${formatUnits(minFeeAmount, tokenDecimals)} ${feeData?.token?.symbol ?? '?'}`)

    // Get estimate and quote
    const estimateResult = await estimateRelayerTransaction(chainId, transaction, paymentToken)
    const quoteResult = await getRelayerQuote(chainId, transaction, paymentToken)
    
    if (estimateResult?.success !== false && estimateResult?.requiredPaymentAmount) {
      feeAmount = parseAmountToBigInt(estimateResult.requiredPaymentAmount)
      console.warn(`[1Shot] Estimated payment: ${formatUnits(feeAmount, tokenDecimals)}`)
    } else if (quoteResult?.fee?.amount) {
      feeAmount = parseAmountToBigInt(quoteResult.fee.amount)
      console.warn(`[1Shot] Quote fee: ${formatUnits(feeAmount, tokenDecimals)}`)
    }

    // Get context for permission
    const contextToUse =
      estimateResult?.context ??
      (estimateResult?.contextByChainId ? estimateResult.contextByChainId[String(chainId)] : undefined) ??
      feeData?.context ??
      context

    if (contextToUse) {
      console.warn(`[1Shot] Using permission context`)
    }

    // Send relay transaction
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
    console.warn(`[1Shot] Relay successful, task ID: ${taskId}, estimated fee: ${estimatedGasUSDC} USDC`)

    return {
      relayId: taskId,
      status: 'pending',
      estimatedGasUSDC,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[1Shot] Relay transaction failed: ${errorMsg}`)
    // Force real execution — no fallback to demo mode
    throw error
  }
}

export async function relayUniswapSwap(params: RelayParams): Promise<RelayResult> {
  try {
    return await relayTransaction(params)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[1Shot] relayUniswapSwap failed: ${errorMsg}`)
    // Force real execution — no fallback to simulation
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
      throw new Error(`1Shot status check error ${res.status}`)
    }

    const result = (await res.json()) as { result?: OneShotRelayResponse; error?: unknown }

    if (result.error) {
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
    // Force real execution — no fallback
    throw error
  }
}

// ─── Upgrade to Smart Account (EIP-7702) ─────────────────────────────────────

/**
 * Upgrade a regular EOA to a Smart Account via 1Shot's ERC-7710 upgrade.
 * Uses MetaMask ERC-7710 (not EIP-7702) for gas delegation.
 * Returns the Smart Account address (same as original address).
 * 
 * ERC-7710 (MetaMask) allows gas to be paid from smart account balance
 * when user has USDC balance < $0.005 USD.
 */
export async function upgradeAccountEIP7702(walletAddress: string): Promise<string> {
  try {
    console.warn('[1Shot] Using ERC-7710 (MetaMask) for gas delegation from smart account')

    // In real execution, this would trigger MetaMask's ERC-7710 flow
    // For now, return the wallet address — the 1Shot relayer handles the upgrade
    return walletAddress
  } catch (error) {
    // Force real execution — no fallback
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
