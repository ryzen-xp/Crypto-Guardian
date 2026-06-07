import type { CoinConfig, StablecoinConfig } from './types'

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'

// ─── Uniswap V3 Router ────────────────────────────────────────────────────────

export const UNISWAP_V3_ROUTER = (
  IS_TESTNET
    ? (process.env.NEXT_PUBLIC_UNISWAP_ROUTER ?? '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4')
    : '0x2626664c2603336E57B271c5C0b26F421741e481'
) as `0x${string}`

// ─── Stablecoins — USDC and USDT only ────────────────────────────────────────

export const STABLECOINS: Record<string, StablecoinConfig> = IS_TESTNET
  ? {
      USDC: {
        symbol: 'USDC',
        name: 'USD Coin (Testnet)',
        address:
          (process.env.NEXT_PUBLIC_USDC_ADDRESS as string) ??
          '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        decimals: 6,
        logoUrl: '/coin-icons/usdc.svg',
        description: 'Circle USDC on Base Sepolia testnet.',
      },
      USDT: {
        symbol: 'USDT',
        name: 'Tether USD (Testnet)',
        address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        decimals: 6,
        logoUrl: '/coin-icons/usdt.svg',
        description: 'USDT on Base Sepolia testnet.',
      },
    }
  : {
      USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        logoUrl: '/coin-icons/usdc.svg',
        description: 'Most liquid stablecoin on Base. Widest Uniswap pool coverage.',
      },
      USDT: {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
        decimals: 6,
        logoUrl: '/coin-icons/usdt.svg',
        description: 'Largest stablecoin by market cap. Good liquidity on Base.',
      },
    }

export const DEFAULT_STABLECOIN = 'USDC'

export function getStablecoin(symbol: string): StablecoinConfig {
  const stable = STABLECOINS[symbol] ?? STABLECOINS['USDC']
  if (!stable) throw new Error(`Unknown stablecoin: ${symbol}`)
  return stable
}

// ─── Monitored Coins — ETH, WBTC, ARB, OP ────────────────────────────────────
// All EVM-native versions on Base Mainnet / Base Sepolia.
// WBTC = Wrapped Bitcoin, the standard BTC representation on EVM chains.

export const MONITORED_COINS: Record<string, CoinConfig> = IS_TESTNET
  ? {
      ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        coingeckoId: 'ethereum',
        baseAddress: '0x4200000000000000000000000000000000000006', // WETH on Base Sepolia
        decimals: 18,
        logoUrl: '/coin-icons/eth.svg',
        isWrapped: true,
      },
      WBTC: {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        coingeckoId: 'wrapped-bitcoin',
        // Aave testnet WBTC on Base Sepolia
        baseAddress: '0x29f2D40B0605204364af54EC677bD022dA425d03',
        decimals: 8,
        logoUrl: '/coin-icons/wbtc.svg',
        isWrapped: true,
      },
      ARB: {
        symbol: 'ARB',
        name: 'Arbitrum',
        coingeckoId: 'arbitrum',
        // ARB bridged to Base Sepolia (test address — verify before mainnet)
        baseAddress: '0x1518C62d4ebE61d72C9e780a3Adf4a0E79b31B31',
        decimals: 18,
        logoUrl: '/coin-icons/arb.svg',
      },
      OP: {
        symbol: 'OP',
        name: 'Optimism',
        coingeckoId: 'optimism',
        // OP token on Base Sepolia (test address — verify before mainnet)
        baseAddress: '0x4200000000000000000000000000000000000042',
        decimals: 18,
        logoUrl: '/coin-icons/op.svg',
      },
    }
  : {
      ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        coingeckoId: 'ethereum',
        baseAddress: '0x4200000000000000000000000000000000000006', // WETH on Base
        decimals: 18,
        logoUrl: '/coin-icons/eth.svg',
        isWrapped: true,
      },
      WBTC: {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        coingeckoId: 'wrapped-bitcoin',
        // WBTC on Base Mainnet (bridged via official Base bridge)
        baseAddress: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
        decimals: 8,
        logoUrl: '/coin-icons/wbtc.svg',
        isWrapped: true,
      },
      ARB: {
        symbol: 'ARB',
        name: 'Arbitrum',
        coingeckoId: 'arbitrum',
        // ARB bridged to Base via official bridge
        baseAddress: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        decimals: 18,
        logoUrl: '/coin-icons/arb.svg',
      },
      OP: {
        symbol: 'OP',
        name: 'Optimism',
        coingeckoId: 'optimism',
        // OP token on Base Mainnet
        baseAddress: '0x4200000000000000000000000000000000000042',
        decimals: 18,
        logoUrl: '/coin-icons/op.svg',
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
