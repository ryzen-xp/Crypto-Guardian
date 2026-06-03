import { type NextRequest, NextResponse } from 'next/server'
import { buildSellToUSDC, buildBuyWithUSDC } from '@/lib/uniswap'
import { relayTransaction } from '@/lib/oneshot'
import { getCoin } from '@/lib/coins'

type RequestBody = {
  userAddress: string
  coinSymbol: string
  action: 'BUY' | 'SELL'
  amountUSD: number
  tokenPriceUSD: number
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const { userAddress, coinSymbol, action, amountUSD, tokenPriceUSD } = body

    if (!userAddress || !coinSymbol || !action || !amountUSD) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    const coin = getCoin(coinSymbol)

    const calldata =
      action === 'SELL'
        ? buildSellToUSDC({
            tokenAddress: coin.baseAddress,
            tokenDecimals: coin.decimals,
            amountInUSD: amountUSD,
            tokenPriceUSD,
            recipient: userAddress,
          })
        : buildBuyWithUSDC({
            tokenAddress: coin.baseAddress,
            amountInUSD: amountUSD,
            recipient: userAddress,
          })

    const relay = await relayTransaction({
      to: calldata.to,
      data: calldata.data,
      userAddress,
      chainId: 8453,
    })

    return NextResponse.json({ success: true, data: relay })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[execute-swap] Error:', message)
    return NextResponse.json(
      { success: false, error: message, code: 'SWAP_ERROR' },
      { status: 500 }
    )
  }
}
