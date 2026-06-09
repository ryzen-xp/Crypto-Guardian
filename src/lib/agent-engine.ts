import { getCoin, MONITORED_COINS } from './coins'
import { fetchWalletBalances } from './balances'
import { fetchMarketSnapshot } from './market-data'
import { fetchAllCoinNews, analyzeMarket } from './venice'
import { buildSellToStable, buildBuyWithStable } from './uniswap'
import { relayUniswapSwap } from './oneshot'
import { IS_TESTNET } from './chain-config'
import type { AgentAction, AgentLoopResult, CoinSettings, Verdict } from './types'

// ─── Cooldown ─────────────────────────────────────────────────────────────────

const LOOP_INTERVAL_MS = 100 * 1000 // 100 seconds
const LOCAL_ANALYZER_BACKOFF_MS = 5 * 60 * 1000
const HOLDING_EMPTY_BACKOFF_MS = 60 * 60 * 1000
const SINGLE_ASSET_DRAIN_BACKOFF_MS = 30 * 60 * 1000
const FAILED_SWAP_BACKOFF_MS = 5 * 60 * 1000
let lastRunAt: Date | null = null
let nextAllowedRunAt: Date | null = null

export function getLastRunAt(): Date | null {
  return lastRunAt
}

export function getNextRunAt(): Date {
  return nextAllowedRunAt ?? new Date()
}

export function isOnCooldown(): boolean {
  if (!nextAllowedRunAt) return false
  return Date.now() < nextAllowedRunAt.getTime()
}

function calculateNextRunAt(params: {
  heldCoinCount: number
  usedLocalAnalyser: boolean
  actionTaken: AgentAction | null
}): Date {
  const now = Date.now()

  if (params.heldCoinCount === 0) {
    return new Date(now + HOLDING_EMPTY_BACKOFF_MS)
  }

  if (params.actionTaken?.status === 'failed') {
    return new Date(now + FAILED_SWAP_BACKOFF_MS)
  }

  if (params.actionTaken?.status === 'confirmed' && params.heldCoinCount === 1) {
    return new Date(now + SINGLE_ASSET_DRAIN_BACKOFF_MS)
  }

  if (params.usedLocalAnalyser) {
    return new Date(now + LOCAL_ANALYZER_BACKOFF_MS)
  }

  return new Date(now + LOOP_INTERVAL_MS)
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

  const walletBalances = await fetchWalletBalances(userAddress)
  const heldCoins = activeCoins.filter((symbol) => walletBalances[symbol]?.isHeld)
  const marketHoldReason = 'No volatile assets held. Monitoring is on hold until a balance appears.'

  if (heldCoins.length === 0) {
    const ranAt = new Date()
    const nextRunAt = calculateNextRunAt({
      heldCoinCount: 0,
      usedLocalAnalyser: false,
      actionTaken: null,
    })

    lastRunAt = ranAt
    nextAllowedRunAt = nextRunAt

    return {
      verdicts: Object.fromEntries(
        activeCoins.map((symbol) => [symbol, 'NEUTRAL' as Verdict])
      ) as Record<string, Verdict>,
      priorityCoin: '',
      actionTaken: null,
      reasoning: marketHoldReason,
      newsSnippets: {},
      loopDurationMs: Date.now() - startTime,
      nextRunAt,
      ranAt,
      stablecoinUsed: stablecoinSymbol,
      veniceWarning: marketHoldReason,
    }
  }

  // ── Step 1: Fetch market data ──────────────────────────────────────────────
  const marketSnapshot = await fetchMarketSnapshot()

  // ── Step 2: Fetch news per coin ───────────────────────────────────────────
  const coinNames = Object.fromEntries(
    activeCoins.map((symbol) => [symbol, MONITORED_COINS[symbol]?.name ?? symbol])
  )
  const newsSnippets = await fetchAllCoinNews(heldCoins, coinNames)

  // ── Step 3: Venice AI analysis (falls back to local analyser automatically) ──
  const analysis = await analyzeMarket({
    prices: marketSnapshot.prices,
    fearGreed: marketSnapshot.fearGreed,
    newsSnippets,
    activeCoins: heldCoins,
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
  let prioritySymbol = analysis.priorityCoin
  let priorityVerdict = analysis.verdicts[prioritySymbol] ?? 'NEUTRAL'
  let priorityAction = analysis.priorityAction
  let reasoning = analysis.reasoning

  // OVERRIDE: If any active coin is in DANGER, prioritize protecting it by forcing a SELL (swap)
  const dangerCoin = heldCoins.find((symbol) => analysis.verdicts[symbol] === 'DANGER')
  if (dangerCoin) {
    prioritySymbol = dangerCoin
    priorityVerdict = 'DANGER'
    priorityAction = 'SELL'
    reasoning = `[CRITICAL PROTECTION] Forcing automated swap of ${dangerCoin} to stablecoin due to DANGER status. ${reasoning}`
    console.warn(
      `[agent-engine] Override: active coin ${dangerCoin} is in DANGER! Forcing SELL action for protection.`
    )
  }

  const ruleCheck = checkUserRules({
    symbol: prioritySymbol,
    action: priorityAction,
    verdict: priorityVerdict,
    settings: coinSettings,
    price: marketSnapshot.prices[prioritySymbol]?.usd ?? 0,
    balanceUSD: (walletBalances[prioritySymbol]?.formatted ?? 0) * (marketSnapshot.prices[prioritySymbol]?.usd ?? 0),
  })

  // ── Step 5: Execute swap if action is warranted ───────────────────────────
  let actionTaken: AgentAction | null = null

  if (ruleCheck.allowed && priorityAction !== 'HOLD') {
    const balance = walletBalances[prioritySymbol]
    actionTaken = await executeSwap({
      symbol: prioritySymbol,
      action: priorityAction,
      verdict: priorityVerdict,
      amountUSD:
        priorityAction === 'SELL'
          ? (balance?.formatted ?? 0) * (marketSnapshot.prices[prioritySymbol]?.usd ?? 0)
          : ruleCheck.swapAmountUSD,
      userAddress,
      price: marketSnapshot.prices[prioritySymbol]?.usd ?? 0,
      reasoning: reasoning,
      stablecoinSymbol,
      balance: balance ?? { symbol: prioritySymbol, rawBalance: BigInt(0), decimals: 18, formatted: 0, isHeld: false },
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
  nextAllowedRunAt = calculateNextRunAt({
    heldCoinCount: heldCoins.length,
    usedLocalAnalyser: analysis.rawResponse.includes('local-analyser'),
    actionTaken,
  })

  return {
    verdicts: analysis.verdicts,
    priorityCoin: prioritySymbol,
    actionTaken,
    reasoning: reasoning,
    newsSnippets,
    loopDurationMs: Date.now() - startTime,
    nextRunAt: nextAllowedRunAt,
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
  balanceUSD: number
}

type RuleCheckResult = {
  allowed: boolean
  reason: string
  swapAmountUSD: number
}

function checkUserRules(params: RuleCheckParams): RuleCheckResult {
  const { symbol, action, verdict, settings, price, balanceUSD } = params

  const isDangerSell = verdict === 'DANGER' && action === 'SELL'
  let setting = settings[symbol]

  if (!setting) {
    if (isDangerSell) {
      // Create a temporary default setting for critical protection
      setting = {
        enabled: true,
        maxSwapUSD: 300,
        dailyLimitUSD: 600,
        minHoldUSD: 100,
        riskSensitivity: 'conservative',
      }
    } else {
      return { allowed: false, reason: `No settings found for ${symbol}`, swapAmountUSD: 0 }
    }
  }

  if (!setting.enabled && !isDangerSell) {
    return { allowed: false, reason: `Monitoring is disabled for ${symbol}`, swapAmountUSD: 0 }
  }

  if (isDangerSell && balanceUSD <= 0) {
    return { allowed: false, reason: `No balance available for ${symbol}`, swapAmountUSD: 0 }
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
  // For danger sells, we want to protect the asset by swapping 100% of maxSwapUSD (swapPercentage = 1.0)
  const swapPercentage = isDangerSell
    ? 1.0
    : setting.riskSensitivity === 'aggressive'
      ? 0.75
      : setting.riskSensitivity === 'moderate'
        ? 0.5
        : 0.25

  const swapAmountUSD = Math.min(setting.maxSwapUSD, setting.maxSwapUSD * swapPercentage)
  const dangerSellAmountUSD = balanceUSD

  if (swapAmountUSD <= 0) {
    return { allowed: false, reason: 'Swap amount is zero', swapAmountUSD: 0 }
  }

  if (price <= 0) {
    return { allowed: false, reason: `Price data unavailable for ${symbol}`, swapAmountUSD: 0 }
  }

  return {
    allowed: true,
    reason: isDangerSell
      ? `Action approved [CRITICAL PROTECTION]: ${action} $${dangerSellAmountUSD.toFixed(2)} of ${symbol} due to DANGER status`
      : `Action approved: ${action} $${swapAmountUSD.toFixed(2)} of ${symbol}`,
    swapAmountUSD: isDangerSell ? dangerSellAmountUSD : swapAmountUSD,
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
  balance: {
    symbol: string
    rawBalance: bigint
    decimals: number
    formatted: number
    isHeld: boolean
  }
}

async function executeSwap(params: ExecuteSwapParams): Promise<AgentAction> {
  const { symbol, action, verdict, amountUSD, userAddress, price, reasoning, stablecoinSymbol, balance } = params

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
          tokenBalanceRaw: balance.rawBalance,
          isNative: symbol === 'ETH',
        })
        : buildBuyWithStable({
          tokenAddress: coin.baseAddress,
          amountInUSD: amountUSD,
          recipient: userAddress,
          stablecoinSymbol,
        })

    const relay = await relayUniswapSwap({
      to: calldata.to,
      data: calldata.data,
      value: calldata.value,
      userAddress,
      chainId: IS_TESTNET ? 11155111 : 1,
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
