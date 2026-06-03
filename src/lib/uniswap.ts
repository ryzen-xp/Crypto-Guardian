import { encodeFunctionData, parseUnits } from 'viem'
import { UNISWAP_V3_ROUTER, STABLECOINS, DEFAULT_STABLECOIN, getStablecoin } from './coins'

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

/** All known stablecoin addresses (lowercase) for fee tier detection */
const STABLECOIN_ADDRESSES = new Set(Object.values(STABLECOINS).map((s) => s.address.toLowerCase()))

/** Stable pairs get the lower 0.05% fee tier */
function getFeeTier(tokenIn: string, tokenOut: string): number {
  if (STABLECOIN_ADDRESSES.has(tokenIn.toLowerCase())) return FEE_LOW
  if (STABLECOIN_ADDRESSES.has(tokenOut.toLowerCase())) return FEE_LOW
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

export type SwapCalldata = {
  /** Router contract address */
  to: string
  /** Encoded calldata */
  data: string
  /** Minimum tokens out (with slippage applied) */
  minAmountOut: bigint
}

// ─── Core Builder ─────────────────────────────────────────────────────────────

/**
 * Build Uniswap V3 exactInputSingle calldata.
 * Works for any token pair — stablecoin is passed in, not hardcoded.
 */
export function buildSwapCalldata(params: SwapParams): SwapCalldata {
  const { tokenIn, tokenOut, amountIn, slippageBps = 100, recipient } = params

  const fee = getFeeTier(tokenIn, tokenOut)
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

  return { to: UNISWAP_V3_ROUTER, data, minAmountOut }
}

// ─── Sell (coin → stablecoin) ─────────────────────────────────────────────────

/**
 * Build calldata to swap a volatile coin → user's chosen stablecoin.
 * Called on DANGER verdict.
 */
export function buildSellToStable(params: {
  tokenAddress: string
  tokenDecimals: number
  amountInUSD: number
  tokenPriceUSD: number
  recipient: string
  /** Symbol of the user's chosen stablecoin — defaults to USDC */
  stablecoinSymbol?: string
  slippageBps?: number
}): SwapCalldata {
  const {
    tokenAddress,
    tokenDecimals,
    amountInUSD,
    tokenPriceUSD,
    recipient,
    stablecoinSymbol = DEFAULT_STABLECOIN,
    slippageBps,
  } = params

  const stable = getStablecoin(stablecoinSymbol)
  const tokenAmount = amountInUSD / tokenPriceUSD
  const amountIn = parseUnits(tokenAmount.toFixed(tokenDecimals), tokenDecimals)

  return buildSwapCalldata({
    tokenIn: tokenAddress,
    tokenOut: stable.address,
    amountIn,
    recipient,
    slippageBps,
  })
}

// ─── Buy (stablecoin → coin) ──────────────────────────────────────────────────

/**
 * Build calldata to swap user's chosen stablecoin → a volatile coin.
 * Called on OPPORTUNITY verdict (aggressive mode only).
 */
export function buildBuyWithStable(params: {
  tokenAddress: string
  amountInUSD: number
  recipient: string
  /** Symbol of the user's chosen stablecoin — defaults to USDC */
  stablecoinSymbol?: string
  slippageBps?: number
}): SwapCalldata {
  const {
    tokenAddress,
    amountInUSD,
    recipient,
    stablecoinSymbol = DEFAULT_STABLECOIN,
    slippageBps,
  } = params

  const stable = getStablecoin(stablecoinSymbol)
  const amountIn = parseUnits(amountInUSD.toFixed(stable.decimals), stable.decimals)

  return buildSwapCalldata({
    tokenIn: stable.address,
    tokenOut: tokenAddress,
    amountIn,
    recipient,
    slippageBps,
  })
}

// ─── Keep old names as aliases for backwards compat ───────────────────────────
// These default to USDC so existing call sites still work without changes.

/** @deprecated Use buildSellToStable with stablecoinSymbol param */
export const buildSellToUSDC = (params: Parameters<typeof buildSellToStable>[0]): SwapCalldata =>
  buildSellToStable(params)

/** @deprecated Use buildBuyWithStable with stablecoinSymbol param */
export const buildBuyWithUSDC = (params: Parameters<typeof buildBuyWithStable>[0]): SwapCalldata =>
  buildBuyWithStable(params)
