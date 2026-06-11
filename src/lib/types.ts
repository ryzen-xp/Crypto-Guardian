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

// ─── Position Tracking (NEW) ──────────────────────────────────────────────────

/**
 * Cost basis position: User's entry point, stop-loss, and quantity held.
 * Agent uses this to decide if a DANGER verdict should trigger a swap.
 */
export type Position = {
  id?: string
  userId: string
  coinSymbol: string           // "ETH", "WETH"
  entryPrice: number           // Price user bought at (USD)
  quantity: number             // Amount held
  boughtAt: Date               // When position was opened
  protectBelow: number         // Stop-loss price (USD)
  source: 'manual' | 'import'  // Where entry price came from
  notes?: string               // User's notes (why they bought)
}

/**
 * Position with calculated P&L metrics.
 */
export type PositionWithPnL = Position & {
  currentPrice: number
  totalValueUSD: number        // quantity × currentPrice
  totalCostUSD: number         // quantity × entryPrice
  pnlUSD: number               // totalValueUSD - totalCostUSD
  pnlPercent: number           // (pnlUSD / totalCostUSD) × 100
  isUnderStopLoss: boolean     // currentPrice <= protectBelow
}

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
  positionId?: string          // If swap was triggered by position stop-loss
}

// ─── Terminal Logs ───────────────────────────────────────────────────────────

export type TerminalLineType = 'system' | 'info' | 'ai' | 'success' | 'warning' | 'error' | 'header'

export type TerminalLine = {
  id: string
  ts: string       // ISO timestamp string (serializable)
  type: TerminalLineType
  coin?: string    // If this log belongs to a specific coin analysis
  content: string
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
  veniceWarning?: string
  terminalLogs: TerminalLine[]
  perCoinReasoning: Record<string, string>
  coinPriorities: Record<string, number>
}

// ─── 1-Shot Relay ────────────────────────────────────────────────────────────

export type RelayResult = {
  relayId: string
  status: 'pending' | 'confirmed' | 'failed'
  txHash?: string
  estimatedGasUSDC: string
}

// ─── Smart Accounts (ERC-7715) ───────────────────────────────────────────────

export type PermissionGrant = {
  delegatee: string           // Relayer address (1-Shot)
  chainId: number
  expiresAt: number          // Unix timestamp
  permissions: Array<{
    target: string           // Token address
    valueLimit: string       // Max value (0 = unlimited)
  }>
}

export type PermissionStatus = {
  active: boolean
  expiresAt?: Date
  daysLeft?: number
  coinsPermitted: string[]
  needsRenewal: boolean
}

// ─── Venice AI Analysis ──────────────────────────────────────────────────────

export type AnalysisResult = {
  verdicts: Record<string, Verdict>
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
