import { type NextRequest, NextResponse } from 'next/server'
import { runAgentLoop } from '@/lib/agent-engine'
import type { CoinSettings } from '@/lib/types'

type RequestBody = {
  userAddress: string
  activeCoins: string[]
  coinSettings: CoinSettings
  forceRun?: boolean
}

// Rate limiting — prevent more than 1 call per minute manually
const callTimestamps = new Map<string, number>()
const MANUAL_COOLDOWN_MS = 60_000

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const { userAddress, activeCoins, coinSettings, forceRun = false } = body

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
  return NextResponse.json({ status: 'Agent endpoint active. Use POST to trigger.' })
}
