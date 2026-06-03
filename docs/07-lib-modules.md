# Library Modules

All business logic lives in `src/lib/`. These are pure TypeScript modules with no React dependencies.

---

## `coins.ts`

Single source of truth for all coin configuration.

```typescript
export type CoinConfig = {
  symbol: string
  name: string
  coingeckoId: string
  baseAddress: string // token address on Base mainnet
  decimals: number
  logoUrl: string
  isWrapped?: boolean // e.g., WETH, wrapped DOGE
}

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
    baseAddress: '0x...', // bridged MATIC on Base
    decimals: 18,
    logoUrl: '/coin-icons/matic.svg',
  },
  ARB: {
    symbol: 'ARB',
    name: 'Arbitrum',
    coingeckoId: 'arbitrum',
    baseAddress: '0x...', // bridged ARB on Base
    decimals: 18,
    logoUrl: '/coin-icons/arb.svg',
  },
  OP: {
    symbol: 'OP',
    name: 'Optimism',
    coingeckoId: 'optimism',
    baseAddress: '0x...', // bridged OP on Base
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
    baseAddress: '0x...', // wrapped DOGE on Base
    decimals: 8,
    logoUrl: '/coin-icons/doge.svg',
    isWrapped: true,
  },
  SHIB: {
    symbol: 'SHIB',
    name: 'Shiba Inu',
    coingeckoId: 'shiba-inu',
    baseAddress: '0x...', // SHIB on Base
    decimals: 18,
    logoUrl: '/coin-icons/shib.svg',
  },
  PEPE: {
    symbol: 'PEPE',
    name: 'Pepe',
    coingeckoId: 'pepe',
    baseAddress: '0x...', // PEPE on Base
    decimals: 18,
    logoUrl: '/coin-icons/pepe.svg',
  },
}

export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
export const USDC_DECIMALS = 6
```

---

## `market-data.ts`

Fetches all market data. Pure data fetching, no side effects.

```typescript
// Exported functions:
export async function fetchAllPrices(coinIds: string[]): Promise<PriceMap>
export async function fetchFearGreedIndex(): Promise<FearGreedData>
export async function fetchMarketSnapshot(activeCoins: string[]): Promise<MarketSnapshot>
// MarketSnapshot combines prices + fearGreed in one call
```

**Key implementation notes:**

- One CoinGecko request for ALL coins (comma-separated ids)
- Include `include_1h_change=true&include_24hr_change=true`
- Fear/Greed: single request, parse `data[0]`
- Both requests run in parallel with `Promise.all`

---

## `venice.ts`

Venice AI API client. Two distinct call types.

```typescript
// Exported functions:
export async function searchCoinNews(coinSymbol: string, coinName: string): Promise<string>
// Returns: brief news summary string from web_search

export async function analyzeMarket(context: MarketContext): Promise<AnalysisResult>
// Returns: verdicts per coin + priority coin + reasoning

// Types:
type MarketContext = {
  prices: PriceMap
  fearGreed: FearGreedData
  newsSnippets: Record<string, string>
  activeCoins: string[]
  userSettings: CoinSettings
}

type AnalysisResult = {
  verdicts: Record<string, Verdict>
  priorityCoin: string
  priorityAction: 'BUY' | 'SELL' | 'HOLD'
  reasoning: string
  rawResponse: string // stored for debugging
}
```

**Key implementation notes:**

- `searchCoinNews`: use `tools: [{ type: "web_search" }]`, parse tool_use result
- `analyzeMarket`: structured prompt, parse JSON from response
- System prompt stored as a constant — easy to tune
- Retry on 429 with exponential backoff (max 3 retries)
- Validate parsed JSON against expected schema before returning

---

## `agent-engine.ts`

Main orchestrator for the 15-minute loop. This is the brain.

```typescript
// Exported functions:
export async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult>

type AgentLoopParams = {
  userAddress: string
  activeCoins: string[]
  coinSettings: CoinSettings
}

type AgentLoopResult = {
  verdicts: Record<string, Verdict>
  priorityCoin: string
  actionTaken: AgentAction | null
  reasoning: string
  loopDurationMs: number
  nextRunAt: Date
}
```

**Decision logic (checkUserRules):**

```typescript
function checkUserRules(
  coin: string,
  action: 'BUY' | 'SELL',
  amountUSD: number,
  settings: CoinSettings,
  todaysUsage: DailyUsage
): { allowed: boolean; reason: string }
```

Checks in order:

1. Is monitoring ON for this coin?
2. Is amount > single swap limit?
3. Would it exceed daily limit?
4. For SELL: would result go below minimum hold?
5. For BUY: is risk sensitivity aggressive enough?

All checks logged regardless of outcome.

---

## `smart-accounts.ts`

MetaMask Smart Accounts Kit integration.

```typescript
// Exported functions:
export async function upgradeToSmartAccount(walletClient: WalletClient): Promise<string>
// Returns: Smart Account address

export async function grantMonitoringPermissions(
  smartAccountAddress: string,
  coins: CoinConfig[],
  limits: CoinLimits
): Promise<PermissionGrant>
// Returns: grant receipt + expiry

export async function checkActivePermissions(address: string): Promise<PermissionStatus>
// Returns: which coins are permitted + expiry + usage

export async function revokePermissions(address: string): Promise<void>
```

**Key notes:**

- Uses `@metamask/delegation-toolkit`
- ERC-7715 permissions scoped to specific token contracts
- Daily spending caps enforced onchain
- Expiry: 30 days, renewable

---

## `oneshot.ts`

1Shot Relayer API client.

```typescript
// Exported functions:
export async function relayTransaction(params: RelayParams): Promise<RelayResult>

type RelayParams = {
  to: string // contract address
  data: string // encoded calldata
  value?: bigint // ETH value (usually 0 for ERC20 swaps)
  userAddress: string
  chainId: number // 8453 for Base
}

type RelayResult = {
  relayId: string
  status: 'pending' | 'confirmed' | 'failed'
  txHash?: string
  estimatedGasUSDC: string
}

export async function getRelayStatus(relayId: string): Promise<RelayResult>
export async function upgradeAccountEIP7702(walletAddress: string): Promise<string>
// Returns: Smart Account address after EIP-7702 upgrade
```

**Endpoint:** `POST https://api.1shotapi.com/v1/relay`

---

## `uniswap.ts`

Uniswap v3 swap calldata builder for Base mainnet.

```typescript
// Exported functions:
export async function buildSwapCalldata(params: SwapParams): Promise<SwapCalldata>

type SwapParams = {
  tokenIn: string // contract address
  tokenOut: string // contract address
  amountIn: bigint // in token decimals
  slippageBps: number // e.g., 50 = 0.5%
  recipient: string // user's Smart Account address
  chainId: number // 8453
}

type SwapCalldata = {
  to: string // Uniswap v3 router address on Base
  data: string // encoded exactInputSingle
  minAmountOut: bigint
}
```

**Key notes:**

- Use `@uniswap/v3-sdk` + `@uniswap/sdk-core`
- Uniswap v3 SwapRouter02 on Base: `0x2626664c2603336E57B271c5C0b26F421741e481`
- Default slippage: 0.5% (50 bps)
- Use `exactInputSingle` for single-hop swaps
- Pool fee tier: 0.3% (3000) for most pairs, 0.05% (500) for stablecoins

---

## `types.ts`

All shared TypeScript types. Import from here, not from individual modules.

```typescript
export type Verdict = 'DANGER' | 'CAUTION' | 'NEUTRAL' | 'OPPORTUNITY'

export type VerdictMap = Record<string, Verdict>

export type CoinSettings = {
  [symbol: string]: {
    enabled: boolean
    maxSwapUSD: number
    dailyLimitUSD: number
    minHoldUSD: number
    riskSensitivity: 'conservative' | 'moderate' | 'aggressive'
  }
}

export type AgentAction = {
  id: string
  timestamp: Date
  coin: string
  verdict: Verdict
  action: 'BUY' | 'SELL' | 'HOLD' | 'SKIPPED'
  amountUSD: number
  reasoning: string
  txHash?: string
  relayId?: string
  status: 'pending' | 'confirmed' | 'failed' | 'skipped'
}

export type MarketSnapshot = {
  prices: PriceMap
  fearGreed: FearGreedData
  fetchedAt: Date
}

export type PriceMap = {
  [coingeckoId: string]: {
    usd: number
    usd_1h_change: number
    usd_24h_change: number
  }
}

export type FearGreedData = {
  value: number
  label: string
  timestamp: string
}

export type PermissionStatus = {
  active: boolean
  expiresAt: Date
  coinsPermitted: string[]
  dailyCapsUSD: Record<string, number>
}
```
