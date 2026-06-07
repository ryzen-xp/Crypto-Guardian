import { type NextRequest, NextResponse } from 'next/server'
import { fetchWalletBalances } from '@/lib/balances'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing address', code: 'INVALID_ADDRESS' },
      { status: 400 }
    )
  }

  try {
    const balances = await fetchWalletBalances(address)

    // BigInt cannot be serialised by JSON.stringify — convert to string
    const serialisable = Object.fromEntries(
      Object.entries(balances).map(([symbol, b]) => [
        symbol,
        {
          symbol: b.symbol,
          rawBalance: b.rawBalance.toString(), // BigInt → string
          decimals: b.decimals,
          formatted: b.formatted,
          isHeld: b.isHeld,
        },
      ])
    )

    return NextResponse.json({
      success: true,
      data: {
        address,
        balances: serialisable,
        fetchedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[wallet-balances] Error:', message)
    return NextResponse.json(
      { success: false, error: message, code: 'FETCH_ERROR' },
      { status: 500 }
    )
  }
}
