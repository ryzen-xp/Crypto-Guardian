/**
 * Position Tracking — Cost Basis Management
 *
 * Stores user entry prices, quantities, and stop-loss levels.
 * Agent uses this to make smarter swap decisions instead of blindly reacting to verdicts.
 *
 * Examples:
 *   - User bought ETH at $1000, set stop-loss at $850
 *   - Agent sees DANGER at $950
 *   - Agent: "You're in profit, holding. Only swap if hits stop-loss"
 *
 *   - User bought ETH at $1000, set stop-loss at $850
 *   - Market crashes to $840
 *   - Agent: "Stop-loss triggered, swapping to protect capital"
 */

import type { Position, PositionWithPnL } from './types'

// ─── In-Memory Position Store (TODO: Replace with database) ──────────────────
// In production, this would be:
// - Persistent database (Supabase, MongoDB)
// - User-authenticated queries
// - Backup/recovery
const positionStore = new Map<string, Position[]>()

// ─── Position Management ──────────────────────────────────────────────────────

/**
 * Save a new position or update existing one.
 */
export async function savePosition(position: Omit<Position, 'id'>): Promise<Position> {
  const id = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const fullPosition: Position = { ...position, id }

  const key = position.userId
  if (!positionStore.has(key)) {
    positionStore.set(key, [])
  }

  // Check if position for this coin already exists
  const userPositions = positionStore.get(key)!
  const existing = userPositions.findIndex((p) => p.coinSymbol === position.coinSymbol)

  if (existing >= 0) {
    // Update existing
    userPositions[existing] = fullPosition
  } else {
    // Add new
    userPositions.push(fullPosition)
  }

  console.log(`[Positions] Saved: ${position.userId} × ${position.coinSymbol}`)
  return fullPosition
}

/**
 * Get position for a specific coin.
 */
export async function getPosition(userId: string, coinSymbol: string): Promise<Position | null> {
  const positions = positionStore.get(userId) || []
  return positions.find((p) => p.coinSymbol === coinSymbol) || null
}

/**
 * Get all positions for a user.
 */
export async function getUserPositions(userId: string): Promise<Position[]> {
  return positionStore.get(userId) || []
}

/**
 * Delete a position.
 */
export async function deletePosition(userId: string, coinSymbol: string): Promise<boolean> {
  const positions = positionStore.get(userId) || []
  const index = positions.findIndex((p) => p.coinSymbol === coinSymbol)

  if (index >= 0) {
    positions.splice(index, 1)
    console.log(`[Positions] Deleted: ${userId} × ${coinSymbol}`)
    return true
  }

  return false
}

// ─── Position Analysis ────────────────────────────────────────────────────────

/**
 * Calculate P&L metrics for a position at current price.
 */
export function calculatePositionPnL(
  position: Position,
  currentPrice: number
): PositionWithPnL {
  const totalValueUSD = position.quantity * currentPrice
  const totalCostUSD = position.quantity * position.entryPrice
  const pnlUSD = totalValueUSD - totalCostUSD
  const pnlPercent = (pnlUSD / totalCostUSD) * 100

  return {
    ...position,
    currentPrice,
    totalValueUSD,
    totalCostUSD,
    pnlUSD,
    pnlPercent,
    isUnderStopLoss: currentPrice <= position.protectBelow,
  }
}

/**
 * Format position for terminal display.
 */
export function formatPosition(posWithPnL: PositionWithPnL): string {
  const pnlColor = posWithPnL.pnlUSD >= 0 ? '🟢' : '🔴'
  const stopLossWarning = posWithPnL.isUnderStopLoss ? ' ⚠️ STOP-LOSS TRIGGERED' : ''

  return (
    `${posWithPnL.coinSymbol}: Bought $${posWithPnL.entryPrice.toFixed(2)} → ` +
    `Now $${posWithPnL.currentPrice.toFixed(2)} | ` +
    `P&L: ${pnlColor} $${posWithPnL.pnlUSD.toFixed(2)} (${posWithPnL.pnlPercent.toFixed(1)}%)` +
    `${stopLossWarning}`
  )
}

// ─── Smart Swap Decision Logic ────────────────────────────────────────────────

/**
 * Determine if agent should swap based on verdict + position P&L.
 *
 * CRITICAL RULE: NEVER ALLOW LOSSES
 * ================================
 * User's entry price = HARD FLOOR (never sell below this)
 * Only swap if:
 * 1. Price goes UP (profit) and market is DANGER
 * 2. Price hits stop-loss AND we're protected by entry price
 *
 * PROTECTION FLOW:
 * 1. User buys 1 WETH at $1500 (entry price = floor)
 * 2. Stop-loss set at $1275 (15% down from entry)
 * 3. If price crashes below $1275 → SWAP immediately
 * 4. If price crashes below $1500 (entry) → HOLD, never sell at loss
 * 5. If price goes UP to $2000 → Check market trend
 *    - If trend BAD (DANGER) → Swap at $2000 (profit locked)
 *    - New position becomes $2000 entry (new floor)
 * 6. From $2000, protect again (new stop-loss = $1700)
 *
 * Returns:
 *   true  → Execute swap
 *   false → Hold / don't swap
 *   reason → Why decision was made
 */
export async function shouldSwapBasedOnPosition(
  userId: string,
  coinSymbol: string,
  verdict: 'DANGER' | 'CAUTION' | 'NEUTRAL' | 'OPPORTUNITY',
  currentPrice: number
): Promise<{
  should: boolean
  reason: string
  pnl?: PositionWithPnL
}> {
  // Case 1: No position tracked — use verdict as-is
  const position = await getPosition(userId, coinSymbol)
  if (!position) {
    const shouldSwap = verdict === 'DANGER'
    return {
      should: shouldSwap,
      reason: shouldSwap
        ? `No position tracked. DANGER verdict triggers swap.`
        : `No position tracked. ${verdict} verdict — no swap.`,
    }
  }

  // Case 2: Position tracked — analyze P&L
  const pnl = calculatePositionPnL(position, currentPrice)

  // CRITICAL: Never sell at a loss (below entry price)
  const atOrBelowEntry = currentPrice <= position.entryPrice
  
  // Sub-case 2a: Under stop-loss BUT above entry → swap to protect
  if (pnl.isUnderStopLoss && !atOrBelowEntry) {
    return {
      should: true,
      reason: `🛑 STOP-LOSS TRIGGERED: ${coinSymbol} at $${currentPrice.toFixed(2)} (≤ $${position.protectBelow.toFixed(2)}). Swapping to USDC to protect capital.`,
      pnl,
    }
  }

  // Sub-case 2b: At or below entry price → NEVER SELL (hold no matter what)
  if (atOrBelowEntry) {
    return {
      should: false,
      reason: `🔒 LOCKED FLOOR: ${coinSymbol} at -${Math.abs(pnl.pnlPercent).toFixed(1)}% ($${pnl.pnlUSD.toFixed(2)} loss). AT OR BELOW ENTRY ($${position.entryPrice.toFixed(2)}). NEVER SELLING AT LOSS. Holding to recover.`,
      pnl,
    }
  }

  // Sub-case 2c: In profit + DANGER market trend → swap to lock gains
  if (pnl.pnlUSD > 0 && verdict === 'DANGER') {
    return {
      should: true,
      reason: `💰 LOCK GAINS: ${coinSymbol} is +${pnl.pnlPercent.toFixed(1)}% ($${pnl.pnlUSD.toFixed(2)} profit). Market shows DANGER — swapping to USDC at $${currentPrice.toFixed(2)}. Profit secured!`,
      pnl,
    }
  }

  // Sub-case 2d: In profit + stable market → hold for more upside
  if (pnl.pnlUSD > 0 && verdict !== 'DANGER') {
    return {
      should: false,
      reason: `📈 HOLDING FOR MORE: ${coinSymbol} at +${pnl.pnlPercent.toFixed(1)}% ($${pnl.pnlUSD.toFixed(2)} profit). Market is ${verdict} — staying in position. Stop-loss at $${position.protectBelow.toFixed(2)}.`,
      pnl,
    }
  }

  // Sub-case 2e: Breakeven (within 1%) → hold for more upside
  if (Math.abs(pnl.pnlPercent) <= 1) {
    return {
      should: false,
      reason: `⏸️  HOLDING: ${coinSymbol} at breakeven (±${pnl.pnlPercent.toFixed(1)}%). Waiting for clearer market direction. Stop-loss at $${position.protectBelow.toFixed(2)}.`,
      pnl,
    }
  }

  // Default (should not reach here)
  return {
    should: false,
    reason: `NEUTRAL: ${coinSymbol} held. Floor protection at entry $${position.entryPrice.toFixed(2)}, Stop-loss at $${position.protectBelow.toFixed(2)}.`,
    pnl,
  }
}

// ─── Default Stop-Loss Calculation ────────────────────────────────────────────

/**
 * Suggest a default stop-loss based on entry price.
 * Common: 10-15% down from entry.
 */
export function suggestStopLoss(entryPrice: number, percentDown: number = 15): number {
  return entryPrice * (1 - percentDown / 100)
}

// ─── Record Swap & Update Position ────────────────────────────────────────────

/**
 * When a swap happens, record it and create a new position entry.
 *
 * Flow:
 * 1. User bought WETH at $1500
 * 2. Price went to $2000 (profit $500)
 * 3. AI swapped to USDC at $2000
 * 4. Call recordSwap(userId, 'WETH', swapPrice=$2000, quantity=1)
 * 5. New position: entry=$2000, quantity=1, protectBelow=$1700 (15% down from $2000)
 */
export async function recordSwap(
  userId: string,
  coinSymbol: string,
  swapPrice: number,
  quantity: number
): Promise<Position | null> {
  // Delete old position
  await deletePosition(userId, coinSymbol)

  // Create new position at swap price as new entry point
  const newPosition: Omit<Position, 'id'> = {
    userId,
    coinSymbol,
    quantity,
    entryPrice: swapPrice, // New entry is the swap price
    protectBelow: suggestStopLoss(swapPrice, 15), // 15% stop-loss from new entry
    boughtAt: new Date(),
    source: 'import', // Marked as imported (from swap action)
    notes: `Swapped at $${swapPrice.toFixed(2)}. New protection baseline.`,
  }

  return savePosition(newPosition)
}

