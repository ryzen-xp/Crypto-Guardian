// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Verdict = 'DANGER' | 'CAUTION' | 'NEUTRAL' | 'OPPORTUNITY'

export type VerdictMap = Record<string, Verdict>

export type RiskSensitivity = 'conservative' | 'moderate' | 'aggressive'

export type CoinConfig = {
  symbol: string
  name: string
  coingeckoId: string
  baseAddress: string
  decimals: number
  logoUrl: string
  isWrapped?: boolean
}

// ─── Stablecoins ──────────────────────────────────────────────────────────────

export type StablecoinConfig = {
  symbol: string
  name: string
  address: string
  decimals: number
  logoUrl: string
  description: string
}

// ─── Market Data ─────────────────────────────────────────────────────────────

export type CoinPrice = {
  usd: number
  usd_1h_change: number
  usd_24h_change: number
}

export type PriceMap = Record<string, CoinPrice>

export type FearGreedData = {
  value: number
  label: string
  timestamp: string
}

export type MarketSnapshot = {
  prices: PriceMap
  fearGreed: FearGreedData
  fetchedAt: Date
}

// ─── User Settings ────────────────────────────────────────────────────────────

export type CoinSetting = {
  enabled: boolean
  maxSwapUSD: number
  dailyLimitUSD: number
  minHoldUSD: number
  riskSensitivity: RiskSensitivity
}

export type CoinSettings = Record<string, CoinSetting>

// ─── Agent ───────────────────────────────────────────────────────────────────

export type AgentActionType = 'BUY' | 'SELL' | 'HOLD' | 'SKIPPED'

export type AgentActionStatus = 'pending' | 'confirmed' | 'failed' | 'skipped'

export type AgentAction = {
  id: string
  timestamp: Date
  coin: string
  verdict: Verdict
  action: AgentActionType
  amountUSD: number
  reasoning: string
  txHash?: string
  relayId?: string
  status: AgentActionStatus
}

export type AgentLoopResult = {
  verdicts: VerdictMap
  priorityCoin: string
  actionTaken: AgentAction | null
  reasoning: string
  newsSnippets: Record<string, string>
  loopDurationMs: number
  nextRunAt: Date
  ranAt: Date
  stablecoinUsed: string
}

// ─── Venice AI ───────────────────────────────────────────────────────────────

export type AnalysisResult = {
  verdicts: VerdictMap
  priorityCoin: string
  priorityAction: 'BUY' | 'SELL' | 'HOLD'
  reasoning: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  rawResponse: string
}

export type MarketContext = {
  prices: PriceMap
  fearGreed: FearGreedData
  newsSnippets: Record<string, string>
  activeCoins: string[]
  userSettings: CoinSettings
}

// ─── Smart Accounts / Permissions ────────────────────────────────────────────

export type PermissionStatus = {
  active: boolean
  expiresAt?: Date
  daysLeft?: number
  coinsPermitted: string[]
  needsRenewal: boolean
}

export type PermissionGrant = {
  grantId: string
  smartAccountAddress: string
  expiresAt: Date
  coinsPermitted: string[]
  txHash: string
}

// ─── 1Shot Relay ─────────────────────────────────────────────────────────────

export type RelayStatus = 'pending' | 'confirmed' | 'failed'

export type RelayResult = {
  relayId: string
  status: RelayStatus
  txHash?: string
  estimatedGasUSDC: string
}

// ─── API Responses ────────────────────────────────────────────────────────────

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiError = {
  success: false
  error: string
  code: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
