import { encodeFunctionData, parseUnits } from 'viem'
import { UNISWAP_V3_ROUTER, USDC_ADDRESS } from './coins'

// ─── Uniswap V3 SwapRouter02 ABI (exactInputSingle only) ─────────────────────

const SWAP_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const

// ─── Fee Tiers ────────────────────────────────────────────────────────────────

/** Standard 0.3% fee tier for most volatile pairs */
const FEE_MEDIUM = 3000
/** 0.05% fee tier for stable/high-liquidity pairs */
const FEE_LOW = 500

/** Pick fee tier by token — stable pairs use lower fee */
function getFeeTier(tokenIn: string, tokenOut: string): number {
  const isStable = (addr: string) => addr.toLowerCase() === USDC_ADDRESS.toLowerCase()

  if (isStable(tokenIn) || isStable(tokenOut)) return FEE_LOW
  return FEE_MEDIUM
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SwapParams = {
  tokenIn: string
  tokenOut: string
  /** Amount in token's smallest unit (wei / base units) */
  amountIn: bigint
  /** Slippage in basis points, e.g. 50 = 0.5% */
  slippageBps?: number
  recipient: string
}

type SwapCalldata = {
  /** Router contract address */
  to: string
  /** Encoded calldata */
  data: string
  /** Minimum tokens out (with slippage applied) */
  minAmountOut: bigint
}

// ─── Build Swap Calldata ──────────────────────────────────────────────────────

/**
 * Build Uniswap V3 exactInputSingle calldata.
 *
 * NOTE: minAmountOut is set to 0 by default when amountOutMinimum is unknown
 * (we don't have a price quote here). In production you'd query the pool
 * or use the Uniswap SDK to get an accurate quote first.
 * For MVP: use a generous slippage (e.g. 1%) and rely on the tx reverting
 * if the price impact is too high.
 */
export function buildSwapCalldata(params: SwapParams): SwapCalldata {
  const { tokenIn, tokenOut, amountIn, slippageBps = 100, recipient } = params

  const fee = getFeeTier(tokenIn, tokenOut)

  // minAmountOut = amountIn * (1 - slippage)
  // NOTE: This is a simplified calculation — for accurate quotes, integrate
  // with Uniswap SDK or query the pool directly.
  const slippageFactor = BigInt(10000 - slippageBps)
  const minAmountOut = (amountIn * slippageFactor) / BigInt(10000)

  const data = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: tokenIn as `0x${string}`,
        tokenOut: tokenOut as `0x${string}`,
        fee,
        recipient: recipient as `0x${string}`,
        amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
  })

  return {
    to: UNISWAP_V3_ROUTER,
    data,
    minAmountOut,
  }
}

// ─── Convenience Helpers ──────────────────────────────────────────────────────

/** Build calldata to swap a coin → USDC (protection swap) */
export function buildSellToUSDC(params: {
  tokenAddress: string
  tokenDecimals: number
  amountInUSD: number
  tokenPriceUSD: number
  recipient: string
  slippageBps?: number
}): SwapCalldata {
  const { tokenAddress, tokenDecimals, amountInUSD, tokenPriceUSD, recipient, slippageBps } = params

  const tokenAmount = amountInUSD / tokenPriceUSD
  const amountIn = parseUnits(tokenAmount.toFixed(tokenDecimals), tokenDecimals)

  return buildSwapCalldata({
    tokenIn: tokenAddress,
    tokenOut: USDC_ADDRESS,
    amountIn,
    recipient,
    slippageBps,
  })
}

/** Build calldata to swap USDC → coin (opportunity swap) */
export function buildBuyWithUSDC(params: {
  tokenAddress: string
  amountInUSD: number
  recipient: string
  slippageBps?: number
}): SwapCalldata {
  const { tokenAddress, amountInUSD, recipient, slippageBps } = params

  // USDC has 6 decimals
  const amountIn = parseUnits(amountInUSD.toFixed(6), 6)

  return buildSwapCalldata({
    tokenIn: USDC_ADDRESS,
    tokenOut: tokenAddress,
    amountIn,
    recipient,
    slippageBps,
  })
}
