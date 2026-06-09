import { type NextRequest, NextResponse } from 'next/server'
import { buildSellToStable, buildBuyWithStable } from '@/lib/uniswap'
import { relayUniswapSwap } from '@/lib/oneshot'
import { CHAIN_ID } from '@/lib/chain-config'
import { getCoin, DEFAULT_STABLECOIN, STABLECOINS } from '@/lib/coins'
import { fetchWalletBalances } from '@/lib/balances'

type RequestBody = {
  userAddress: string
  coinSymbol: string
  action: 'BUY' | 'SELL'
  amountUSD: number
  tokenPriceUSD: number
  /** Symbol of the user's chosen stablecoin — defaults to USDC */
  stablecoinSymbol?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const {
      userAddress,
      coinSymbol,
      action,
      amountUSD,
      tokenPriceUSD,
      stablecoinSymbol = DEFAULT_STABLECOIN,
    } = body

    if (!userAddress || !coinSymbol || !action || !amountUSD) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

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

    const coin = getCoin(coinSymbol)
    const walletBalances = await fetchWalletBalances(userAddress)
    const balance = walletBalances[coinSymbol]

    if (action === 'SELL' && !balance?.isHeld) {
      return NextResponse.json(
        {
          success: false,
          error: `No held balance found for ${coinSymbol}. The wallet is already on hold.`,
          code: 'NO_BALANCE',
        },
        { status: 400 }
      )
    }

    const calldata =
      action === 'SELL'
        ? buildSellToStable({
          tokenAddress: coin.baseAddress,
          tokenDecimals: coin.decimals,
          amountInUSD: amountUSD,
          tokenPriceUSD,
          recipient: userAddress,
          stablecoinSymbol,
          tokenBalanceRaw: balance?.rawBalance,
          isNative: coinSymbol === 'ETH',
        })
        : buildBuyWithStable({
          tokenAddress: coin.baseAddress,
          amountInUSD: amountUSD,
          recipient: userAddress,
          stablecoinSymbol,
        })

    const relay = await relayUniswapSwap({
      to: calldata.to,
      data: calldata.data,
      value: calldata.value,
      userAddress,
      chainId: CHAIN_ID,
    })

    console.warn(`[execute-swap] Swap relay successful: ${relay.relayId}`)
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
