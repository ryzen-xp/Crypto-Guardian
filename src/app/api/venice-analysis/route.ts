import { type NextRequest, NextResponse } from 'next/server'
import { fetchMarketSnapshot } from '@/lib/market-data'
import { fetchAllCoinNews, analyzeMarket } from '@/lib/venice'
import { MONITORED_COINS } from '@/lib/coins'
import type { CoinSettings } from '@/lib/types'

type RequestBody = {
  activeCoins: string[]
  userSettings?: CoinSettings
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const { activeCoins, userSettings = {} } = body

    if (!activeCoins?.length) {
      return NextResponse.json(
        { success: false, error: 'activeCoins is required', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    // Fetch market data + news in parallel
    const coinNames = Object.fromEntries(
      activeCoins.map((symbol) => [symbol, MONITORED_COINS[symbol]?.name ?? symbol])
    )

    const [marketSnapshot, newsSnippets] = await Promise.all([
      fetchMarketSnapshot(),
      fetchAllCoinNews(activeCoins, coinNames),
    ])

    // Run Venice AI analysis
    const analysis = await analyzeMarket({
      prices: marketSnapshot.prices,
      fearGreed: marketSnapshot.fearGreed,
      newsSnippets,
      activeCoins,
      userSettings,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        marketSnapshot,
        newsSnippets,
        analyzedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[venice-analysis] Error:', message)
    return NextResponse.json(
      { success: false, error: message, code: 'ANALYSIS_ERROR' },
      { status: 500 }
    )
  }
}
