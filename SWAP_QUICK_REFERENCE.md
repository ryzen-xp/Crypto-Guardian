# Swap Execution Quick Reference

## Configuration Overview

### Active Tokens on Sepolia Testnet

| Token | Address | Type | Role |
|-------|---------|------|------|
| **ETH** | `native` | Volatile | Primary asset to monitor |
| **WETH** | `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` | Volatile | Wrapped alternative |
| **USDC** | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Stable | Only stablecoin |

### Swap Pairs

```
SELL (DANGER verdict):  ETH/WETH → USDC
BUY (OPPORTUNITY):      USDC → ETH/WETH
```

### Relayer Configuration

```
Network:           Ethereum Sepolia (chainId: 11155111)
Relayer Type:      1-Shot JSON-RPC (ERC-7710)
Testnet Endpoint:  https://relayer.1shotapi.dev/relayers
Production:        https://relayer.1shotapi.com/relayers
Gas Token:         USDC
Execution:         Real on-chain (no simulation)
```

---

## Swap Execution Conditions

### Automatic Swap Triggers (AI Agent)

#### DANGER → Sell ETH/WETH to USDC
- **Trigger:** AI detects -5% 1h change + Fear & Greed < 25
- **Condition:** Balance ≥ $0.005 USD
- **Amount:** Full balance of coin
- **Action:** Automatic execution
- **Timing:** Every 30 seconds (urgent)

#### OPPORTUNITY → Buy ETH/WETH with USDC
- **Trigger:** AI detects +5% 1h change + Fear & Greed > 75
- **Condition:** Balance ≥ $0.005 USD
- **Amount:** Risk-based (25%-75% of max swap amount)
- **Action:** Manual approval (conservative mode)
- **Timing:** Every 75 seconds

#### CAUTION → Monitor closely
- **Trigger:** -3% to -5% change
- **Condition:** No automatic swap
- **Action:** Manual review recommended
- **Timing:** Every 60 seconds

#### NEUTRAL → Hold position
- **Trigger:** ±1% to ±3% change
- **Condition:** No swap
- **Action:** None
- **Timing:** Every 100 seconds

---

## Balance Monitoring Rules

### When to Stop Monitoring an Asset

| Scenario | Trigger | Action | Code |
|----------|---------|--------|------|
| Balance < $0.005 USD | ETH: $0.002, WETH: $0.001 | Stop monitoring | `BALANCE_TOO_LOW` |
| No balance held | isHeld = false | Skip coin | `NO_BALANCE` |
| Price unavailable | CoinGecko API fail | Fallback to local analysis | `PRICE_ERROR` |

### Balance Calculation Example

```typescript
// Balance check before swap
price = 2000 USD/ETH
held = 0.002 ETH
balanceUSD = 0.002 × 2000 = $4.00 ✅ (above $0.005 threshold)

// Will monitor and execute swaps

---

// Another wallet
price = 2000 USD/ETH
held = 0.0000025 ETH
balanceUSD = 0.0000025 × 2000 = $0.005 ❌ (at threshold, monitoring stops)
// Error: "BALANCE_TOO_LOW" returned
// Monitoring automatically disabled for this asset
```

---

## Swap Execution Flow

### Step-by-Step (DANGER Verdict)

```
1. AI Analysis Complete
   ├─ DANGER verdict detected
   ├─ ETH balance: 0.005 ETH ($10)
   └─ Reasoning: "ETH showing critical downside momentum"

2. Validation Checks
   ├─ Balance in USD ≥ $0.005? → YES ✅
   ├─ Token approved? → 1-Shot handles
   └─ User settings allow DANGER swaps? → YES ✅

3. Build Swap Calldata
   ├─ Router: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
   ├─ Function: swapExactETHForTokens (via V2 on testnet)
   ├─ Amount In: 0.005 ETH + gas fee
   ├─ Min Amount Out: USDC with 1% slippage
   ├─ Recipient: User wallet
   └─ Deadline: Now + 20 minutes

4. Submit to 1-Shot Relayer
   ├─ Method: relayer_send7710Transaction (JSON-RPC)
   ├─ Payment Token: USDC (from capabilities)
   ├─ Gas Delegation: MetaMask ERC-7710
   ├─ Return: task_xxxxx (task ID)
   └─ Status: pending

5. Monitor Execution
   ├─ Poll relayer_getStatus every 5 seconds
   ├─ Status updates: pending → confirmed
   ├─ Once confirmed: Update terminal
   └─ Return tx hash to dashboard

6. Terminal Output
   ├─ [1Shot] Using payment token: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   ├─ ⚡ HIGH PRIORITY — will re-check in 30s
   ├─ [SYS] Executing SELL $10.00 of ETH → USDC...
   ├─ ⏳ Swap pending — task_xxxxx
   ├─ ✓ Swap confirmed — tx: 0x7f4a...
   └─ [SYS] Next scan in 30s
```

---

## Gas Payment Flow (ERC-7710)

### When User Has < $0.005 USDC

```
1. User initiates swap (has 0 USDC balance)
   
2. 1-Shot Relayer detects:
   └─ "No USDC available for gas payment"
   
3. Activate MetaMask ERC-7710
   ├─ Create smart account (delegation)
   ├─ Authorize relayer to pay gas
   └─ Relayer covers gas cost
   
4. Relayer performs cost estimation:
   ├─ Estimated gas: 150,000 gas @ 25 gwei = ~$0.15
   ├─ Token: USDC (6 decimals)
   ├─ Amount: 150000 (0.00015 USDC)
   └─ Charged to relayer account
   
5. User receives:
   └─ Full USDC output from swap (no gas deducted)
   
6. Billing:
   ├─ Relayer batches gas costs
   ├─ Monthly reconciliation
   └─ Transparent on 1-Shot dashboard
```

---

## Terminal Output Examples

### Successful Swap Execution

```
═══ CryptoGuardian Agent Scan ═══
[SYS] Network: Ethereum Sepolia (testnet)
[SYS] Fear & Greed Index: 22/100 (Extreme Fear)
[SYS] Assets to scan: 1 — ordered by risk priority
[INF] Priority queue: ETH [!DANGER]
────────────────────────────────────────────────
[INF] Fetching news & market context...        ETH
[AI]  📰 ETH declined 8% in 1h on liquidation concerns…
[SYS] Running AI analysis across all assets...
[OK]  ✓ Venice AI analysis complete (Venice AI)
[SYS] ────────────────────────────────────────
[INF] $2,456.78 | 1h: -8.45% | 24h: -12.30%   ETH
[WRN] ⬆ Risk escalated: NEUTRAL → DANGER       ETH
[ERR] 🔴 VERDICT: DANGER                        ETH
[SYS] Priority ranking: ETH(4)
[ERR] 🚨 CRITICAL: ETH flagged DANGER — forcing swap to USDC
[WRN] Executing SELL $20.50 of ETH → USDC...
[INF] ⏳ Swap pending — task_7f4a9c2b
[OK]  ✓ Swap confirmed — tx: 0x7f4a9c2b8ef14...
[SYS] Next scan in 30s (worst verdict: DANGER)
[SYS] Scan complete in 2.3s
```

### Low Balance Warning

```
[INF] Checking balances...
[WRN] WETH balance: 0.00001 WETH ($0.02)
[WRN] ⬇ Balance too low ($0.02 < $0.005 minimum)
[SYS] Monitoring stopped for WETH — below threshold
```

### Network Error (Fallback to Local Analysis)

```
[WRN] ⚠ AI providers unavailable — using local price-momentum analysis
[INF] Estimated fee: $0.15 USDC
[INF] Running local analyzer...
[OK]  Local analysis complete
```

---

## Monitoring Dashboard

### Real-Time Stats

```
Agent Status:   RUNNING
Next Scan:      28s
Next Target:    ETH
Fee Estimate:   $0.12 USDC

Asset Priority:
┌─────────────────┬──────────┐
│ ETH             │ 🔴 DANGER│ ████████  (100%)
│ WETH            │ ⚪ NEUTRAL│ ██        (25%)
└─────────────────┴──────────┘
```

### Terminal Filter Options

```
ALL  |  ETH  |  WETH  |  Auto-scroll↓  |  Clear
```

---

## Error Codes & Resolution

| Code | Message | Fix |
|------|---------|-----|
| `BALANCE_TOO_LOW` | Balance < $0.005 USD | Add funds via faucet |
| `NO_BALANCE` | isHeld = false | Token not held above dust |
| `INVALID_STABLECOIN` | USDT selected | Only USDC supported |
| `SWAP_ERROR` | 1-Shot failed | Check relayer status |
| `PRICE_ERROR` | CoinGecko unavailable | Falls back to local analysis |

---

## Quick Commands

### Check Swap Status
```bash
# View terminal page
# Filter by coin
# Scroll to latest logs
```

### Get Testnet Funds
```
ETH Faucet:    https://sepolia-faucet.pk910.de
USDC Faucet:   https://faucet.circle.com
WETH Wrap:     https://app.uniswap.org (wrap ETH → WETH)
```

### Verify On-Chain
```
Explorer:      https://sepolia.etherscan.io
USDC Address:  0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
WETH Address:  0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9
```

---

## Performance Metrics

| Metric | Value | Note |
|--------|-------|------|
| Scan Interval (DANGER) | 30 seconds | High priority |
| Scan Interval (CAUTION) | 60 seconds | Moderate watch |
| Scan Interval (NEUTRAL) | 100 seconds | Low priority |
| Avg Analysis Time | 2-3 seconds | Venice AI processing |
| Swap Execution | Pending → Confirmed | 10-30 seconds (testnet) |
| Gas Cost | $0.05-$0.20 USDC | Paid by relayer (ERC-7710) |

---

## Safety Checks

✅ **Automatic Protections:**
- Assets < $0.005 USD: Not monitored
- Real on-chain execution: No simulation fallback
- Gas delegation: ERC-7710 smart account
- Slippage protection: 1% default on swaps
- Deadline: 20 minutes per swap

⚠️ **Manual Verification:**
- Check terminal before production deployment
- Verify first swap on Etherscan
- Monitor gas costs (should be $0.05-$0.20)
- Confirm USDC balance after swap

---

Ready to run! Start with `npm run dev` and navigate to `/dashboard` to trigger your first scan. 🚀
