import { type NextRequest, NextResponse } from 'next/server'
import { runAgentLoop } from '@/lib/agent-engine'
import { DEFAULT_STABLECOIN, STABLECOINS } from '@/lib/coins'
import type { CoinSettings } from '@/lib/types'

type RequestBody = {
  userAddress: string
  activeCoins: string[]
  coinSettings: CoinSettings
  stablecoinSymbol?: string
  forceRun?: boolean
}

// Rate limiting — prevent more than 1 manual call per minute per address
const callTimestamps = new Map<string, number>()
const MANUAL_COOLDOWN_MS = 60_000

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const {
      userAddress,
      activeCoins,
      coinSettings,
      stablecoinSymbol = DEFAULT_STABLECOIN,
      forceRun = false,
    } = body

    if (!userAddress || !activeCoins?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'userAddress and activeCoins are required',
          code: 'INVALID_PARAMS',
        },
        { status: 400 }
      )
    }

    // Validate stablecoin choice
    if (!STABLECOINS[stablecoinSymbol]) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown stablecoin: ${stablecoinSymbol}. Supported: ${Object.keys(STABLECOINS).join(', ')}`,
          code: 'INVALID_STABLECOIN',
        },
        { status: 400 }
      )
    }

    // Rate limit per user address
    const lastCall = callTimestamps.get(userAddress) ?? 0
    if (!forceRun && Date.now() - lastCall < MANUAL_COOLDOWN_MS) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Wait 1 minute.', code: 'RATE_LIMITED' },
        { status: 429 }
      )
    }

    callTimestamps.set(userAddress, Date.now())

    const result = await runAgentLoop({
      userAddress,
      activeCoins,
      coinSettings,
      stablecoinSymbol,
      forceRun,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[agent] Error:', message)
    return NextResponse.json(
      { success: false, error: message, code: 'AGENT_ERROR' },
      { status: 500 }
    )
  }
}

// Vercel Cron calls GET
export async function GET() {
  return NextResponse.json({
    status: 'Agent endpoint active. Use POST to trigger.',
    supportedStablecoins: Object.keys(STABLECOINS),
  })
}
