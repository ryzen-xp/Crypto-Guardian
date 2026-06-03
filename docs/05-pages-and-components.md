# Pages & Components

## Pages

---

### 1. Landing Page — `app/page.tsx`

**Purpose:** Explain CryptoGuard, build trust, drive to Setup

**Sections:**

- Hero: bold headline + animated verdict grid preview (static demo)
- "How It Works" — 3-step visual: Monitor → Analyze → Protect
- Coins monitored — icon grid of all 10 coins
- Tech integrations — MetaMask, Venice AI, 1Shot logos
- CTA: "Connect Wallet & Start Protecting"

**Key design decisions:**

- Dark theme (crypto native)
- Animated pulsing coin cards to show "live monitoring" feel
- No login required to view landing

---

### 2. Setup Page — `app/setup/page.tsx`

**Purpose:** Onboard user in 3 steps

**Step 1: Connect Wallet**

- WalletConnect button (MetaMask priority)
- Shows connected address + ENS if available
- Upgrade to Smart Account button (calls EIP-7702 via 1Shot)
- Smart Account status badge

**Step 2: Select Coins**

- Grid of all 10 coins with toggle switches
- User marks which coins they currently hold
- Defaults: all off (user must explicitly opt in)

**Step 3: Set Limits**

- For each selected coin, expandable settings panel:
  - Max single swap: $ input
  - Daily swap limit: $ input
  - Minimum to always keep: $ input
  - Risk sensitivity: Conservative / Moderate / Aggressive (radio)
- Global: notification preference toggle

**Step 4: Grant Permissions**

- Summary of what permissions will be granted
- Expiry: 30 days from now
- One-click grant (ERC-7715)
- After grant: "You're Protected — Go to Dashboard" CTA

---

### 3. Dashboard — `app/dashboard/page.tsx`

**Purpose:** Main monitoring view — must look impressive

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  Header: CryptoGuard | Agent: ACTIVE | [Pause]  │
├─────────────────┬───────────────────────────────┤
│                 │                               │
│  VERDICT GRID   │      PRIORITY COIN PANEL      │
│  (6 cols)       │      (highlighted coin)       │
│                 │      AI reasoning             │
│                 │      Action status            │
├─────────────────┴───────────────────────────────┤
│  RECENT ACTIONS FEED (last 10)                  │
├─────────────────────────────────────────────────┤
│  PORTFOLIO PROTECTION SCORE                     │
└─────────────────────────────────────────────────┘
```

**Agent status strip:** Last run time | Next run in Xmin | Status

---

### 4. Coin Detail — `app/coin/[symbol]/page.tsx`

**Purpose:** Full history for one coin

**Sections:**

- Coin header: logo, name, current price + 24hr change
- Current verdict badge (large)
- 24hr verdict timeline (chart: DANGER/CAUTION/NEUTRAL/OPPORTUNITY over time)
- News feed: articles that influenced each verdict
- Swap history: all swaps for this coin (amount, price, timestamp, tx link)
- Current limits set by user

---

### 5. Settings — `app/settings/page.tsx`

**Purpose:** Adjust everything post-setup

**Sections:**

- Master pause toggle (prominent, red when paused)
- Per-coin settings (same as Setup Step 3 but editable)
- Add/remove coins from monitoring
- Permission status: shows expiry, "Renew" button if <7 days left
- Danger zone: revoke all permissions

---

## Components

---

### `VerdictGrid.tsx`

**Props:** `verdicts: VerdictMap`, `priorityCoin: string`, `loading: boolean`

**Renders:** Grid of CoinCard components

- 2 columns on mobile, 3 on tablet, 5 on desktop
- Priority coin gets highlighted border + pulsing glow
- Last updated timestamp in bottom right
- "Agent Running..." skeleton animation when loading

**Color scheme:**

- 🔴 DANGER: `bg-red-500/20 border-red-500`
- 🟡 CAUTION: `bg-yellow-500/20 border-yellow-500`
- ⚪ NEUTRAL: `bg-gray-500/20 border-gray-500`
- 🟢 OPPORTUNITY: `bg-green-500/20 border-green-500`

---

### `CoinCard.tsx`

**Props:** `coin: CoinConfig`, `verdict: Verdict`, `price: number`, `change1h: number`, `isPriority: boolean`

**Renders:**

- Coin logo + symbol
- Current price (large)
- 1hr change (green/red)
- Verdict badge
- Pulsing ring animation if isPriority

---

### `PriorityCoin.tsx`

**Props:** `coin: CoinConfig`, `verdict: Verdict`, `reasoning: string`, `action: AgentAction | null`

**Renders:**

- Large coin logo + name
- Verdict badge (extra large)
- Venice AI reasoning (2 sentences, styled as quote)
- Action taken OR "Monitoring — no action needed"
- Transaction link if swap executed

---

### `AgentFeed.tsx`

**Props:** `actions: AgentAction[]`

**Renders:** Scrollable list of last 10 agent decisions
Each entry:

- Icon: coin logo
- Text: "[ETH] DANGER detected → Swapped $250 to USDC"
- Timestamp: "2 minutes ago"
- Status chip: EXECUTED / SKIPPED / ERROR
- Basescan link (if executed)

---

### `PortfolioScore.tsx`

**Props:** `totalProtected: number`, `totalSwaps: number`, `startDate: Date`

**Renders:**

- Large number: "$X protected since [date]"
- Total swaps executed
- Last protection event

---

### `WalletConnect.tsx`

**Renders:**

- Wagmi `useConnect` hook
- MetaMask button (primary), other wallets (secondary)
- Connected state: address chip + disconnect option
- Smart Account status indicator

---

### `CoinSelector.tsx`

**Props:** `selectedCoins: string[]`, `onChange: (coins: string[]) => void`

**Renders:**

- Grid of all 10 coins
- Toggle each on/off
- Shows coin logo, name, network

---

### `PermissionGrant.tsx`

**Props:** `selectedCoins: string[]`, `limits: CoinLimits`, `onGranted: () => void`

**Renders:**

- Summary: "You are granting CryptoGuard permission to..."
- List of coins + max amounts
- Expiry date
- "Grant Permissions" button (triggers ERC-7715)
- Loading state during grant
- Success state with checkmark

---

### `SettingsForm.tsx`

**Props:** `coinSettings: CoinSettings`, `onChange: (settings: CoinSettings) => void`

**Renders:**

- Accordion per coin (only monitored coins shown)
- Each coin: same limit inputs as Setup
- Global settings section
- Save button

---

## Shared UI Patterns

- **Loading skeletons** on all data-dependent components
- **Error boundaries** with retry button
- **Toast notifications** for agent actions (swap executed, limit hit, etc.)
- **Dark theme only** — `bg-gray-950` base, `bg-gray-900` cards
- **Monospace font** for prices and addresses
