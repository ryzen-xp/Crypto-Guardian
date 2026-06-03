# Project Structure

## Full Directory Tree

```
cryptoguard/
├── docs/                              ← You are here
│   ├── 00-project-overview.md
│   ├── 01-tech-stack.md
│   ├── 02-architecture.md
│   ├── 03-project-structure.md
│   ├── 04-build-plan.md
│   ├── 05-pages-and-components.md
│   ├── 06-api-routes.md
│   ├── 07-lib-modules.md
│   ├── 08-coin-config.md
│   └── 09-env-and-deployment.md
│
├── src/
│   ├── app/                           ← Next.js 14 App Router pages
│   │   ├── layout.tsx                 ← Root layout (providers, fonts)
│   │   ├── page.tsx                   ← Landing page
│   │   ├── setup/
│   │   │   └── page.tsx               ← Wallet connect + coin selection + permissions
│   │   ├── dashboard/
│   │   │   └── page.tsx               ← Main dashboard (verdict grid + feed)
│   │   ├── coin/
│   │   │   └── [symbol]/
│   │   │       └── page.tsx           ← Coin detail page
│   │   ├── settings/
│   │   │   └── page.tsx               ← User settings page
│   │   └── api/
│   │       ├── agent/
│   │       │   └── route.ts           ← Agent loop trigger endpoint
│   │       ├── market-data/
│   │       │   └── route.ts           ← CoinGecko + Fear/Greed fetch
│   │       ├── venice-analysis/
│   │       │   └── route.ts           ← Venice AI calls
│   │       ├── execute-swap/
│   │       │   └── route.ts           ← Build + relay swap
│   │       └── webhooks/
│   │           └── route.ts           ← 1Shot webhook receiver
│   │
│   ├── lib/                           ← Core business logic modules
│   │   ├── coins.ts                   ← Coin config + Base addresses
│   │   ├── market-data.ts             ← CoinGecko + Fear/Greed fetchers
│   │   ├── venice.ts                  ← Venice AI API client
│   │   ├── agent-engine.ts            ← Main agent loop orchestrator
│   │   ├── smart-accounts.ts          ← MetaMask Smart Accounts helpers
│   │   ├── oneshot.ts                 ← 1Shot Relayer client
│   │   ├── uniswap.ts                 ← Uniswap v3 swap builder
│   │   └── types.ts                   ← Shared TypeScript types
│   │
│   ├── components/                    ← React UI components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── dashboard/
│   │   │   ├── VerdictGrid.tsx        ← All coins status grid (color coded)
│   │   │   ├── PriorityCoin.tsx       ← Highlighted urgent coin panel
│   │   │   ├── AgentFeed.tsx          ← Last 10 swaps + decisions feed
│   │   │   └── PortfolioScore.tsx     ← Total value protected metric
│   │   ├── coins/
│   │   │   ├── CoinCard.tsx           ← Individual coin card
│   │   │   └── CoinHistory.tsx        ← Verdict history chart for coin
│   │   ├── setup/
│   │   │   ├── WalletConnect.tsx      ← Connect + Smart Account upgrade
│   │   │   ├── CoinSelector.tsx       ← Toggle which coins to monitor
│   │   │   └── PermissionGrant.tsx    ← ERC-7715 permission granting UI
│   │   ├── settings/
│   │   │   └── SettingsForm.tsx       ← Per-coin limits + global settings
│   │   └── ui/                        ← shadcn/ui components (auto-generated)
│   │
│   ├── hooks/                         ← Custom React hooks
│   │   ├── useAgentStatus.ts          ← Agent running state + last run
│   │   ├── useMarketData.ts           ← Polling market data
│   │   ├── useCoinSettings.ts         ← User coin config from store
│   │   └── useTransactionFeed.ts      ← Real-time tx feed
│   │
│   ├── store/                         ← Zustand state stores
│   │   ├── coinStore.ts               ← Active coins + user limits
│   │   └── agentStore.ts              ← Agent state + verdicts + feed
│   │
│   └── providers/                     ← React context providers
│       ├── WagmiProvider.tsx          ← wagmi + react-query setup
│       └── AppProvider.tsx            ← Combine all providers
│
├── public/
│   ├── logo.svg
│   └── coin-icons/                    ← SVG icons per coin
│
├── .env.local                         ← Environment variables (not committed)
├── .env.example                       ← Template (committed)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## Key File Responsibilities

| File                    | Responsibility                                                |
| ----------------------- | ------------------------------------------------------------- |
| `lib/coins.ts`          | Single source of truth for all coin metadata + Base addresses |
| `lib/agent-engine.ts`   | Orchestrates the full 15-min loop                             |
| `lib/venice.ts`         | Handles both Venice API calls (search + analysis)             |
| `lib/market-data.ts`    | CoinGecko + Fear/Greed — pure data fetchers                   |
| `lib/uniswap.ts`        | Builds Uniswap v3 swap calldata for Base                      |
| `lib/oneshot.ts`        | Submits relayed transactions via 1Shot                        |
| `lib/smart-accounts.ts` | Permission granting + Smart Account upgrade helpers           |
| `api/agent/route.ts`    | Entry point for agent loop (called by cron or manually)       |
| `store/coinStore.ts`    | Persists user coin selections + limits                        |
| `store/agentStore.ts`   | Live verdicts, priority coin, action feed                     |
