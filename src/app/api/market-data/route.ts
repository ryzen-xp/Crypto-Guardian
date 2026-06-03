import { NextResponse } from 'next/server'
import { fetchMarketSnapshot } from '@/lib/market-data'

export async function GET() {
  try {
    const snapshot = await fetchMarketSnapshot()
    return NextResponse.json({ success: true, data: snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[market-data] Error:', message)
    return NextResponse.json(
      { success: false, error: message, code: 'FETCH_ERROR' },
      { status: 500 }
    )
  }
}
