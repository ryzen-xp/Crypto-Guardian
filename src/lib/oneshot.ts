import crypto from 'crypto'
import { formatUnits, parseUnits, encodeFunctionData } from 'viem'
import { IS_TESTNET } from './chain-config'
import type { RelayResult } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

type RelayParams = {
  to: string
  data: string
  value?: string
  userAddress: string
  chainId: number
  signedDelegation?: Delegation7710
}

type OneShotRelayResponse = {
  relayId: string
  status: string
  txHash?: string
  estimatedGasUSDC: string
}

type CapabilityToken = {
  address: string
  decimals: number | string
  symbol?: string
  name?: string
}

type ChainCapability = {
  feeCollector: string
  targetAddress: string
  tokens: CapabilityToken[]
}

type GetCapabilitiesResult = Record<string, ChainCapability>

type GetFeeDataParams = {
  chainId: string
  token: string
}

type GetFeeDataResult = {
  chainId: string
  token: { address: string; decimals: number; symbol?: string; name?: string }
  rate: number
  minFee: string
  expiry: number
  gasPrice: string
  feeCollector: string
  targetAddress?: string
  context?: string
}

type DelegationCaveat = {
  enforcer: string
  terms: string
  args: string
}

export type Delegation7710 = {
  delegate: string // targetAddress from capabilities
  delegator: string // user's address
  authority: string // bytes32, "0x0" for root
  caveats: DelegationCaveat[]
  salt: string // 32-byte hex, fresh per delegation
  signature: string // hex from signing
}

type Execution7710 = {
  target: string
  value: string
  data: string
}

type DelegatedTransaction7710 = {
  permissionContext: Delegation7710[]
  executions: Execution7710[]
}

type Send7710TransactionParams = {
  chainId: string
  transactions: DelegatedTransaction7710[]
  authorizationList?: unknown[]
  context?: string
  memo?: string
}

type Estimate7710TransactionResult = {
  success: boolean
  paymentTokenAddress?: string
  gasUsed: Record<string, string>
  requiredPaymentAmount?: string
  context?: string
  contextByChainId?: Record<string, string>
  error?: string
}

// ─── JSON-RPC Helpers ─────────────────────────────────────────────────────────

function getRelayerUrl(chainId: number): string {
  return IS_TESTNET || chainId === 11155111
    ? 'https://relayer.1shotapi.dev/relayers'
    : 'https://relayer.1shotapi.com/relayers'
}

export { getRelayerUrl }

let idCounter = 0

async function relayerRpc<T>(url: string, method: string, params: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++idCounter, method, params }),
  })

  if (!res.ok) {
    throw new Error(`relayer HTTP ${res.status} for ${method}`)
  }

  const body = (await res.json()) as { result?: T; error?: { code: number; message: string; data?: unknown } }
  if (body.error) {
    console.error(`[1Shot] RPC error ${method}: ${body.error.code} - ${body.error.message}`)
    throw new Error(`relayer rpc error ${body.error.code}: ${body.error.message}`)
  }
  return body.result as T
}

// ─── Relay Steps (following DelegapayAgent pattern) ────────────────────────────

/**
 * Step 1: Get capabilities (supported chains, tokens, addresses)
 */
async function getCapabilities(chainIds: number[], url?: string): Promise<GetCapabilitiesResult> {
  const endpoint = url ?? getRelayerUrl(chainIds[0]!)
  const params = chainIds.map(String)
  console.warn(`[1Shot] Getting capabilities for chains: ${params.join(', ')}`)
  return relayerRpc<GetCapabilitiesResult>(endpoint, 'relayer_getCapabilities', params)
}

/**
 * Step 2b: Get fee data for a payment token
 */
async function getFeeData(params: GetFeeDataParams, url?: string): Promise<GetFeeDataResult> {
  const endpoint = url ?? getRelayerUrl(Number(params.chainId))
  console.warn(`[1Shot] Getting fee data for token ${params.token}`)
  return relayerRpc<GetFeeDataResult>(endpoint, 'relayer_getFeeData', params)
}

/**
 * Step 3: Estimate transaction (dry-run)
 */
async function estimate7710Transaction(
  params: Send7710TransactionParams,
  url?: string
): Promise<Estimate7710TransactionResult> {
  const endpoint = url ?? getRelayerUrl(Number(params.chainId))
  console.warn(`[1Shot] Estimating transaction for chain ${params.chainId}`)
  return relayerRpc<Estimate7710TransactionResult>(endpoint, 'relayer_estimate7710Transaction', params)
}

/**
 * Step 4: Send transaction
 */
async function send7710Transaction(
  params: Send7710TransactionParams,
  url?: string
): Promise<string> {
  const endpoint = url ?? getRelayerUrl(Number(params.chainId))
  console.warn(`[1Shot] Sending transaction for chain ${params.chainId}`)
  console.warn(`[1Shot] Full request payload:`, JSON.stringify(params, null, 2))
  const taskId = await relayerRpc<string>(endpoint, 'relayer_send7710Transaction', params)
  return taskId
}

// ─── Relay Transaction (Main Entry Point) ──────────────────────────────────────

/**
 * Submit a transaction to the 1-Shot relayer with a pre-signed delegation.
 * 
 * If no signed delegation is provided, creates an unsigned delegation structure
 * that may be validated by the relayer (testnet may be more lenient).
 */
export async function relayTransaction(params: RelayParams & { signedDelegation?: Delegation7710 }): Promise<RelayResult> {
  const { to, data, value = '0x0', userAddress, chainId, signedDelegation } = params
  const chainIdStr = String(chainId)

  try {
    console.warn(`[1Shot] Starting relay transaction for chain ${chainId}`)

    // Step 1: Get capabilities
    const capabilities = await getCapabilities([chainId])
    const chainCap = capabilities[chainIdStr]

    if (!chainCap) {
      throw new Error(`1Shot capabilities not available for chain ${chainId}`)
    }

    const paymentToken = chainCap.tokens[0]?.address
    const targetAddress = chainCap.targetAddress
    if (!paymentToken || !targetAddress) {
      throw new Error('No payment token or target address from relayer capabilities')
    }

    const tokenDecimals = chainCap.tokens[0]?.decimals
      ? Number(chainCap.tokens[0].decimals)
      : 6

    console.warn(
      `[1Shot] Using payment token: ${paymentToken} (decimals: ${tokenDecimals}), targetAddress: ${targetAddress}`
    )

    // Step 2: Get fee data
    let feeData: GetFeeDataResult | null = null
    try {
      feeData = await getFeeData({ chainId: chainIdStr, token: paymentToken })
      console.warn(`[1Shot] Fee data: minFee=${feeData.minFee}`)
    } catch (err) {
      console.warn(`[1Shot] Failed to get fee data (non-critical):`, err instanceof Error ? err.message : String(err))
    }

    // Step 3: Prepare delegation
    let delegation: Delegation7710

    if (signedDelegation) {
      // Use the pre-signed delegation from frontend
      console.warn(`[1Shot] Using pre-signed delegation from frontend`)
      delegation = signedDelegation
    } else {
      // Create unsigned delegation for testnet
      // Generate a valid-looking mock signature (65 bytes = 0x + 128 hex chars)
      // Format: 0x + 32 bytes (r) + 32 bytes (s) + 1 byte (v)
      const mockR = 'a'.repeat(64) // 32 bytes in hex
      const mockS = 'b'.repeat(64) // 32 bytes in hex
      const mockV = '1b' // v value (27 or 28)
      const mockSignature = '0x' + mockR + mockS + mockV

      console.warn(`[1Shot] Creating mock-signed delegation for testnet`)
      delegation = {
        delegate: targetAddress,
        delegator: userAddress,
        authority: '0x0000000000000000000000000000000000000000000000000000000000000000',
        caveats: [],
        salt: '0x' + crypto.randomBytes(32).toString('hex'),
        signature: mockSignature, // Valid 65-byte signature format
      }
    }

    // Verify delegation structure
    if (delegation.delegate.toLowerCase() !== targetAddress.toLowerCase()) {
      throw new Error(
        `Delegation mismatch: delegation is for ${delegation.delegate}, but relayer target is ${targetAddress}`
      )
    }

    if (delegation.delegator.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error(
        `Delegator mismatch: delegation is from ${delegation.delegator}, but user is ${userAddress}`
      )
    }

    // Step 4: Build transaction bundle with fee payment
    // 1-Shot relayer expects two executions:
    // 1. Fee transfer to feeCollector
    // 2. The actual swap execution
    
    const minFeeAtoms = parseUnits(feeData?.minFee ?? '0.01', tokenDecimals)
    console.warn(`[1Shot] Min fee: ${feeData?.minFee ?? '0.01'} USDC = ${minFeeAtoms} atoms`)

    // Build fee transfer execution (USDC transfer to feeCollector)
    const feeTransferData = encodeFunctionData({
      abi: [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ type: 'bool' }],
        },
      ],
      functionName: 'transfer',
      args: [chainCap.feeCollector as `0x${string}`, minFeeAtoms],
    })

    const transactionBundle: Send7710TransactionParams = {
      chainId: chainIdStr,
      transactions: [
        {
          permissionContext: [delegation],
          executions: [
            // First execution: Pay fee to relayer's feeCollector
            {
              target: paymentToken, // USDC token contract
              value: '0x0',
              data: feeTransferData,
            },
            // Second execution: The actual swap
            {
              target: to,
              value,
              data,
            },
          ],
        },
      ],
      memo: `Uniswap swap via 1-Shot`,
    }

    console.warn(`[1Shot] Transaction bundle prepared with fee payment`)

    // Step 5: Estimate transaction
    let context: string | undefined
    try {
      const estimateResult = await estimate7710Transaction(transactionBundle)
      console.warn(`[1Shot] Estimate result: success=${estimateResult.success}`)

      if (estimateResult.success) {
        context = estimateResult.context ?? estimateResult.contextByChainId?.[chainIdStr]
        if (context) {
          console.warn(`[1Shot] Got context from estimate`)
        }
      } else if (estimateResult.error) {
        console.warn(`[1Shot] Estimate warning: ${estimateResult.error}`)
      }
    } catch (err) {
      console.warn(`[1Shot] Estimate failed (continuing):`, err instanceof Error ? err.message : String(err))
    }

    // Step 6: Send transaction
    if (context) {
      transactionBundle.context = context
      console.warn(`[1Shot] Adding context to send request`)
    }

    console.warn(`[1Shot] Sending transaction...`)
    const taskId = await send7710Transaction(transactionBundle)

    if (!taskId) {
      throw new Error('1-Shot relayer did not return a task ID')
    }

    // Calculate estimated fee
    const minFeeAmount = feeData?.minFee
      ? parseUnits(feeData.minFee, tokenDecimals)
      : BigInt(0)
    const estimatedGasUSDC = formatUnits(minFeeAmount, tokenDecimals)

    console.warn(`[1Shot] Relay successful! Task ID: ${taskId}, Estimated fee: ${estimatedGasUSDC} USDC`)

    return {
      relayId: taskId,
      status: 'pending',
      estimatedGasUSDC,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[1Shot] Relay transaction failed: ${errorMsg}`)
    throw error
  }
}

export async function relayUniswapSwap(params: RelayParams): Promise<RelayResult> {
  try {
    return await relayTransaction(params)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[1Shot] relayUniswapSwap failed: ${errorMsg}`)
    throw error
  }
}

// ─── Get Relay Status ──────────────────────────────────────────────────────────

export async function getRelayStatus(relayId: string): Promise<RelayResult> {
  try {
    const relayerUrl = IS_TESTNET
      ? 'https://relayer.1shotapi.dev/relayers'
      : 'https://relayer.1shotapi.com/relayers'

    const jsonRpcBody = {
      jsonrpc: '2.0',
      id: ++idCounter,
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
      headers: { 'Content-Type': 'application/json' },
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
    throw error
  }
}

// ─── Webhook Signature Verification ────────────────────────────────────────────

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.ONESHOT_WEBHOOK_SECRET
  if (!secret) {
    console.warn('ONESHOT_WEBHOOK_SECRET not set — skipping signature verification')
    return true
  }

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
