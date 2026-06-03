# Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                    │
│                                                                 │
│  Landing → Setup → Dashboard → Coin Detail → Settings          │
│                                                                 │
│  Components: VerdictGrid | PriorityCoin | AgentFeed | CoinCard  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ API Routes
┌──────────────────────────▼──────────────────────────────────────┐
│                      NEXT.JS API ROUTES                         │
│                                                                 │
│  /api/agent          → Agent core loop trigger (cron/manual)   │
│  /api/market-data    → CoinGecko + Fear & Greed fetch          │
│  /api/venice-analysis→ Venice AI web search + analysis calls   │
│  /api/execute-swap   → Build + relay swap transaction          │
│  /api/webhooks       → 1Shot webhook receiver                  │
└────┬──────────────┬──────────────┬──────────────┬──────────────┘
     │              │              │              │
┌────▼────┐   ┌─────▼─────┐  ┌───▼────┐   ┌────▼──────┐
│CoinGecko│   │ Venice AI │  │MetaMask│   │ 1Shot API │
│  API    │   │  API      │  │Smart   │   │ Relayer   │
│(prices) │   │(llama-70b)│  │Account │   │(gas relay)│
└─────────┘   └───────────┘  └───┬────┘   └───────────┘
                                  │
                           ┌──────▼──────┐
                           │ Uniswap v3  │
                           │  (Base)     │
                           └─────────────┘
```

---

## Agent Core Loop (Every 15 Minutes)

```
START LOOP
    │
    ▼
1. Fetch all coin prices (CoinGecko)
   + 1hr % change for all monitored coins
    │
    ▼
2. Fetch Fear & Greed Index (alternative.me)
    │
    ▼
3. Venice AI web_search call
   → "crypto news last 1 hour [coin name]" × each active coin
    │
    ▼
4. Build full market context payload
   [prices + changes + fear/greed + news summaries]
    │
    ▼
5. Venice AI analysis call (llama-3.3-70b)
   → System: "Senior crypto risk analyst, 15yr experience..."
   → Returns: verdict per coin + priority coin + reasoning
    │
    ▼
6. Parse Venice response
   → Extract: DANGER / CAUTION / NEUTRAL / OPPORTUNITY per coin
   → Extract: priority coin + 2-sentence guru reasoning
    │
    ▼
7. Check user rules for priority coin
   → Is monitoring ON?
   → Would action exceed single swap limit?
   → Would action exceed daily limit?
   → Would result go below minimum hold?
    │
    ▼
8. Decision gate
   ├── DANGER → swap [coin] → USDC (if within limits)
   ├── OPPORTUNITY → swap USDC → [coin] (if within limits + user enabled)
   ├── CAUTION / NEUTRAL → log and skip
   └── Limits exceeded → log warning, skip
    │
    ▼
9. If swap needed:
   → Build Uniswap v3 swap calldata
   → Submit to 1Shot Relayer (gas in USDC)
   → Wait for webhook confirmation
    │
    ▼
10. Log decision to dashboard
    → Verdict grid update
    → AI reasoning stored
    → Action logged to feed
    │
    ▼
END LOOP (wait 15 min)
```

---

## Data Flow: Venice AI

### Call 1 — Web Search (per coin, batched)

```json
POST https://api.venice.ai/api/v1/chat/completions
{
  "model": "llama-3.3-70b",
  "tools": [{ "type": "web_search" }],
  "messages": [{
    "role": "user",
    "content": "Search for: crypto news last 1 hour ETH Ethereum price action"
  }]
}
```

### Call 2 — Full Analysis

```json
POST https://api.venice.ai/api/v1/chat/completions
{
  "model": "llama-3.3-70b",
  "messages": [
    {
      "role": "system",
      "content": "You are a senior crypto risk analyst with 15 years experience watching volatile markets. You monitor multiple EVM coins simultaneously like a trading desk. Analyze the data provided and for each coin give a verdict: DANGER / CAUTION / NEUTRAL / OPPORTUNITY. Then identify the ONE coin needing immediate action and explain in 2 sentences using guru-level insight. Never predict exact prices. Assess momentum and risk only."
    },
    {
      "role": "user",
      "content": "[full market context JSON with prices, changes, fear/greed, news]"
    }
  ]
}
```

### Expected Venice Response Structure

```json
{
  "verdicts": {
    "ETH": "NEUTRAL",
    "ARB": "DANGER",
    "LINK": "OPPORTUNITY",
    "UNI": "CAUTION",
    "AAVE": "NEUTRAL"
  },
  "priority_coin": "ARB",
  "priority_action": "SELL",
  "reasoning": "ARB has dropped 15% in 1 hour following negative governance news and elevated Fear index at 22. Momentum indicators suggest continued downside — moving to USDC protects capital before further deterioration."
}
```

---

## MetaMask Smart Accounts Flow

```
User connects wallet
        │
        ▼
Upgrade to Smart Account (EIP-7702 via 1Shot)
        │
        ▼
Grant permissions ONCE (ERC-7715)
  - ERC20 transfer: each coin token
  - ERC20 transfer: USDC
  - Daily spending cap per coin (set by user)
  - Expiry: 30 days
        │
        ▼
Agent uses granted permissions for all future swaps
(no popups, no manual signing required)
        │
        ▼
Day 30: prompt user to renew permissions
```

---

## 1Shot Relayer Flow

```
Agent builds swap calldata
        │
        ▼
POST /api/execute-swap
  → encodes Uniswap v3 swap
  → wraps in 1Shot relay request
        │
        ▼
1Shot API receives request
  → pays gas in USDC from user's Smart Account
  → broadcasts to Base mainnet
        │
        ▼
Webhook fires to /api/webhooks
  → updates transaction status
  → logs to dashboard feed
```

---

## State Management

- **Server state**: React Query (market data, agent logs, transaction history)
- **Client state**: Zustand (user settings, active coins, monitoring pause state)
- **Persistent state**: localStorage (user coin config, limits) + optional DB later
