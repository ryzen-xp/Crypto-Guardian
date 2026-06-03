# Build Plan

## Strategy

Build from the inside out: data → AI brain → execution → UI.
Every phase should be independently testable before moving forward.

---

## Phase 1 — Foundation (Day 1)

**Goal:** Project scaffolded, all coins configured, data flowing

### Steps

- [ ] `npx create-next-app@latest cryptoguard --typescript --tailwind --app`
- [ ] Install all dependencies (see tech stack doc)
- [ ] Set up `.env.local` with all keys
- [ ] Create `src/lib/types.ts` — define all shared types
- [ ] Create `src/lib/coins.ts` — all 10 coin configs with Base addresses
- [ ] Create `src/lib/market-data.ts` — CoinGecko + Fear/Greed fetchers
- [ ] Test: call market-data from a test route, verify all prices return
- [ ] Create `src/app/api/market-data/route.ts`
- [ ] Set up Zustand stores (`coinStore.ts`, `agentStore.ts`)
- [ ] Set up Wagmi/viem providers

### Deliverable

- App runs at localhost:3000
- `/api/market-data` returns live prices for all 10 coins

---

## Phase 2 — Venice AI Brain (Day 1–2)

**Goal:** AI analysis working end-to-end

### Steps

- [ ] Create `src/lib/venice.ts`
  - [ ] `fetchCoinNews(coinId)` — web_search call per coin
  - [ ] `analyzeMarket(context)` — full analysis call
  - [ ] Parse Venice response into typed `VerdictMap`
- [ ] Create `src/app/api/venice-analysis/route.ts`
- [ ] Test: mock market data → Venice → verify verdict structure returned
- [ ] Handle Venice API errors gracefully (retry logic)
- [ ] Define prompt templates as constants (easy to tune)

### Deliverable

- `/api/venice-analysis` accepts market data, returns verdicts per coin + priority coin + reasoning

---

## Phase 3 — Agent Core Loop (Day 2)

**Goal:** Full 15-minute loop running autonomously

### Steps

- [ ] Create `src/lib/agent-engine.ts`
  - [ ] `runAgentLoop()` — orchestrates all steps in order
  - [ ] Decision logic: check user rules before any action
  - [ ] Limit enforcement: single swap cap, daily cap, minimum hold
  - [ ] Logging: every decision logged with timestamp + reasoning
- [ ] Create `src/app/api/agent/route.ts`
  - [ ] POST triggers one full loop run
  - [ ] Returns loop result (verdicts + action taken)
- [ ] Add 15-min interval logic (vercel cron or setInterval on dashboard)
- [ ] Test: trigger agent manually, verify full loop completes

### Deliverable

- `/api/agent` runs full loop: fetch → analyze → decide → log
- Decisions logged correctly with reasoning

---

## Phase 4 — Swap Execution (Day 2–3)

**Goal:** Actual swaps executing on Base via 1Shot

### Steps

- [ ] Create `src/lib/uniswap.ts`
  - [ ] Build Uniswap v3 swap calldata for Base
  - [ ] Support both directions: coin→USDC and USDC→coin
  - [ ] Calculate minimum amounts with slippage tolerance
- [ ] Create `src/lib/oneshot.ts`
  - [ ] `relayTransaction(calldata, userAddress)` — submit to 1Shot
  - [ ] Handle response + webhook setup
- [ ] Create `src/lib/smart-accounts.ts`
  - [ ] `upgradeToSmartAccount(wallet)` — EIP-7702 upgrade via 1Shot
  - [ ] `grantPermissions(coins, limits)` — ERC-7715 permission grant
  - [ ] `checkPermissions(address)` — verify active permissions
- [ ] Create `src/app/api/execute-swap/route.ts`
- [ ] Create `src/app/api/webhooks/route.ts` — 1Shot webhook receiver
- [ ] Test on Base testnet first, then mainnet

### Deliverable

- Full swap lifecycle: build calldata → relay → webhook confirmation
- Smart Account upgrade + permission grant working

---

## Phase 5 — Core UI (Day 3)

**Goal:** Dashboard showing live verdicts — the most impressive visual

### Steps

- [ ] Create `VerdictGrid.tsx` — 10 coins, color coded by verdict
  - [ ] 🔴 DANGER | 🟡 CAUTION | ⚪ NEUTRAL | 🟢 OPPORTUNITY
  - [ ] Pulsing animation on active/priority coin
  - [ ] Last updated timestamp
- [ ] Create `PriorityCoin.tsx` — enlarged highlight of urgent coin
  - [ ] Shows AI reasoning (2 sentences from Venice)
  - [ ] Shows suggested action + limits check
- [ ] Create `AgentFeed.tsx` — last 10 decisions
  - [ ] Each entry: coin, verdict, action taken, timestamp
  - [ ] Links to tx on Basescan
- [ ] Wire all components to Zustand agent store
- [ ] Add auto-refresh (poll `/api/agent` status or SSE)

### Deliverable

- Dashboard live with real verdicts updating every 15 minutes

---

## Phase 6 — Setup & Settings (Day 3–4)

**Goal:** User onboarding flow complete

### Steps

- [ ] Landing page (`page.tsx`)
  - [ ] Hero: what CryptoGuard does
  - [ ] Coin list preview
  - [ ] CTA: "Start Protecting"
- [ ] Setup page (`setup/page.tsx`)
  - [ ] `WalletConnect.tsx` — connect MetaMask
  - [ ] `CoinSelector.tsx` — toggle which coins to monitor
  - [ ] Per-coin limit inputs (max swap, daily limit, min hold)
  - [ ] `PermissionGrant.tsx` — grant ERC-7715 permissions (one click)
- [ ] Settings page (`settings/page.tsx`)
  - [ ] `SettingsForm.tsx` — edit all limits
  - [ ] Master pause toggle
  - [ ] Add/remove coins
  - [ ] View/renew permissions
- [ ] Coin detail page (`coin/[symbol]/page.tsx`)
  - [ ] 24hr verdict history
  - [ ] All swaps for this coin
  - [ ] News that triggered each decision

### Deliverable

- Full user journey: land → connect → configure → protect

---

## Phase 7 — Polish & Demo Prep (Day 4–5)

**Goal:** Ready for demo video and submission

### Steps

- [ ] Portfolio protection score component
- [ ] Agent status indicator (ACTIVE / PAUSED / ERROR)
- [ ] Mobile responsive design
- [ ] Error states + loading skeletons
- [ ] README with demo instructions
- [ ] Deploy to Vercel
- [ ] Record 3-minute demo video
- [ ] Social media post (tag @MetaMaskDev)

### Deliverable

- Deployed app, demo video, submission ready

---

## Daily Schedule Summary

| Day   | Focus                       | Must Ship                                    |
| ----- | --------------------------- | -------------------------------------------- |
| Day 1 | Foundation + Venice AI      | Market data API + Venice verdicts working    |
| Day 2 | Agent Loop + Smart Accounts | Full agent loop running, permissions working |
| Day 3 | Swap Execution + Dashboard  | Swaps live on Base, verdict grid displaying  |
| Day 4 | Setup + Settings pages      | Full user flow end-to-end                    |
| Day 5 | Polish + Deploy + Demo      | Deployed, demo recorded, submitted           |

---

## Risk Mitigation

| Risk                    | Mitigation                                              |
| ----------------------- | ------------------------------------------------------- |
| MetaMask SDK complexity | Use delegation-toolkit examples, start simple           |
| 1Shot API unfamiliar    | Test relay with simple ETH transfer first               |
| Venice rate limits      | Cache news results per coin, batch analysis             |
| Uniswap v3 complexity   | Use Uniswap SDK, hardcode pool addresses for Base coins |
| Gas estimation errors   | Add buffer multiplier, handle 1Shot errors gracefully   |
