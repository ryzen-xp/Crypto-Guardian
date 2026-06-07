import { getCoin, MONITORED_COINS } from './coins'
import { fetchMarketSnapshot } from './market-data'
import { fetchAllCoinNews, analyzeMarket } from './venice'
import { buildSellToStable, buildBuyWithStable } from './uniswap'
import { relayTransaction } from './oneshot'
import { IS_TESTNET } from './chain-config'
import type { AgentAction, AgentLoopResult, CoinSettings, Verdict } from './types'

// ─── Cooldown ─────────────────────────────────────────────────────────────────

const LOOP_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes
let lastRunAt: Date | null = null

export function getLastRunAt(): Date | null {
  return lastRunAt
}

export function getNextRunAt(): Date {
  if (!lastRunAt) return new Date()
  return new Date(lastRunAt.getTime() + LOOP_INTERVAL_MS)
}

export function isOnCooldown(): boolean {
  if (!lastRunAt) return false
  return Date.now() - lastRunAt.getTime() < LOOP_INTERVAL_MS
}

// ─── Agent Loop ───────────────────────────────────────────────────────────────

type AgentLoopParams = {
  userAddress: string
  activeCoins: string[]
  coinSettings: CoinSettings
  /** Symbol of the user's chosen stablecoin (USDC, USDT, DAI, USDbC) */
  stablecoinSymbol: string
  forceRun?: boolean
}

/**
 * Main agent loop — runs the full 15-minute cycle:
 * 1. Fetch market data
 * 2. Fetch news per coin
 * 3. Analyze with Venice AI
 * 4. Check user rules
 * 5. Execute swap if needed
 * 6. Return full result for dashboard
 */
export async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult> {
  const { userAddress, activeCoins, coinSettings, stablecoinSymbol, forceRun = false } = params

  if (!forceRun && isOnCooldown()) {
    throw new Error(`Agent is on cooldown. Next run at: ${getNextRunAt().toISOString()}`)
  }

  const startTime = Date.now()

  // ── Step 1: Fetch market data ──────────────────────────────────────────────
  const marketSnapshot = await fetchMarketSnapshot()

  // ── Step 2: Fetch news per coin ───────────────────────────────────────────
  const coinNames = Object.fromEntries(
    activeCoins.map((symbol) => [symbol, MONITORED_COINS[symbol]?.name ?? symbol])
  )
  const newsSnippets = await fetchAllCoinNews(activeCoins, coinNames)

  // ── Step 3: Venice AI analysis (falls back to local analyser automatically) ──
  const analysis = await analyzeMarket({
    prices: marketSnapshot.prices,
    fearGreed: marketSnapshot.fearGreed,
    newsSnippets,
    activeCoins,
    userSettings: coinSettings,
  })

  // Detect if local analyser was used (rawResponse contains the marker)
  const usedLocalAnalyser = analysis.rawResponse.includes('local-analyser')
  const providerMatch = analysis.rawResponse.match(/\[provider:([^\]]+)\]/)
  const providerUsed = providerMatch?.[1] ?? null

  let veniceWarning: string | undefined
  if (usedLocalAnalyser) {
    veniceWarning =
      'All AI providers unavailable — verdicts calculated from price momentum and Fear & Greed index.'
  } else if (providerUsed && providerUsed !== 'Venice AI') {
    veniceWarning = `Venice AI unavailable — analysis provided by ${providerUsed} (free tier).`
  }

  // ── Step 4: Check rules for priority coin ─────────────────────────────────
  const prioritySymbol = analysis.priorityCoin
  const priorityVerdict = analysis.verdicts[prioritySymbol] ?? 'NEUTRAL'
  const priorityAction = analysis.priorityAction

  const ruleCheck = checkUserRules({
    symbol: prioritySymbol,
    action: priorityAction,
    verdict: priorityVerdict,
    settings: coinSettings,
    price: marketSnapshot.prices[prioritySymbol]?.usd ?? 0,
  })

  // ── Step 5: Execute swap if action is warranted ───────────────────────────
  let actionTaken: AgentAction | null = null

  if (ruleCheck.allowed && priorityAction !== 'HOLD') {
    actionTaken = await executeSwap({
      symbol: prioritySymbol,
      action: priorityAction,
      verdict: priorityVerdict,
      amountUSD: ruleCheck.swapAmountUSD,
      userAddress,
      price: marketSnapshot.prices[prioritySymbol]?.usd ?? 0,
      reasoning: analysis.reasoning,
      stablecoinSymbol,
    })
  } else {
    // Log the skip
    actionTaken = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      coin: prioritySymbol,
      verdict: priorityVerdict,
      action: 'SKIPPED',
      amountUSD: 0,
      reasoning: ruleCheck.reason,
      status: 'skipped',
    }
  }

  lastRunAt = new Date()

  return {
    verdicts: analysis.verdicts,
    priorityCoin: prioritySymbol,
    actionTaken,
    reasoning: analysis.reasoning,
    newsSnippets,
    loopDurationMs: Date.now() - startTime,
    nextRunAt: getNextRunAt(),
    ranAt: lastRunAt,
    stablecoinUsed: stablecoinSymbol,
    veniceWarning,
  }
}

// ─── User Rules Check ─────────────────────────────────────────────────────────

type RuleCheckParams = {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  verdict: Verdict
  settings: CoinSettings
  price: number
}

type RuleCheckResult = {
  allowed: boolean
  reason: string
  swapAmountUSD: number
}

function checkUserRules(params: RuleCheckParams): RuleCheckResult {
  const { symbol, action, verdict, settings, price } = params

  const setting = settings[symbol]

  if (!setting) {
    return { allowed: false, reason: `No settings found for ${symbol}`, swapAmountUSD: 0 }
  }

  if (!setting.enabled) {
    return { allowed: false, reason: `Monitoring is disabled for ${symbol}`, swapAmountUSD: 0 }
  }

  // Conservative: only act on DANGER for sells
  if (setting.riskSensitivity === 'conservative' && action === 'SELL' && verdict !== 'DANGER') {
    return {
      allowed: false,
      reason: `Conservative mode: only acting on DANGER, current verdict is ${verdict}`,
      swapAmountUSD: 0,
    }
  }

  // Conservative: never buys
  if (setting.riskSensitivity === 'conservative' && action === 'BUY') {
    return {
      allowed: false,
      reason: 'Conservative mode: buy actions disabled',
      swapAmountUSD: 0,
    }
  }

  // Moderate: no buys unless aggressive
  if (setting.riskSensitivity === 'moderate' && action === 'BUY') {
    return {
      allowed: false,
      reason: 'Moderate mode: buy actions disabled. Set Aggressive to enable.',
      swapAmountUSD: 0,
    }
  }

  // Calculate swap amount based on risk sensitivity
  const swapPercentage =
    setting.riskSensitivity === 'aggressive'
      ? 0.75
      : setting.riskSensitivity === 'moderate'
        ? 0.5
        : 0.25

  const swapAmountUSD = Math.min(setting.maxSwapUSD, setting.maxSwapUSD * swapPercentage)

  if (swapAmountUSD <= 0) {
    return { allowed: false, reason: 'Swap amount is zero', swapAmountUSD: 0 }
  }

  if (price <= 0) {
    return { allowed: false, reason: `Price data unavailable for ${symbol}`, swapAmountUSD: 0 }
  }

  return {
    allowed: true,
    reason: `Action approved: ${action} $${swapAmountUSD.toFixed(2)} of ${symbol}`,
    swapAmountUSD,
  }
}

// ─── Execute Swap ─────────────────────────────────────────────────────────────

type ExecuteSwapParams = {
  symbol: string
  action: 'BUY' | 'SELL'
  verdict: Verdict
  amountUSD: number
  userAddress: string
  price: number
  reasoning: string
  stablecoinSymbol: string
}

async function executeSwap(params: ExecuteSwapParams): Promise<AgentAction> {
  const { symbol, action, verdict, amountUSD, userAddress, price, reasoning, stablecoinSymbol } =
    params

  const coin = getCoin(symbol)

  try {
    const calldata =
      action === 'SELL'
        ? buildSellToStable({
            tokenAddress: coin.baseAddress,
            tokenDecimals: coin.decimals,
            amountInUSD: amountUSD,
            tokenPriceUSD: price,
            recipient: userAddress,
            stablecoinSymbol,
          })
        : buildBuyWithStable({
            tokenAddress: coin.baseAddress,
            amountInUSD: amountUSD,
            recipient: userAddress,
            stablecoinSymbol,
          })

    const relay = await relayTransaction({
      to: calldata.to,
      data: calldata.data,
      userAddress,
      chainId: IS_TESTNET ? 84532 : 8453,
    })

    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      coin: symbol,
      verdict,
      action,
      amountUSD,
      reasoning,
      txHash: relay.txHash,
      relayId: relay.relayId,
      status: relay.status === 'confirmed' ? 'confirmed' : 'pending',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Swap execution failed for ${symbol}:`, message)

    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      coin: symbol,
      verdict,
      action,
      amountUSD,
      reasoning,
      status: 'failed',
    }
  }
}
