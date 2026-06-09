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

// ─── Stablecoins — USDC and USDT ─────────────────────────────────────────────

export const STABLECOINS: Record<string, StablecoinConfig> = IS_TESTNET
  ? {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin (Sepolia)',
      // Circle official USDC on Ethereum Sepolia — get from faucet.circle.com
      address:
        (process.env.NEXT_PUBLIC_USDC_ADDRESS as string) ??
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6,
      logoUrl: '/coin-icons/usdc.svg',
      description: 'Circle USDC on Ethereum Sepolia testnet.',
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD (Sepolia)',
      // Aave testnet USDT on Ethereum Sepolia
      address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
      decimals: 6,
      logoUrl: '/coin-icons/usdt.svg',
      description: 'USDT on Ethereum Sepolia testnet.',
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
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      logoUrl: '/coin-icons/usdt.svg',
      description: 'Largest stablecoin by market cap.',
    },
  }

export const DEFAULT_STABLECOIN = 'USDC'

export function getStablecoin(symbol: string): StablecoinConfig {
  const stable = STABLECOINS[symbol] ?? STABLECOINS['USDC']
  if (!stable) throw new Error(`Unknown stablecoin: ${symbol}`)
  return stable
}

// ─── Monitored Coins — ETH, WETH, WBTC, LINK, UNI ──────────────────────────
// All five tokens have verified contracts AND faucet liquidity on Ethereum Sepolia.
// Note: ETH balance is fetched as native (getBalance), WETH as ERC-20 (balanceOf).
//
// Sepolia addresses:
//   ETH  → native ETH (getBalance)
//   WETH → 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14  (Uniswap WETH9 — canonical)
//   WBTC → 0x29f2D40B0605204364af54EC677bD022dA425d03  (Aave testnet WBTC)
//   LINK → 0x779877A7B0D9E8603169DdbD7836e478b4624789  (Chainlink official faucet)
//   UNI  → 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984  (same across networks)

export const MONITORED_COINS: Record<string, CoinConfig> = IS_TESTNET
  ? {
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      coingeckoId: 'ethereum',
      // ETH is native — balance fetched via getBalance(), not balanceOf()
      // baseAddress is unused for ETH but kept for swap routing
      baseAddress: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      decimals: 18,
      logoUrl: '/coin-icons/eth.svg',
      isWrapped: true,
    },
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      coingeckoId: 'weth',
      // Canonical WETH9 on Ethereum Sepolia — wrap ETH at app.uniswap.org
      baseAddress: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      decimals: 18,
      logoUrl: '/coin-icons/eth.svg',
    },
    WBTC: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      coingeckoId: 'wrapped-bitcoin',
      // Aave testnet WBTC on Ethereum Sepolia — mintable via app.aave.com/faucet
      baseAddress: '0x29f2D40B0605204364af54EC677bD022dA425d03',
      decimals: 8,
      logoUrl: '/coin-icons/wbtc.svg',
    },
    LINK: {
      symbol: 'LINK',
      name: 'Chainlink',
      coingeckoId: 'chainlink',
      // Official Chainlink token on Ethereum Sepolia — obtainable via faucets.chain.link
      baseAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      decimals: 18,
      logoUrl: '/coin-icons/link.svg',
    },
    UNI: {
      symbol: 'UNI',
      name: 'Uniswap',
      coingeckoId: 'uniswap',
      // Uniswap governance token — same address on all networks
      baseAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      decimals: 18,
      logoUrl: '/coin-icons/uni.svg',
    },
  }
  : {
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      coingeckoId: 'ethereum',
      // WETH on Ethereum Mainnet
      baseAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      logoUrl: '/coin-icons/eth.svg',
      isWrapped: true,
    },
    WBTC: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      coingeckoId: 'wrapped-bitcoin',
      // WBTC on Ethereum Mainnet
      baseAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      decimals: 8,
      logoUrl: '/coin-icons/wbtc.svg',
    },
    LINK: {
      symbol: 'LINK',
      name: 'Chainlink',
      coingeckoId: 'chainlink',
      // LINK on Ethereum Mainnet
      baseAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      decimals: 18,
      logoUrl: '/coin-icons/link.svg',
    },
    UNI: {
      symbol: 'UNI',
      name: 'Uniswap',
      coingeckoId: 'uniswap',
      // UNI on Ethereum Mainnet
      baseAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      decimals: 18,
      logoUrl: '/coin-icons/uni.svg',
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
