import { encodeFunctionData, formatUnits, parseUnits } from 'viem'
import {
  DEFAULT_STABLECOIN,
  STABLECOINS,
  UNISWAP_V2_ROUTER,
  UNISWAP_V3_ROUTER,
  getStablecoin,
} from './coins'
import { IS_TESTNET } from './chain-config'

// ─── Uniswap V3 SwapRouter02 ABI ─────────────────────────────────────────────

const SWAP_ROUTER_V3_ABI = [
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

// ─── Uniswap V2 Router02 ABI ─────────────────────────────────────────────────

const SWAP_ROUTER_V2_ABI = [
  {
    name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
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

function getDeadline(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 20 * 60)
}

function toHexValue(amount: bigint | undefined): string {
  return `0x${(amount ?? BigInt(0)).toString(16)}`
}

function getStablecoinAmountOutMin(amountUsd: number, slippageBps: number, stableDecimals: number): bigint {
  const slippageFactor = 10000 - slippageBps
  const minOut = amountUsd * (slippageFactor / 10000)
  return parseUnits(Math.max(minOut, 0).toFixed(stableDecimals), stableDecimals)
}

function getTokenAmountFromBalance(balanceRaw: bigint, decimals: number): number {
  return Number.parseFloat(formatUnits(balanceRaw, decimals))
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
  /** Contract address to call */
  to: string
  /** Encoded calldata */
  data: string
  /** ETH value to send with the transaction */
  value: string
  /** Minimum tokens out (with slippage applied) */
  minAmountOut: bigint
}

type SellToStableParams = {
  tokenAddress: string
  tokenDecimals: number
  amountInUSD: number
  tokenPriceUSD: number
  recipient: string
  /** Symbol of the user's chosen stablecoin — defaults to USDC */
  stablecoinSymbol?: string
  slippageBps?: number
  /** When present, use the live wallet balance instead of a hardcoded USD amount */
  tokenBalanceRaw?: bigint
  /** Set true when selling native ETH via the V2 router */
  isNative?: boolean
}

type BuyWithStableParams = {
  tokenAddress: string
  amountInUSD: number
  recipient: string
  /** Symbol of the user's chosen stablecoin — defaults to USDC */
  stablecoinSymbol?: string
  slippageBps?: number
  /** When present, use the live stablecoin balance instead of a hardcoded USD amount */
  stableBalanceRaw?: bigint
}

// ─── Core Builders ────────────────────────────────────────────────────────────

function buildV3SwapCalldata(params: SwapParams): SwapCalldata {
  const { tokenIn, tokenOut, amountIn, slippageBps = 100, recipient } = params

  const fee = getFeeTier(tokenIn, tokenOut)
  const slippageFactor = BigInt(10000 - slippageBps)
  const minAmountOut = (amountIn * slippageFactor) / BigInt(10000)

  const data = encodeFunctionData({
    abi: SWAP_ROUTER_V3_ABI,
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

  return { to: UNISWAP_V3_ROUTER, data, value: '0x0', minAmountOut }
}

function buildV2SellToStable(params: SellToStableParams): SwapCalldata {
  const {
    tokenAddress,
    tokenDecimals,
    amountInUSD,
    tokenPriceUSD,
    recipient,
    stablecoinSymbol = DEFAULT_STABLECOIN,
    slippageBps = 100,
    tokenBalanceRaw,
    isNative = false,
  } = params

  const stable = getStablecoin(stablecoinSymbol)
  const amountInRaw =
    tokenBalanceRaw ??
    parseUnits((amountInUSD / tokenPriceUSD).toFixed(tokenDecimals), tokenDecimals)
  const amountInUsdValue = tokenBalanceRaw
    ? getTokenAmountFromBalance(tokenBalanceRaw, tokenDecimals) * tokenPriceUSD
    : amountInUSD
  const minAmountOut = getStablecoinAmountOutMin(amountInUsdValue, slippageBps, stable.decimals)
  const deadline = getDeadline()
  const path = [tokenAddress as `0x${string}`, stable.address as `0x${string}`]

  const data = isNative
    ? encodeFunctionData({
        abi: SWAP_ROUTER_V2_ABI,
        functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
        args: [minAmountOut, path, recipient as `0x${string}`, deadline],
      })
    : encodeFunctionData({
        abi: SWAP_ROUTER_V2_ABI,
        functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
        args: [amountInRaw, minAmountOut, path, recipient as `0x${string}`, deadline],
      })

  return {
    to: UNISWAP_V2_ROUTER,
    data,
    value: isNative ? toHexValue(amountInRaw) : '0x0',
    minAmountOut,
  }
}

function buildV2BuyWithStable(params: BuyWithStableParams): SwapCalldata {
  const {
    tokenAddress,
    amountInUSD,
    recipient,
    stablecoinSymbol = DEFAULT_STABLECOIN,
    slippageBps = 100,
    stableBalanceRaw,
  } = params

  const stable = getStablecoin(stablecoinSymbol)
  const amountInRaw =
    stableBalanceRaw ?? parseUnits(amountInUSD.toFixed(stable.decimals), stable.decimals)
  const minAmountOut = getStablecoinAmountOutMin(amountInUSD, slippageBps, stable.decimals)
  const deadline = getDeadline()
  const path = [stable.address as `0x${string}`, tokenAddress as `0x${string}`]

  const data = encodeFunctionData({
    abi: SWAP_ROUTER_V2_ABI,
    functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    args: [amountInRaw, minAmountOut, path, recipient as `0x${string}`, deadline],
  })

  return {
    to: UNISWAP_V2_ROUTER,
    data,
    value: '0x0',
    minAmountOut,
  }
}

// ─── Sell (coin → stablecoin) ─────────────────────────────────────────────────

/**
 * Build calldata to swap a volatile coin → user's chosen stablecoin.
 * Called on DANGER verdict.
 */
export function buildSellToStable(params: SellToStableParams): SwapCalldata {
  if (IS_TESTNET) {
    return buildV2SellToStable(params)
  }

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
  const tokenAmount = params.tokenBalanceRaw
    ? getTokenAmountFromBalance(params.tokenBalanceRaw, tokenDecimals)
    : amountInUSD / tokenPriceUSD
  const amountIn = parseUnits(tokenAmount.toFixed(tokenDecimals), tokenDecimals)

  return buildV3SwapCalldata({
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
export function buildBuyWithStable(params: BuyWithStableParams): SwapCalldata {
  const {
    tokenAddress,
    amountInUSD,
    recipient,
    stablecoinSymbol = DEFAULT_STABLECOIN,
    slippageBps,
    stableBalanceRaw,
  } = params

  if (IS_TESTNET) {
    return buildV2BuyWithStable(params)
  }

  const stable = getStablecoin(stablecoinSymbol)
  const amountIn = stableBalanceRaw ?? parseUnits(amountInUSD.toFixed(stable.decimals), stable.decimals)

  return buildV3SwapCalldata({
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
export const buildBuyToUSDC = (params: Parameters<typeof buildBuyWithStable>[0]): SwapCalldata =>
  buildBuyWithStable(params)
