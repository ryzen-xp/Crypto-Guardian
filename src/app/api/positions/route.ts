import { type NextRequest, NextResponse } from 'next/server'
import { savePosition, getUserPositions, deletePosition, suggestStopLoss } from '@/lib/positions'
import type { Position } from '@/lib/types'

type CreatePositionBody = {
  userId: string
  coinSymbol: string
  entryPrice: number
  quantity: number
  protectBelow?: number // Optional, auto-calculated if not provided
  notes?: string
}

type DeletePositionBody = {
  userId: string
  coinSymbol: string
}

/**
 * GET /api/positions?userId=0x123
 * Get all positions for a user.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId query parameter', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    const positions = await getUserPositions(userId)
    return NextResponse.json({
      success: true,
      data: {
        userId,
        positions,
        count: positions.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[positions] GET error:', message)
    return NextResponse.json(
      { success: false, error: message, code: 'FETCH_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/positions
 * Create or update a position.
 *
 * Body:
 * {
 *   userId: "0x123",
 *   coinSymbol: "ETH",
 *   entryPrice: 1000,
 *   quantity: 1,
 *   protectBelow: 850,  // optional, defaults to -15%
 *   notes: "Bought on dip"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreatePositionBody
    const {
      userId,
      coinSymbol,
      entryPrice,
      quantity,
      protectBelow,
      notes,
    } = body

    if (!userId || !coinSymbol || !entryPrice || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    if (entryPrice <= 0 || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Entry price and quantity must be > 0', code: 'INVALID_VALUES' },
        { status: 400 }
      )
    }

    // Auto-calculate stop-loss if not provided (15% down)
    const finalProtectBelow = protectBelow ?? suggestStopLoss(entryPrice, 15)

    if (finalProtectBelow >= entryPrice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stop-loss must be below entry price',
          code: 'INVALID_STOPLESS',
        },
        { status: 400 }
      )
    }

    const position = await savePosition({
      userId,
      coinSymbol,
      entryPrice,
      quantity,
      boughtAt: new Date(),
      protectBelow: finalProtectBelow,
      source: 'manual',
      notes,
    })

    console.warn(`[positions] Created: ${userId} × ${coinSymbol} @ $${entryPrice}`)

    return NextResponse.json({
      success: true,
      data: {
        position,
        suggestedStopLoss: finalProtectBelow,
        totalCost: quantity * entryPrice,
        message: `Position saved. Stop-loss set at $${finalProtectBelow.toFixed(2)}`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[positions] POST error:', message)
    return NextResponse.json(
      { success: false, error: message, code: 'SAVE_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/positions
 * Delete a position.
 *
 * Body:
 * {
 *   userId: "0x123",
 *   coinSymbol: "ETH"
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as DeletePositionBody
    const { userId, coinSymbol } = body

    if (!userId || !coinSymbol) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or coinSymbol', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    const deleted = await deletePosition(userId, coinSymbol)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: `No position found for ${coinSymbol}`,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      )
    }

    console.warn(`[positions] Deleted: ${userId} × ${coinSymbol}`)

    return NextResponse.json({
      success: true,
      data: {
        message: `Position deleted for ${coinSymbol}`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[positions] DELETE error:', message)
    return NextResponse.json(
      { success: false, error: message, code: 'DELETE_ERROR' },
      { status: 500 }
    )
  }
}
