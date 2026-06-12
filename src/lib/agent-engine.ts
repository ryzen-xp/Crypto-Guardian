import crypto from 'crypto'
import { getCoin, MONITORED_COINS } from './coins'
import { fetchWalletBalances } from './balances'
import { fetchMarketSnapshot } from './market-data'
import { fetchAllCoinNews, analyzeMarket } from './venice'
import { buildSellToStable, buildBuyWithStable } from './uniswap'
import { relayUniswapSwap } from './oneshot'
import type { Delegation7710 } from './oneshot'
import { IS_TESTNET } from './chain-config'
import { shouldSwapBasedOnPosition, getUserPositions, calculatePositionPnL } from './positions'
import type { AgentAction, AgentLoopResult, CoinSettings, TerminalLine, TerminalLineType, Verdict } from './types'

// ─── Cooldown intervals ────────────────────────────────────────────────────────
const INTERVAL_DANGER_MS        = 30  * 1000   //  30s  — DANGER assets re-checked urgently
const INTERVAL_CAUTION_MS       = 60  * 1000   //  60s  — CAUTION warrants close watch
const INTERVAL_OPPORTUNITY_MS   = 75  * 1000   //  75s  — OPPORTUNITY tracked closely
const INTERVAL_NEUTRAL_MS       = 100 * 1000   // 100s  — stable assets, lower priority
const LOCAL_ANALYZER_BACKOFF_MS = 5   * 60 * 1000
const HOLDING_EMPTY_BACKOFF_MS  = 60  * 60 * 1000
const FAILED_SWAP_BACKOFF_MS    = 5   * 60 * 1000
const SINGLE_DRAIN_BACKOFF_MS   = 30  * 60 * 1000

let lastRunAt: Date | null = null
let nextAllowedRunAt: Date | null = null

// ─── Per-coin priority scores (persist between scans in same server session) ──
// 4 = DANGER (re-check most urgently), 3 = OPPORTUNITY, 2 = CAUTION, 1 = NEUTRAL
const coinPriorityScores: Record<string, number> = {}

export function getLastRunAt(): Date | null { return lastRunAt }
export function getNextRunAt(): Date { return nextAllowedRunAt ?? new Date() }
export function isOnCooldown(): boolean {
  if (!nextAllowedRunAt) return false
  return Date.now() < nextAllowedRunAt.getTime()
}

function verdictToPriority(verdict: Verdict): number {
  return verdict === 'DANGER' ? 4 : verdict === 'OPPORTUNITY' ? 3 : verdict === 'CAUTION' ? 2 : 1
}

/** Sort coins so highest-priority (most risky from last scan) go first */
function sortByPriority(coins: string[]): string[] {
  return [...coins].sort((a, b) => (coinPriorityScores[b] ?? 1) - (coinPriorityScores[a] ?? 1))
}

function worstVerdict(verdicts: Record<string, Verdict>, coins: string[]): Verdict {
  const order: Verdict[] = ['DANGER', 'OPPORTUNITY', 'CAUTION', 'NEUTRAL']
  for (const v of order) {
    if (coins.some((s) => verdicts[s] === v)) return v
  }
  return 'NEUTRAL'
}

function calculateNextRunAt(params: {
  usedLocalAnalyser: boolean
  actionTaken: AgentAction | null
  worst: Verdict
}): Date {
  const now = Date.now()
  if (params.actionTaken?.status === 'failed') return new Date(now + FAILED_SWAP_BACKOFF_MS)
  if (params.usedLocalAnalyser) return new Date(now + LOCAL_ANALYZER_BACKOFF_MS)

  // Priority-adaptive intervals
  if (params.worst === 'DANGER')      return new Date(now + INTERVAL_DANGER_MS)
  if (params.worst === 'CAUTION')     return new Date(now + INTERVAL_CAUTION_MS)
  if (params.worst === 'OPPORTUNITY') return new Date(now + INTERVAL_OPPORTUNITY_MS)
  return new Date(now + INTERVAL_NEUTRAL_MS)
}

// ─── Terminal log builder ──────────────────────────────────────────────────────

function makeLogger() {
  const lines: TerminalLine[] = []
  let seq = 0
  const add = (type: TerminalLineType, content: string, coin?: string) => {
    lines.push({ id: `${Date.now()}-${++seq}`, ts: new Date().toISOString(), type, content, coin })
  }
  return { add, lines: () => lines }
}

// ─── Agent Loop ───────────────────────────────────────────────────────────────

type AgentLoopParams = {
  userAddress: string
  activeCoins: string[]
  coinSettings: CoinSettings
  stablecoinSymbol: string
  forceRun?: boolean
  delegations?: Delegation7710[] | null
}

export async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult> {
  const { userAddress, activeCoins, coinSettings, stablecoinSymbol, forceRun = false, delegations = null } = params

  if (!forceRun && isOnCooldown()) {
    throw new Error(`Agent is on cooldown. Next run at: ${getNextRunAt().toISOString()}`)
  }

  const startTime = Date.now()
  const log = makeLogger()

  // ── Step 0: Get prices first ────────────────────────────────────────────────
  const marketSnapshot = await fetchMarketSnapshot()
  const { fearGreed } = marketSnapshot

  // ── Balances (with USD threshold check) ──────────────────────────────────────
  const walletBalances = await fetchWalletBalances(userAddress, marketSnapshot.prices)

  // ── Sort coins by priority (most risky from last scan → first) ──────────────
  const orderedCoins = sortByPriority(activeCoins)

  // ── Step 1: Market data ──────────────────────────────────────────────────────

  log.add('header', '═══ CryptoGuardian Agent Scan ═══')
  log.add('system', `Network: ${IS_TESTNET ? 'Ethereum Sepolia (testnet)' : 'Ethereum Mainnet'}`)
  log.add('system', `Fear & Greed Index: ${fearGreed.value}/100 (${fearGreed.label})`)
  log.add('system', `Assets to scan: ${orderedCoins.length} — ordered by risk priority`)

  const queueStr = orderedCoins
    .map((s) => {
      const score = coinPriorityScores[s] ?? 1
      const tag = score === 4 ? ' [!DANGER]' : score === 3 ? ' [OPP]' : score === 2 ? ' [CAUTION]' : ''
      return `${s}${tag}`
    })
    .join(' → ')
  log.add('info', `Priority queue: ${queueStr}`)
  log.add('system', '─'.repeat(48))

  // ── Step 2: News — fetched per-coin sequentially ────────────────────────────
  const coinNames = Object.fromEntries(
    activeCoins.map((s) => [s, MONITORED_COINS[s]?.name ?? s])
  )
  const newsSnippets: Record<string, string> = {}
  for (const symbol of orderedCoins) {
    log.add('info', `Fetching news & market context...`, symbol)
    const batchResult = await import('./venice').then(m =>
      m.fetchAllCoinNews([symbol], coinNames)
    )
    newsSnippets[symbol] = batchResult[symbol] ?? `No news for ${symbol}.`
    const snippet = newsSnippets[symbol]
    if (snippet && !snippet.startsWith('No ')) {
      const preview = snippet.length > 100 ? snippet.slice(0, 100) + '…' : snippet
      log.add('ai', `📰 ${preview}`, symbol)
    }
  }

  log.add('system', '─'.repeat(48))
  log.add('info', 'Running AI analysis across all assets...')

  // ── Step 3: AI Analysis (one batch call for all coins) ──────────────────────
  const analysis = await analyzeMarket({
    prices: marketSnapshot.prices,
    fearGreed,
    newsSnippets,
    activeCoins: orderedCoins,
    userSettings: coinSettings,
  })

  const usedLocalAnalyser = analysis.rawResponse.includes('local-analyser')
  const providerMatch = analysis.rawResponse.match(/\[provider:([^\]]+)\]/)
  const providerUsed = providerMatch?.[1] ?? (usedLocalAnalyser ? 'Local Rule Engine' : 'Unknown')

  let veniceWarning: string | undefined
  if (usedLocalAnalyser) {
    veniceWarning = 'All AI providers unavailable — verdicts calculated from price momentum and Fear & Greed index.'
    log.add('warning', `⚠ AI providers unavailable — using local price-momentum analysis`)
  } else if (providerUsed && providerUsed !== 'Venice AI') {
    veniceWarning = `Venice AI unavailable — analysis provided by ${providerUsed} (free tier).`
    log.add('warning', `ℹ Venice AI unavailable — using ${providerUsed}`)
  } else {
    log.add('success', `✓ Venice AI analysis complete (${providerUsed})`)
  }

  // ── Step 4: Per-coin result logging & priority update ───────────────────────
  log.add('system', '─'.repeat(48))

  const perCoinReasoning: Record<string, string> = {}
  const newPriorities: Record<string, number> = {}

  for (const symbol of orderedCoins) {
    const verdict = analysis.verdicts[symbol] ?? 'NEUTRAL'
    const price = marketSnapshot.prices[symbol]
    const prevScore = coinPriorityScores[symbol] ?? 1
    const newScore = verdictToPriority(verdict)
    newPriorities[symbol] = newScore

    const verdictIcon = verdict === 'DANGER' ? '🔴' : verdict === 'OPPORTUNITY' ? '🟢' : verdict === 'CAUTION' ? '🟡' : '⚪'
    const verdictType: TerminalLineType =
      verdict === 'DANGER' ? 'error' : verdict === 'OPPORTUNITY' ? 'success' : verdict === 'CAUTION' ? 'warning' : 'info'

    if (price) {
      const h1 = (price.usd_1h_change >= 0 ? '+' : '') + price.usd_1h_change.toFixed(2) + '%'
      const h24 = (price.usd_24h_change >= 0 ? '+' : '') + price.usd_24h_change.toFixed(2) + '%'
      log.add('info', `$${price.usd.toLocaleString('en-US', { maximumFractionDigits: 4 })} | 1h: ${h1} | 24h: ${h24}`, symbol)
    }

    // Escalation/de-escalation notice
    if (newScore > prevScore && prevScore > 0) {
      log.add('warning', `⬆ Risk escalated: ${scoreToLabel(prevScore)} → ${verdict}`, symbol)
    } else if (newScore < prevScore && prevScore >= 4) {
      log.add('success', `⬇ Risk de-escalated from DANGER → ${verdict}`, symbol)
    }

    log.add(verdictType, `${verdictIcon} VERDICT: ${verdict}`, symbol)

    // Per-coin reasoning (use main reasoning for priority coin, auto-generate for others)
    if (symbol === analysis.priorityCoin) {
      perCoinReasoning[symbol] = analysis.reasoning
    } else if (price) {
      const h1 = price.usd_1h_change.toFixed(2)
      const h24 = price.usd_24h_change.toFixed(2)
      perCoinReasoning[symbol] = `${symbol} showing ${verdict.toLowerCase()} signal — ${h1}% in 1h, ${h24}% in 24h. F&G: ${fearGreed.value} (${fearGreed.label}). ${verdict === 'NEUTRAL' ? 'No action required.' : verdict === 'CAUTION' ? 'Monitor closely.' : verdict === 'DANGER' ? 'Capital protection recommended.' : 'Positive momentum noted.'}`
    } else {
      perCoinReasoning[symbol] = `${symbol} verdict: ${verdict}. Price data unavailable.`
    }

    // Extra monitoring note for high-priority coins
    if (newScore >= 4) {
      log.add('warning', `⚡ HIGH PRIORITY — will re-check in 30s`, symbol)
    } else if (newScore <= 1 && prevScore <= 1) {
      log.add('info', `→ Stable — lower monitoring frequency applied`, symbol)
    }

    log.add('system', '─'.repeat(48))

    // Update persistent priority scores
    coinPriorityScores[symbol] = newScore
  }

  // ── Step 5: Priority summary ─────────────────────────────────────────────────
  const rankedStr = [...orderedCoins]
    .sort((a, b) => (newPriorities[b] ?? 1) - (newPriorities[a] ?? 1))
    .map((s) => `${s}(${newPriorities[s] ?? 1})`)
    .join(' > ')
  log.add('system', `Priority ranking: ${rankedStr}`)

  // ── Step 6: Action selection (with position-based logic) ──────────────────────
  let prioritySymbol = analysis.priorityCoin
  let priorityVerdict = analysis.verdicts[prioritySymbol] ?? 'NEUTRAL'
  let priorityAction = analysis.priorityAction
  let reasoning = analysis.reasoning

  const dangerCoin = orderedCoins.find((s) => analysis.verdicts[s] === 'DANGER')
  if (dangerCoin) {
    prioritySymbol = dangerCoin; priorityVerdict = 'DANGER'; priorityAction = 'SELL'
    
    // Check position-based swap decision
    const positionDecision = await shouldSwapBasedOnPosition(
      userAddress,
      dangerCoin,
      'DANGER',
      marketSnapshot.prices[dangerCoin]?.usd ?? 0
    )

    reasoning = positionDecision.reason
    priorityAction = positionDecision.should ? 'SELL' : 'HOLD'

    if (positionDecision.should) {
      log.add('error', `🚨 CRITICAL: ${dangerCoin} — ${reasoning}`)
    } else {
      log.add('warning', `⚠️ ALERT: ${dangerCoin} — ${reasoning}`)
    }
  }

  const ruleCheck = checkUserRules({
    symbol: prioritySymbol, action: priorityAction, verdict: priorityVerdict,
    settings: coinSettings,
    price: marketSnapshot.prices[prioritySymbol]?.usd ?? 0,
    balanceUSD: (walletBalances[prioritySymbol]?.formatted ?? 0) * (marketSnapshot.prices[prioritySymbol]?.usd ?? 0),
  })

  // ── Step 7: Execute swap if warranted ────────────────────────────────────────
  let actionTaken: AgentAction | null = null

  if (ruleCheck.allowed && priorityAction !== 'HOLD') {
    const balance = walletBalances[prioritySymbol]
    const amtUSD = priorityAction === 'SELL'
      ? (balance?.formatted ?? 0) * (marketSnapshot.prices[prioritySymbol]?.usd ?? 0)
      : ruleCheck.swapAmountUSD
    log.add('warning', `Executing ${priorityAction} $${amtUSD.toFixed(2)} of ${prioritySymbol} → ${stablecoinSymbol}...`)

    actionTaken = await executeSwap({
      symbol: prioritySymbol, action: priorityAction, verdict: priorityVerdict,
      amountUSD: amtUSD, userAddress,
      price: marketSnapshot.prices[prioritySymbol]?.usd ?? 0,
      reasoning, stablecoinSymbol,
      balance: balance ?? { symbol: prioritySymbol, rawBalance: BigInt(0), decimals: 18, formatted: 0, isHeld: false },
      delegations,
    })

    if (actionTaken.status === 'confirmed') {
      log.add('success', `✓ Swap confirmed${actionTaken.txHash ? ` — tx: ${actionTaken.txHash.slice(0, 20)}…` : ''}`)
    } else if (actionTaken.status === 'failed') {
      log.add('error', `✗ Swap failed — will retry in 5 minutes`)
    } else {
      log.add('info', `⏳ Swap pending — ${actionTaken.txHash ?? 'awaiting confirmation'}`)
    }
  } else {
    actionTaken = {
      id: crypto.randomUUID(), timestamp: new Date(),
      coin: prioritySymbol, verdict: priorityVerdict,
      action: 'SKIPPED', amountUSD: 0,
      reasoning: ruleCheck.reason, status: 'skipped',
    }
    log.add('info', `No swap executed — ${ruleCheck.reason}`)
  }

  // ── Finalize ─────────────────────────────────────────────────────────────────
  const worst = worstVerdict(analysis.verdicts, orderedCoins)
  const durationMs = Date.now() - startTime

  lastRunAt = new Date()
  nextAllowedRunAt = calculateNextRunAt({
    usedLocalAnalyser,
    actionTaken,
    worst,
  })

  const nextMs = nextAllowedRunAt.getTime() - Date.now()
  const nextSec = Math.round(nextMs / 1000)
  log.add('system', `Next scan in ${nextSec}s (worst verdict: ${worst})`)
  log.add('system', `Scan complete in ${(durationMs / 1000).toFixed(1)}s`)

  return {
    verdicts: analysis.verdicts,
    priorityCoin: prioritySymbol,
    actionTaken,
    reasoning,
    newsSnippets,
    loopDurationMs: durationMs,
    nextRunAt: nextAllowedRunAt,
    ranAt: lastRunAt,
    stablecoinUsed: stablecoinSymbol,
    veniceWarning,
    terminalLogs: log.lines(),
    perCoinReasoning,
    coinPriorities: newPriorities,
  }
}

function scoreToLabel(score: number): string {
  return score === 4 ? 'DANGER' : score === 3 ? 'OPPORTUNITY' : score === 2 ? 'CAUTION' : 'NEUTRAL'
}

// ─── User Rules Check ─────────────────────────────────────────────────────────

type RuleCheckParams = {
  symbol: string; action: 'BUY' | 'SELL' | 'HOLD'; verdict: Verdict
  settings: CoinSettings; price: number; balanceUSD: number
}
type RuleCheckResult = { allowed: boolean; reason: string; swapAmountUSD: number }

function checkUserRules(params: RuleCheckParams): RuleCheckResult {
  const { symbol, action, verdict, settings, price, balanceUSD } = params
  const isDangerSell = verdict === 'DANGER' && action === 'SELL'
  let setting = settings[symbol]

  if (!setting) {
    if (isDangerSell) {
      setting = { enabled: true, maxSwapUSD: 300, dailyLimitUSD: 600, minHoldUSD: 100, riskSensitivity: 'conservative' }
    } else {
      return { allowed: false, reason: `No settings found for ${symbol}`, swapAmountUSD: 0 }
    }
  }

  if (!setting.enabled && !isDangerSell)
    return { allowed: false, reason: `Monitoring disabled for ${symbol}`, swapAmountUSD: 0 }
  if (isDangerSell && balanceUSD <= 0)
    return { allowed: false, reason: `No balance available for ${symbol}`, swapAmountUSD: 0 }
  if (setting.riskSensitivity === 'conservative' && action === 'SELL' && verdict !== 'DANGER')
    return { allowed: false, reason: `Conservative mode: only acting on DANGER, current verdict is ${verdict}`, swapAmountUSD: 0 }
  if (setting.riskSensitivity === 'conservative' && action === 'BUY')
    return { allowed: false, reason: 'Conservative mode: buy actions disabled', swapAmountUSD: 0 }
  if (setting.riskSensitivity === 'moderate' && action === 'BUY')
    return { allowed: false, reason: 'Moderate mode: buy actions disabled. Set Aggressive to enable.', swapAmountUSD: 0 }
  if (price <= 0)
    return { allowed: false, reason: `Price data unavailable for ${symbol}`, swapAmountUSD: 0 }

  const swapPct = isDangerSell ? 1.0 : setting.riskSensitivity === 'aggressive' ? 0.75 : setting.riskSensitivity === 'moderate' ? 0.5 : 0.25
  const swapAmountUSD = Math.min(setting.maxSwapUSD, setting.maxSwapUSD * swapPct)
  if (swapAmountUSD <= 0)
    return { allowed: false, reason: 'Swap amount is zero', swapAmountUSD: 0 }

  const dangerSellAmt = balanceUSD
  return {
    allowed: true,
    reason: isDangerSell
      ? `Action approved [CRITICAL PROTECTION]: ${action} $${dangerSellAmt.toFixed(2)} of ${symbol} due to DANGER status`
      : `Action approved: ${action} $${swapAmountUSD.toFixed(2)} of ${symbol}`,
    swapAmountUSD: isDangerSell ? dangerSellAmt : swapAmountUSD,
  }
}

// ─── Execute Swap ─────────────────────────────────────────────────────────────

type ExecuteSwapParams = {
  symbol: string; action: 'BUY' | 'SELL'; verdict: Verdict; amountUSD: number
  userAddress: string; price: number; reasoning: string; stablecoinSymbol: string
  balance: { symbol: string; rawBalance: bigint; decimals: number; formatted: number; isHeld: boolean }
  delegations?: Delegation7710[] | null
}

async function executeSwap(params: ExecuteSwapParams): Promise<AgentAction> {
  const { symbol, action, verdict, amountUSD, userAddress, price, reasoning, stablecoinSymbol, balance, delegations = null } = params
  const coin = getCoin(symbol)

  try {
    // Check if user has granted permission (delegations present)
    if (!delegations || delegations.length === 0) {
      console.error(`[Agent] No delegations provided for ${userAddress} - swap blocked`)
      return {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        coin: symbol,
        verdict,
        action,
        amountUSD,
        reasoning: `⚠️ No relayer permission granted. Please grant permission in Settings before swaps can execute.`,
        status: 'failed',
      }
    }

    const calldata = action === 'SELL'
      ? buildSellToStable({
          tokenAddress: coin.baseAddress, tokenDecimals: coin.decimals,
          amountInUSD: amountUSD, tokenPriceUSD: price,
          recipient: userAddress, stablecoinSymbol,
          tokenBalanceRaw: balance.rawBalance, isNative: symbol === 'ETH',
        })
      : buildBuyWithStable({ tokenAddress: coin.baseAddress, amountInUSD: amountUSD, recipient: userAddress, stablecoinSymbol })

    // Use the first (should be only) delegation
    const signedDelegation = delegations[0]

    const relay = await relayUniswapSwap({
      to: calldata.to, data: calldata.data, value: calldata.value,
      userAddress, chainId: IS_TESTNET ? 11155111 : 1,
      signedDelegation,
    })

    // If swap is confirmed/pending, update position
    if (relay.status === 'confirmed' || relay.status === 'pending') {
      if (action === 'SELL') {
        // SELL: Record that we exited and created new USDC position at current price
        const { recordSwap } = await import('./positions')
        await recordSwap(userAddress, symbol, price, amountUSD / price)
        console.log(`[Position] Recorded SELL at $${price.toFixed(2)} for ${symbol}. New entry baseline: $${price.toFixed(2)}`)
      }
    }

    return {
      id: crypto.randomUUID(), timestamp: new Date(),
      coin: symbol, verdict, action, amountUSD, reasoning,
      txHash: relay.txHash, relayId: relay.relayId,
      status: relay.status === 'confirmed' ? 'confirmed' : 'pending',
    }
  } catch (err) {
    console.error(`Swap execution failed for ${symbol}:`, err instanceof Error ? err.message : String(err))
    return { id: crypto.randomUUID(), timestamp: new Date(), coin: symbol, verdict, action, amountUSD, reasoning, status: 'failed' }
  }
}
