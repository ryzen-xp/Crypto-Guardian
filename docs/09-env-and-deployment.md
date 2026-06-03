# Environment Variables & Deployment

## `.env.local` (never commit this)

```env
# ─── Venice AI ───────────────────────────────────────────
VENICE_API_KEY=your_venice_api_key
# Get at: https://venice.ai/settings/api

# ─── MetaMask / WalletConnect ────────────────────────────
NEXT_PUBLIC_WALLET_CONNECT_ID=your_walletconnect_project_id
# Get at: https://cloud.walletconnect.com

# ─── Chain Config ────────────────────────────────────────
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_UNISWAP_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481

# ─── 1Shot API ───────────────────────────────────────────
ONESHOT_API_KEY=your_oneshot_api_key
ONESHOT_API_URL=https://api.1shotapi.com
ONESHOT_WEBHOOK_SECRET=your_webhook_secret
# Get at: https://1shotapi.com

# ─── App ─────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=random_32_char_string

# ─── Optional: RPC ───────────────────────────────────────
# NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
# Use Alchemy/Infura for production:
# NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

---

## `.env.example` (commit this as template)

```env
VENICE_API_KEY=
NEXT_PUBLIC_WALLET_CONNECT_ID=
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_UNISWAP_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
ONESHOT_API_KEY=
ONESHOT_API_URL=https://api.1shotapi.com
ONESHOT_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
NEXTAUTH_SECRET=
```

---

## Deployment: Vercel (recommended)

### Steps

1. Push repo to GitHub
2. Import project at vercel.com
3. Add all env variables in Vercel project settings
4. Set framework: Next.js (auto-detected)
5. Deploy

### Vercel Cron (agent 15-min loop)

Add `vercel.json` to project root:

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

> **Note:** Vercel Cron requires Pro plan for sub-hourly intervals.
> Hobby plan: minimum 1 hour intervals.
> **For hackathon demo:** Trigger agent manually from dashboard, or use a free cron service like [cron-job.org](https://cron-job.org) to call your Vercel URL every 15 minutes.

### 1Shot Webhook Configuration

Set your webhook URL in 1Shot dashboard:

```
https://your-app.vercel.app/api/webhooks
```

---

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open: http://localhost:3000
```

### Testing Agent Loop Locally

```bash
# Trigger one agent loop manually:
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x...","activeCoins":["ETH","LINK"],"forceRun":true}'
```

### Testing Venice AI Locally

```bash
curl -X POST http://localhost:3000/api/venice-analysis \
  -H "Content-Type: application/json" \
  -d '{"activeCoins":["ETH","LINK","ARB"]}'
```

---

## Security Checklist

- [ ] Never expose `VENICE_API_KEY`, `ONESHOT_API_KEY` to client (no `NEXT_PUBLIC_` prefix)
- [ ] Verify 1Shot webhook signatures using `ONESHOT_WEBHOOK_SECRET`
- [ ] Validate all user inputs before passing to Venice prompt (prompt injection prevention)
- [ ] Use HTTPS only in production
- [ ] Rate limit `/api/agent` endpoint (prevent spam trigger)
- [ ] Store no private keys server-side — all signing done client-side via MetaMask

---

## Base RPC Options

| Provider    | URL                                         | Free Tier          |
| ----------- | ------------------------------------------- | ------------------ |
| Base Public | `https://mainnet.base.org`                  | Yes, rate limited  |
| Alchemy     | `https://base-mainnet.g.alchemy.com/v2/KEY` | 300M compute/month |
| Infura      | `https://base-mainnet.infura.io/v3/KEY`     | 100K req/day       |
| QuickNode   | Custom URL                                  | 10M credits/month  |

> For hackathon: Base public RPC is fine. For production: use Alchemy or Infura.
