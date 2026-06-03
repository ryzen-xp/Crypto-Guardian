import type { CoinConfig, StablecoinConfig } from './types'

// ─── Supported Stablecoins on Base Mainnet ────────────────────────────────────
// User picks ONE of these as their safe asset. All danger swaps go here.

export const STABLECOINS: Record<string, StablecoinConfig> = {
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
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18,
    logoUrl: '/coin-icons/dai.svg',
    description: 'Decentralized, crypto-backed stablecoin by MakerDAO.',
  },
  USDBC: {
    symbol: 'USDbC',
    name: 'Bridged USDC (Base)',
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    decimals: 6,
    logoUrl: '/coin-icons/usdbc.svg',
    description: 'Original bridged USDC on Base. Legacy option.',
  },
}

/** Default stablecoin — used if user hasn't picked one yet */
export const DEFAULT_STABLECOIN = 'USDC'

/** Get stablecoin config by symbol, throws if not found */
export function getStablecoin(symbol: string): StablecoinConfig {
  const stable = STABLECOINS[symbol]
  if (!stable) throw new Error(`Unknown stablecoin: ${symbol}`)
  return stable
}

// ─── Uniswap V3 on Base ───────────────────────────────────────────────────────

export const UNISWAP_V3_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481' as const

// ─── Monitored Coins ──────────────────────────────────────────────────────────
// All addresses are on Base Mainnet (chainId: 8453)
// TODO: verify TBD addresses on Basescan before mainnet launch

export const MONITORED_COINS: Record<string, CoinConfig> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    coingeckoId: 'ethereum',
    baseAddress: '0x4200000000000000000000000000000000000006', // WETH on Base
    decimals: 18,
    logoUrl: '/coin-icons/eth.svg',
    isWrapped: true,
  },
  MATIC: {
    symbol: 'MATIC',
    name: 'Polygon',
    coingeckoId: 'matic-network',
    baseAddress: '0x7c9f4C87d911613Fe9ca58b579f737911AAD2D43', // bridged MATIC on Base
    decimals: 18,
    logoUrl: '/coin-icons/matic.svg',
  },
  ARB: {
    symbol: 'ARB',
    name: 'Arbitrum',
    coingeckoId: 'arbitrum',
    baseAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548', // TODO: verify Base bridge address
    decimals: 18,
    logoUrl: '/coin-icons/arb.svg',
  },
  OP: {
    symbol: 'OP',
    name: 'Optimism',
    coingeckoId: 'optimism',
    baseAddress: '0x4200000000000000000000000000000000000042', // OP token on Base
    decimals: 18,
    logoUrl: '/coin-icons/op.svg',
  },
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    coingeckoId: 'chainlink',
    baseAddress: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196',
    decimals: 18,
    logoUrl: '/coin-icons/link.svg',
  },
  UNI: {
    symbol: 'UNI',
    name: 'Uniswap',
    coingeckoId: 'uniswap',
    baseAddress: '0xc3De830EA07524a0761646a6a4e4be0e114a3C83',
    decimals: 18,
    logoUrl: '/coin-icons/uni.svg',
  },
  AAVE: {
    symbol: 'AAVE',
    name: 'Aave',
    coingeckoId: 'aave',
    baseAddress: '0x63706e401c06ac8513145d0C9A67be75F047dfb4',
    decimals: 18,
    logoUrl: '/coin-icons/aave.svg',
  },
  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    coingeckoId: 'dogecoin',
    baseAddress: '0xF4e3A35AEeC97EB75ea25B42b1Ff5d711b0B5952', // TODO: verify wrapped DOGE on Base
    decimals: 8,
    logoUrl: '/coin-icons/doge.svg',
    isWrapped: true,
  },
  SHIB: {
    symbol: 'SHIB',
    name: 'Shiba Inu',
    coingeckoId: 'shiba-inu',
    baseAddress: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', // TODO: verify Base address
    decimals: 18,
    logoUrl: '/coin-icons/shib.svg',
  },
  PEPE: {
    symbol: 'PEPE',
    name: 'Pepe',
    coingeckoId: 'pepe',
    baseAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', // TODO: verify Base address
    decimals: 18,
    logoUrl: '/coin-icons/pepe.svg',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All CoinGecko IDs comma-separated — for the CoinGecko API request */
export const COINGECKO_IDS = Object.values(MONITORED_COINS)
  .map((c) => c.coingeckoId)
  .join(',')

/** Map from coingeckoId → symbol for quick lookup */
export const COINGECKO_ID_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.values(MONITORED_COINS).map((c) => [c.coingeckoId, c.symbol])
)

/** Get coin config by symbol, throws if not found */
export function getCoin(symbol: string): CoinConfig {
  const coin = MONITORED_COINS[symbol]
  if (!coin) throw new Error(`Unknown coin symbol: ${symbol}`)
  return coin
}

/** Get coin config by Base address */
export function getCoinByAddress(address: string): CoinConfig | undefined {
  return Object.values(MONITORED_COINS).find(
    (c) => c.baseAddress.toLowerCase() === address.toLowerCase()
  )
}
