# Crypto-Guardian v2.0 Architecture

Real 1-Shot Relayer Execution on Sepolia Testnet

---

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CRYPTO-GUARDIAN V2.0                              │
│                    Real 1-Shot Relayer Automation                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐
│   USER DASHBOARD      │
│ ─────────────────────│
│ • Run Agent Scan      │
│ • View Verdicts       │
│ • Settings            │
│ • Terminal Logs       │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│                    CRYPTO-GUARDIAN AGENT                          │
│                  (runs every 30-100 seconds)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. FETCH MARKET DATA                                            │
│     ├─ CoinGecko: ETH, WETH prices                               │
│     └─ Fear & Greed Index                                        │
│                                                                   │
│  2. FETCH WALLET BALANCES                                        │
│     ├─ On-chain: getBalance() for ETH                            │
│     ├─ On-chain: balanceOf() for WETH/USDC                       │
│     └─ USD check: balance × price ≥ $0.005?                      │
│                                                                   │
│  3. AI ANALYSIS (Priority: Venice → Groq → Gemini → Local)       │
│     ├─ System: Multi-provider cascade                            │
│     ├─ Input: Prices, news, fear/greed, user settings            │
│     └─ Output: Verdicts + priority coin + action                 │
│                                                                   │
│  4. RULE CHECK                                                    │
│     ├─ Risk sensitivity: conservative/moderate/aggressive        │
│     ├─ Min balance: $0.005 USD?                                   │
│     └─ Action type: BUY/SELL/HOLD?                                │
│                                                                   │
│  5. EXECUTE SWAP (if approved)                                   │
│     ├─ Build Uniswap calldata (V2 on testnet)                    │
│     ├─ Submit to 1-Shot relayer                                  │
│     └─ Poll for confirmation                                     │
│                                                                   │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐        ┌─────────────────────┐
│      EXTERNAL DATA SOURCES         │        │  LOCAL FALLBACK     │
├────────────────────────────────────┤        ├─────────────────────┤
│                                    │        │                     │
│ CoinGecko (Free):                  │        │ Price momentum      │
│  ├─ https://api.coingecko.com      │        │ + Fear & Greed      │
│  ├─ ETH, WETH prices               │        │ = Local verdicts    │
│  └─ 1h, 24h changes                │        │ (no network needed)  │
│                                    │        │                     │
│ Venice AI (Primary):               │        └─────────────────────┘
│  ├─ https://api.venice.ai          │
│  ├─ llama-3.3-70b model            │
│  ├─ Web search included            │
│  └─ Cost: Free tier (limited)       │
│                                    │
│ Groq (Fallback #1):                │
│  ├─ https://api.groq.com           │
│  ├─ llama-3.3-70b-versatile        │
│  └─ Free tier: 14,400 req/day      │
│                                    │
│ Gemini (Fallback #2):              │
│  ├─ https://generativelanguage...  │
│  ├─ gemini-2.0-flash               │
│  └─ Free tier: 1,000 req/day       │
│                                    │
└────────────────────────────────────┘

            │
            ▼
┌────────────────────────────────────────────────────────────┐
│           1-SHOT RELAYER (Real Execution)                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  JSON-RPC Endpoint (Sepolia):                              │
│  https://relayer.1shotapi.dev/relayers                     │
│                                                            │
│  Flow:                                                     │
│  1. Discover capabilities (payment tokens)                 │
│  2. Estimate gas cost                                      │
│  3. Get quote for USDC fee                                 │
│  4. Execute transaction (JSON-RPC method)                  │
│  5. Return task ID                                         │
│  6. Poll status until confirmed                            │
│                                                            │
│  Payment: ERC-7710 (MetaMask Smart Account)                │
│  Token: USDC (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) │
│  Gas: Real cost charged to relayer                         │
│                                                            │
└────────────────────────────────────────┬───────────────────┘
                                         │
                                         ▼
                        ┌────────────────────────────────┐
                        │  ETHEREUM SEPOLIA TESTNET      │
                        ├────────────────────────────────┤
                        │                                │
                        │ Uniswap V2 Router              │
                        │ 0xeE567Fe1712Faf6149d80dA1E... │
                        │                                │
                        │ Swap: WETH → USDC              │
                        │ Pool: 0x3289680dD4d6C10bb19b.. │
                        │                                │
                        │ Result: On-chain transaction   │
                        │ • ETH balance decreased        │
                        │ • USDC balance increased       │
                        │ • tx hash: 0x7f4a9c2b8ef14...  │
                        │                                │
                        └────────────────────────────────┘
```

---

## Data Flow Architecture

```
┌──────────────────┐
│  USER WALLET     │
│  (Sepolia)       │
│                  │
│ ETH: 0.005 ETH   │
│ WETH: 0.002 WETH │
│ USDC: 0 USDC     │
└────────┬─────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
    ┌─────────────┐                  ┌──────────────┐
    │ getBalance  │                  │ ERC20.balance│
    │ (for ETH)   │                  │ (for WETH/   │
    └─────────────┘                  │  USDC)       │
         │                           └──────────────┘
         └───────────────┬───────────────┘
                         │
                         ▼
                  ┌────────────────┐
                  │ BALANCE DATA   │
                  ├────────────────┤
                  │ ETH: 5m wei    │
                  │ WETH: 2m wei   │
                  │ USDC: 0        │
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ PRICE DATA     │
                  ├────────────────┤
                  │ ETH: $2,456    │
                  │ WETH: $2,456   │
                  │ USDC: $1       │
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ USD CALCULATION│
                  ├────────────────┤
                  │ ETH: $12.28    │
                  │ WETH: $4.91    │
                  │ USDC: $0       │
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ THRESHOLD CHK  │
                  ├────────────────┤
                  │ ETH: ✅ held   │
                  │ WETH: ❌ <0.005│
                  │ USDC: ❌ <0.005│
                  └────────┬───────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
           ┌─────────┐           ┌─────────┐
           │  HELD   │           │ NOT HELD│
           │ Monitor │           │ Skipped │
           └────┬────┘           └─────────┘
                │
                ▼
           ┌──────────────┐
           │ AI ANALYSIS  │
           │ (Venice AI)  │
           └────┬─────────┘
                │
        ┌───────┼───────┐
        │       │       │
        ▼       ▼       ▼
    DANGER  CAUTION  NEUTRAL
        │       │       │
        └───────┴───────┘
                │
                ▼
        ┌───────────────┐
        │ VERDICT: BUY  │
        │ VERDICT: SELL │
        │ VERDICT: HOLD │
        └───────┬───────┘
                │
        ┌───────┴────────────────┐
        │                        │
        ▼                        ▼
    ┌────────┐          ┌──────────────┐
    │ APPROVED          │ REJECTED     │
    │ (risk OK)         │ (conservative│
    │ (min $ OK)        │  or <$0.005) │
    └────┬───────┘      └──────────────┘
         │
         ▼
    ┌─────────────────┐
    │ BUILD CALLDATA  │
    │ (Uniswap V2)    │
    └────┬────────────┘
         │
         ▼
    ┌──────────────────────┐
    │ 1-SHOT RELAYER       │
    │ - Estimate gas       │
    │ - Get quote          │
    │ - Execute (JSON-RPC) │
    │ - Return task_id     │
    └────┬─────────────────┘
         │
         ▼
    ┌──────────────────────┐
    │ ETHEREUM SEPOLIA     │
    │ - Execute Uniswap    │
    │ - Transfer USDC      │
    │ - Emit event         │
    └────┬─────────────────┘
         │
         ▼
    ┌──────────────────┐
    │ UPDATED BALANCES │
    │                  │
    │ ETH: 0 (sold)    │
    │ WETH: 0.002      │
    │ USDC: $12.25     │
    └──────────────────┘
```

---

## Component Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP (Frontend + API)           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  PAGES (Client-side):                                     │
│  ├─ /dashboard          → Run scans, view results        │
│  ├─ /terminal           → Live agent logs                │
│  ├─ /settings           → User risk preferences          │
│  └─ /coin/[symbol]      → Per-coin details               │
│                                                            │
│  API ROUTES (Server-side):                                │
│  ├─ /api/agent          → Run agent loop                 │
│  ├─ /api/execute-swap   → Submit swap to 1-Shot         │
│  ├─ /api/market-data    → Fetch prices + F&G            │
│  ├─ /api/wallet-balances→ On-chain balance query        │
│  ├─ /api/venice-analysis→ AI verdict generation         │
│  └─ /api/webhooks       → 1-Shot task callbacks          │
│                                                            │
│  STATE MANAGEMENT:                                        │
│  ├─ useAgentStore (Zustand)                              │
│  │  ├─ Terminal logs                                     │
│  │  ├─ Agent status                                      │
│  │  ├─ Swap history                                      │
│  │  ├─ Per-coin verdicts                                 │
│  │  └─ Next run timestamp                                │
│  │                                                        │
│  └─ useWalletBalances (Custom hook)                      │
│     ├─ Fetch on-chain balances                           │
│     ├─ Cache with 1min TTL                               │
│     └─ Subscribe to address changes                      │
│                                                            │
│  LIB MODULES (Pure logic):                                │
│  ├─ coins.ts            → Token configs                  │
│  ├─ balances.ts         → Balance fetching + USD check  │
│  ├─ market-data.ts      → CoinGecko + F&G               │
│  ├─ venice.ts           → Multi-provider AI             │
│  ├─ uniswap.ts          → Calldata builders              │
│  ├─ oneshot.ts          → 1-Shot JSON-RPC relay         │
│  ├─ agent-engine.ts     → Main loop logic                │
│  ├─ chain-config.ts     → Sepolia chain params           │
│  └─ types.ts            → TypeScript types              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Swap Execution Sequence

```
Time    Component           Action
────────────────────────────────────────────────────────────
0ms     Dashboard           User clicks "Run Scan"
        │
10ms    Agent Engine        fetch market data + balances
        │
50ms    Venice AI           Analyze verdicts
        ├─ → DANGER detected (ETH -8%)
        │
100ms   Rule Check          $12 balance ✓, SELL allowed ✓
        │
150ms   Build Calldata      Create Uniswap V2 params
        ├─ Route: 0xeE567Fe17...
        ├─ Path: [WETH, USDC]
        ├─ Amount: 0.005 ETH
        ├─ Min out: 12.0 USDC (1% slippage)
        ├─ Deadline: now + 20m
        │
200ms   1-Shot Relayer      POST to JSON-RPC endpoint
        │ ↓
        ├─ relayer_getCapabilities()
        │ ├─ Returns: USDC available
        │ └─ Token: 0x1c7D4B196...
        │
250ms   Estimate Gas        relayer_estimate7710Transaction()
        │ ├─ Returns: 150,000 gas
        │ ├─ Gas cost: 0.15 USDC
        │ └─ Context: 0x7f4a...
        │
300ms   Send to Chain       relayer_send7710Transaction()
        │ ├─ Encode ERC-7710 transaction
        │ ├─ Include payment context
        │ ├─ Submit to Sepolia
        │ └─ Return: task_7f4a9c2b
        │
350ms   Terminal            ⏳ Swap pending — task_7f4a9c2b
        │
5000ms  Poll Status         relayer_getStatus(task_7f4a9c2b)
        │ ├─ Status: pending
        │ └─ Retry in 5s
        │
10000ms Confirm Hash        relayer_getStatus(...)
        │ ├─ Status: confirmed
        │ ├─ tx: 0x7f4a9c2b8ef14...
        │ └─ Gas used: 0.15 USDC
        │
10100ms Terminal            ✓ Swap confirmed — tx: 0x7f4a...
        │
10150ms Update Balances     New balance: USDC +$12.25
        │
10200ms Next Scan           Scheduled for 30s later
        │
        ▼

RESULT:
  Before:  ETH: 0.005, WETH: 0, USDC: 0
  After:   ETH: 0,     WETH: 0, USDC: $12.25
  Cost:    $0.15 USDC (paid by 1-Shot relayer)
```

---

## Monitoring & Alerting Flow

```
EVERY 30-100 SECONDS:

Start: Agent Loop
   │
   ├─ Check: Is on cooldown?
   │  └─ No → Continue
   │
   ├─ Fetch: All prices + Fear & Greed
   │  └─ Source: CoinGecko
   │
   ├─ Fetch: All balances
   │  ├─ ETH: On-chain (native)
   │  ├─ WETH: On-chain (ERC-20)
   │  ├─ USDC: On-chain (ERC-20)
   │  └─ Filter: USD value ≥ $0.005?
   │
   ├─ Analyze: AI verdicts
   │  ├─ Try: Venice AI
   │  ├─ Fallback: Groq
   │  ├─ Fallback: Gemini
   │  ├─ Fallback: Local rules
   │  └─ Result: DANGER/CAUTION/NEUTRAL/OPPORTUNITY
   │
   ├─ Log: Per-coin verdicts
   │  └─ Terminal: Show each coin + verdict + reason
   │
   ├─ Detect: Most critical coin
   │  ├─ Priority: DANGER > OPPORTUNITY > CAUTION > NEUTRAL
   │  └─ Select: Highest-risk coin for action
   │
   ├─ Check: User rules + balance
   │  ├─ Risk sensitivity: conservative/moderate/aggressive?
   │  ├─ Min balance: ≥ $0.005?
   │  ├─ Daily limit: Not exceeded?
   │  └─ Action type: Allowed for this verdict?
   │
   ├─ Execute: Swap if approved
   │  ├─ Build calldata
   │  ├─ Submit to 1-Shot
   │  ├─ Poll for confirmation
   │  └─ Log result: pending/confirmed/failed
   │
   ├─ Store: Results
   │  ├─ Terminal lines
   │  ├─ Verdicts
   │  ├─ Action taken
   │  └─ Next run time
   │
   └─ Schedule: Next scan
      ├─ If DANGER: 30s (urgent)
      ├─ If CAUTION: 60s (watch)
      ├─ If NEUTRAL: 100s (low priority)
      ├─ If AI failed: 5m (backoff)
      └─ If swap failed: 5m (retry backoff)

End: Agent Loop
```

---

## Error Handling & Fallback Strategy

```
┌─────────────────────────────────────────────┐
│        ERROR HANDLING HIERARCHY             │
└─────────────────────────────────────────────┘

1. NETWORK / API ERRORS:
   CoinGecko fails
   └─ Retry with cached price (5min TTL)
   └─ If no cache: Use last known price
   └─ If no last known: Fall back to local analyzer

2. AI PROVIDER ERRORS:
   Venice AI fails
   └─ Try: Groq
   └─ Try: Gemini
   └─ Try: Local rule engine
   └─ Result: NEUTRAL (no action)

3. BALANCE ERRORS:
   Balance < $0.005 USD
   └─ Code: BALANCE_TOO_LOW
   └─ Action: Stop monitoring this coin
   └─ Result: isHeld = false

4. SWAP EXECUTION ERRORS:
   1-Shot relayer fails
   └─ Throw error (no fallback)
   └─ Log to terminal
   └─ Retry in 5 minutes
   └─ Alert user in UI

5. SMART ACCOUNT ERRORS:
   ERC-7710 upgrade fails
   └─ Fall back to EOA (if funds available)
   └─ Or: Provide manual wallet connect

┌─────────────────────────────────────────────┐
│  REAL EXECUTION = NO SILENT FAILURES       │
│  ALL ERRORS ARE VISIBLE                     │
└─────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
DEVELOPMENT:
  Local:     npm run dev → localhost:3000
  Build:     npm run build → Turbopack
  Type Check: TypeScript strict mode
  Testnet:   Sepolia (11155111)

STAGING (Optional):
  Vercel Preview Deploy
  Connect to Sepolia testnet
  Test 1-Shot relayer
  Verify with real transactions

PRODUCTION:
  Vercel Main Deploy
  Config: Update to Mainnet
  Connect to ETH Mainnet (1)
  Update addresses in .env
  Real funds (no testnet)

```

---

## Dependencies & Integrations

```
EXTERNAL APIs:
├─ CoinGecko (Free)
│  └─ Prices + Fear & Greed
│
├─ Venice AI (Free tier)
│  └─ Llama 3.3-70b analysis
│
├─ Groq (Free tier fallback)
│  └─ Llama 3.3-70b-versatile
│
├─ Gemini (Free tier fallback)
│  └─ Gemini-2.0-flash
│
├─ 1-Shot Relayer (Paid)
│  └─ JSON-RPC JSON-RPC
│  └─ Gas: Charged in USDC
│  └─ ERC-7710 smart account
│
└─ Ethereum Sepolia RPC (Free)
   └─ https://ethereum-sepolia-rpc.publicnode.com

NPM PACKAGES:
├─ next.js (16.2.7)
├─ viem (2.x) - Ethereum library
├─ zustand - State management
├─ lucide-react - Icons
├─ tailwindcss - Styling
└─ wagmi - Web3 components
```

---

## Performance Metrics

```
Operation                    Expected Time
─────────────────────────────────────────
Fetch prices (CoinGecko):    200-400ms
Fetch balances (RPC):        100-300ms
AI analysis (Venice):        1-3 seconds
Build calldata:              50ms
1-Shot estimate:             200-500ms
1-Shot execute:              100-300ms
Poll confirmation:           10-30 seconds (testnet)
Total scan cycle:            3-5 seconds
Total to confirmed:          15-45 seconds

Storage:
├─ Terminal logs: ~50 lines × 200 bytes = 10KB
├─ Balance cache: 3 coins × 50 bytes = 150 bytes
├─ Verdict history: 100 verdicts × 100 bytes = 10KB
└─ Total in-memory: ~30KB (negligible)
```

---

## Security Considerations

```
SMART CONTRACT INTERACTION:
✅ Uniswap V2 Router (verified)
✅ ERC-20 tokens (standard)
✅ 1-Shot relayer (audited service)
✅ MetaMask smart accounts (ERC-7710)

PRIVATE DATA:
❌ Private keys: Never in browser
✅ Public address: Visible in UI
✅ Transaction history: On-chain (public)
✅ AI prompts: Sent to Venice/Groq (log your concerns)

FINANCIAL SAFETY:
✅ Real gas costs (not simulated)
✅ Slippage protection (1% default)
✅ Min balance enforcement ($0.005)
✅ User approval required (DANGER still manual in v2)

ERROR VISIBILITY:
✅ No silent failures (all errors logged)
✅ No demo mode fallbacks (real execution only)
✅ Terminal shows all activity (transparent)
```

---

This architecture ensures **real, transparent, auditable execution** while maintaining **agent autonomy** within user-defined constraints. 🚀
