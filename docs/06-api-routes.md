# API Routes

All routes are Next.js 14 Route Handlers under `src/app/api/`.

---

## `GET /api/market-data`

Fetches all current market data in one call.

**Response:**

```typescript
{
  prices: {
    [coinId: string]: {
      usd: number
      usd_1h_change: number
      usd_24h_change: number
    }
  },
  fearGreed: {
    value: number          // 0-100
    label: string          // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
    timestamp: string
  },
  fetchedAt: string        // ISO timestamp
}
```

**Data sources:**

- CoinGecko `/simple/price` — all coin IDs in one request
- alternative.me `/fng/` — Fear & Greed Index

**Caching:** 5-minute revalidation (Next.js fetch cache)

---

## `POST /api/venice-analysis`

Runs Venice AI web search + full analysis.

**Request body:**

```typescript
{
  marketData: MarketData     // from /api/market-data
  activeCoins: string[]      // coins user has enabled
  userSettings: CoinSettings // risk sensitivity per coin
}
```

**Response:**

```typescript
{
  verdicts: {
    [symbol: string]: 'DANGER' | 'CAUTION' | 'NEUTRAL' | 'OPPORTUNITY'
  },
  priorityCoin: string,
  priorityAction: 'BUY' | 'SELL' | 'HOLD',
  reasoning: string,           // 2-sentence guru explanation
  newsSnippets: {
    [symbol: string]: string   // brief news summary per coin
  },
  analyzedAt: string
}
```

**Internal flow:**

1. For each active coin: Venice web_search call (parallelized)
2. Aggregate all news snippets
3. Build full context payload
4. Venice analysis call with system prompt
5. Parse + validate response structure

---

## `POST /api/agent`

Triggers one full agent loop iteration.

**Request body:**

```typescript
{
  userAddress: string
  activeCoins: string[]
  coinSettings: CoinSettings
  forceRun?: boolean           // bypass 15-min cooldown for testing
}
```

**Response:**

```typescript
{
  success: boolean,
  verdicts: VerdictMap,
  priorityCoin: string,
  actionTaken: AgentAction | null,
  reasoning: string,
  nextRunAt: string,           // ISO timestamp
  loopDurationMs: number
}
```

**Internal flow:**

1. Check cooldown (15 min since last run, unless forceRun)
2. Call market-data
3. Call venice-analysis
4. Apply decision logic + user rules check
5. If action needed → call execute-swap
6. Return full loop result

**Cron trigger:** This route is called by Vercel Cron (see `vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/agent",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## `POST /api/execute-swap`

Builds and relays a swap transaction via 1Shot.

**Request body:**

```typescript
{
  userAddress: string,
  fromToken: string,     // token contract address
  toToken: string,       // token contract address
  amountIn: string,      // amount in wei
  minAmountOut: string,  // minimum out (with slippage)
  coinSymbol: string     // for logging
}
```

**Response:**

```typescript
{
  success: boolean,
  relayId: string,       // 1Shot relay ID for webhook tracking
  txHash?: string,       // if already confirmed
  status: 'pending' | 'confirmed' | 'failed',
  estimatedGasUSDC: string
}
```

**Internal flow:**

1. Build Uniswap v3 `exactInputSingle` calldata
2. Get 1Shot fee quote
3. Submit to 1Shot relayer with user's Smart Account
4. Return relay ID for webhook tracking

---

## `POST /api/webhooks`

Receives real-time transaction status updates from 1Shot.

**Request body (1Shot webhook payload):**

```typescript
{
  relayId: string,
  status: 'confirmed' | 'failed',
  txHash: string,
  blockNumber: number,
  gasUsedUSDC: string
}
```

**Response:** `{ received: true }`

**Internal flow:**

1. Validate webhook signature (HMAC)
2. Look up relay ID in pending actions store
3. Update action status (confirmed/failed)
4. Emit to frontend via SSE or update DB record
5. Log final action with tx hash + gas cost

---

## Error Handling Convention

All routes return:

```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: string, code: string }
```

HTTP status codes:

- `200` — success
- `400` — bad request (invalid params)
- `429` — rate limited (Venice or CoinGecko)
- `500` — internal error

All errors logged server-side with full context for debugging.
