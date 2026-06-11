import type { CoinConfig, StablecoinConfig } from './types'

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'

// ─── Uniswap V3 SwapRouter02 ──────────────────────────────────────────────────
// Ethereum Sepolia: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
// Ethereum Mainnet: 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45

export const UNISWAP_V3_ROUTER = (
  IS_TESTNET
    ? (process.env.NEXT_PUBLIC_UNISWAP_ROUTER ?? '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E')
    : '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
) as `0x${string}`

// ─── Uniswap V2 Router02 ──────────────────────────────────────────────────────
// Sepolia: 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3
// Mainnet: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D

export const UNISWAP_V2_ROUTER = (
  IS_TESTNET
    ? (process.env.NEXT_PUBLIC_UNISWAP_V2_ROUTER ??
        '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3')
    : '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
) as `0x${string}`

// ─── Stablecoins — USDC only ─────────────────────────────────────────────────

export const STABLECOINS: Record<string, StablecoinConfig> = IS_TESTNET
  ? {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin (Sepolia)',
      // Circle official USDC on Ethereum Sepolia
      address: (process.env.NEXT_PUBLIC_USDC_ADDRESS as string) ?? '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6,
      logoUrl: '/coin-icons/usdc.svg',
      description: 'Circle USDC on Ethereum Sepolia testnet.',
    },
  }
  : {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      logoUrl: '/coin-icons/usdc.svg',
      description: 'Most liquid stablecoin on Ethereum.',
    },
  }

export const DEFAULT_STABLECOIN = 'USDC'

export function getStablecoin(symbol: string): StablecoinConfig {
  const stable = STABLECOINS[symbol] ?? STABLECOINS['USDC']
  if (!stable) throw new Error(`Unknown stablecoin: ${symbol}`)
  return stable
}

// ─── Monitored Coins — WETH only (volatile asset) ──────────────────────────
// Circle USDC is the only stablecoin. Swaps: WETH ↔ USDC
// Only WETH is monitored (wrapped ether). Native ETH is ignored.
//
// Sepolia addresses (2024):
//   WETH → 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9 (Uniswap WETH9)

export const MONITORED_COINS: Record<string, CoinConfig> = IS_TESTNET
  ? {
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      coingeckoId: 'weth',
      baseAddress: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
      decimals: 18,
      logoUrl: '/coin-icons/eth.svg',
    },
  }
  : {
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      coingeckoId: 'weth',
      baseAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      logoUrl: '/coin-icons/eth.svg',
    },
  }

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const COINGECKO_IDS = Object.values(MONITORED_COINS)
  .map((c) => c.coingeckoId)
  .join(',')

export const COINGECKO_ID_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.values(MONITORED_COINS).map((c) => [c.coingeckoId, c.symbol])
)

export function getCoin(symbol: string): CoinConfig {
  const coin = MONITORED_COINS[symbol]
  if (!coin) throw new Error(`Unknown coin symbol: ${symbol}`)
  return coin
}

export function getCoinByAddress(address: string): CoinConfig | undefined {
  return Object.values(MONITORED_COINS).find(
    (c) => c.baseAddress.toLowerCase() === address.toLowerCase()
  )
}
