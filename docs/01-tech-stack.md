# Tech Stack

## Full Stack Breakdown

### Frontend

| Tool        | Version         | Purpose                 |
| ----------- | --------------- | ----------------------- |
| Next.js     | 14 (App Router) | Framework               |
| TypeScript  | 5.x             | Type safety             |
| TailwindCSS | 3.x             | Styling                 |
| shadcn/ui   | latest          | UI components           |
| Recharts    | latest          | Price/history charts    |
| Zustand     | latest          | Client state management |

### Wallet & Smart Accounts

| Tool                         | Purpose                       |
| ---------------------------- | ----------------------------- |
| MetaMask Smart Accounts Kit  | ERC-7715 Advanced Permissions |
| @metamask/delegation-toolkit | Permission granting           |
| wagmi v2                     | React wallet hooks            |
| viem                         | Ethereum client               |
| @tanstack/react-query        | Async state management        |

### Gas Relayer

| Tool      | Purpose                             |
| --------- | ----------------------------------- |
| 1Shot API | Permissionless relayer              |
| Endpoint  | `https://api.1shotapi.com/v1/relay` |
| Chain     | Base Mainnet (8453)                 |
| Gas token | USDC                                |

### AI Brain

| Tool           | Purpose                   |
| -------------- | ------------------------- |
| Venice AI API  | LLM + web search          |
| Model          | `llama-3.3-70b`           |
| Calls per loop | 2 (web search + analysis) |

### Data Sources

| Source               | Data                      | Cost            |
| -------------------- | ------------------------- | --------------- |
| CoinGecko API        | Price + 1hr/24hr % change | Free            |
| alternative.me       | Fear & Greed Index        | Free            |
| Venice AI web_search | Latest news per coin      | Included in API |

### Swap Execution

| Tool       | Purpose                                             |
| ---------- | --------------------------------------------------- |
| Uniswap v3 | DEX for all swaps                                   |
| Chain      | Base Mainnet                                        |
| Safe asset | USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) |

---

## Environment Variables

```env
# AI
VENICE_API_KEY=your_venice_api_key

# Wallet
NEXT_PUBLIC_WALLET_CONNECT_ID=your_walletconnect_id

# Chain
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Relayer
ONESHOT_API_URL=https://api.1shotapi.com
ONESHOT_API_KEY=your_oneshot_api_key
```

---

## Free APIs (No Key Required)

**CoinGecko — All coin prices + changes:**

```
https://api.coingecko.com/api/v3/simple/price?ids=ethereum,chainlink,uniswap,aave,matic-network,arbitrum&vs_currencies=usd&include_1h_change=true&include_24hr_change=true
```

**Fear & Greed Index:**

```
https://api.alternative.me/fng/
```

---

## Install Commands

```bash
npx create-next-app@latest cryptoguard --typescript --tailwind --app
npm install @metamask/delegation-toolkit wagmi viem @tanstack/react-query
npm install zustand recharts
npm install @uniswap/v3-sdk @uniswap/sdk-core
```
