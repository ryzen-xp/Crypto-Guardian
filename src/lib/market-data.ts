import { COINGECKO_IDS, COINGECKO_ID_TO_SYMBOL } from './coins'
import type { FearGreedData, MarketSnapshot, PriceMap } from './types'

// ─── CoinGecko ────────────────────────────────────────────────────────────────

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'

/**
 * Fetch prices + 1hr/24hr changes for all monitored coins in one request.
 * Returns a map keyed by coin SYMBOL (not coingeckoId).
 */
export async function fetchAllPrices(): Promise<PriceMap> {
  const url =
    `${COINGECKO_BASE_URL}/simple/price` +
    `?ids=${COINGECKO_IDS}` +
    `&vs_currencies=usd` +
    `&include_1h_change=true` +
    `&include_24hr_change=true`

  const res = await fetch(url, {
    next: { revalidate: 60 }, // cache for 60s
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`)
  }

  const raw = (await res.json()) as Record<
    string,
    {
      usd: number
      usd_1h_change: number
      usd_24h_change: number
    }
  >

  // Re-key by symbol
  const prices: PriceMap = {}
  for (const [coingeckoId, data] of Object.entries(raw)) {
    const symbol = COINGECKO_ID_TO_SYMBOL[coingeckoId]
    if (symbol) {
      prices[symbol] = {
        usd: data.usd,
        usd_1h_change: data.usd_1h_change ?? 0,
        usd_24h_change: data.usd_24h_change ?? 0,
      }
    }
  }

  return prices
}

// ─── Fear & Greed Index ───────────────────────────────────────────────────────

const FEAR_GREED_URL = 'https://api.alternative.me/fng/'

export async function fetchFearGreedIndex(): Promise<FearGreedData> {
  const res = await fetch(FEAR_GREED_URL, {
    next: { revalidate: 300 }, // cache for 5 minutes
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Fear & Greed API error: ${res.status} ${res.statusText}`)
  }

  const raw = (await res.json()) as {
    data: Array<{
      value: string
      value_classification: string
      timestamp: string
    }>
  }

  const entry = raw.data[0]
  if (!entry) throw new Error('Fear & Greed API returned empty data')

  return {
    value: parseInt(entry.value, 10),
    label: entry.value_classification,
    timestamp: entry.timestamp,
  }
}

// ─── Combined Snapshot ───────────────────────────────────────────────────────

/**
 * Fetches all market data in parallel.
 * This is the main entry point used by the agent loop.
 */
export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  const [prices, fearGreed] = await Promise.all([fetchAllPrices(), fetchFearGreedIndex()])

  return {
    prices,
    fearGreed,
    fetchedAt: new Date(),
  }
}
