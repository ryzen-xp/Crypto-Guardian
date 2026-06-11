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

  // Sub-case 2a: Under stop-loss → ALWAYS swap
  if (pnl.isUnderStopLoss) {
    return {
      should: true,
      reason: `STOP-LOSS TRIGGERED: ${coinSymbol} at $${currentPrice.toFixed(2)} (≤ $${position.protectBelow.toFixed(2)}). Swapping to protect capital.`,
      pnl,
    }
  }

  // Sub-case 2b: In profit + DANGER → swap to lock gains
  if (pnl.pnlUSD > 0 && verdict === 'DANGER') {
    return {
      should: true,
      reason: `LOCK GAINS: ${coinSymbol} at +${pnl.pnlPercent.toFixed(1)}% ($${pnl.pnlUSD.toFixed(2)}). DANGER detected — locking profits.`,
      pnl,
    }
  }

  // Sub-case 2c: In profit + other verdict → hold (no swap)
  if (pnl.pnlUSD > 0 && verdict !== 'DANGER') {
    return {
      should: false,
      reason: `HOLDING: ${coinSymbol} at +${pnl.pnlPercent.toFixed(1)}% ($${pnl.pnlUSD.toFixed(2)}). ${verdict} verdict — staying in position.`,
      pnl,
    }
  }

  // Sub-case 2d: Below entry (loss) but above stop-loss + DANGER → warn, don't swap
  if (pnl.pnlUSD < 0 && verdict === 'DANGER') {
    return {
      should: false,
      reason: `HOLD & ALERT: ${coinSymbol} at -${Math.abs(pnl.pnlPercent).toFixed(1)}% ($${pnl.pnlUSD.toFixed(2)}). DANGER detected but above stop-loss ($${position.protectBelow.toFixed(2)}). User accepted this risk.`,
      pnl,
    }
  }

  // Sub-case 2e: Below entry (loss) but above stop-loss + other verdict → hold
  if (pnl.pnlUSD < 0 && verdict !== 'DANGER') {
    return {
      should: false,
      reason: `HOLD: ${coinSymbol} at -${Math.abs(pnl.pnlPercent).toFixed(1)}% ($${pnl.pnlUSD.toFixed(2)}). ${verdict} verdict — above stop-loss, staying in.`,
      pnl,
    }
  }

  // Default (should not reach here)
  return {
    should: false,
    reason: `No swap: Position analysis inconclusive.`,
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
