# Crypto-Guardian: 1-Shot Real Testnet Execution Configuration

**Date:** June 2024  
**Status:** ✅ Implementation Complete  
**Build Status:** ✅ TypeScript passing, Next.js compiled successfully

## Overview

Your Crypto-Guardian AI agent is now configured for **real automated swaps on Sepolia testnet** using the 1-Shot relayer with MetaMask ERC-7710 gas payment. The system monitors only USDC (stablecoin) and WETH (volatile asset), automatically executing swaps when AI analysis triggers.

---

## Key Changes Implemented

### 1. **Stablecoin Consolidation: USDC Only**
- ✅ **Removed:** USDT from all supported stablecoins
- ✅ **Kept:** USDC as the default and only stablecoin
- **Location:** `src/lib/coins.ts`
- **Config:** `STABLECOINS` object now contains only USDC
- **Default:** `DEFAULT_STABLECOIN = 'USDC'`

### 2. **Updated Sepolia Addresses**
All token addresses are now set to your specified contracts:

```typescript
// USDC (Stablecoin)
0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

// WETH (Volatile Asset)
0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9

// Uniswap V3 SwapRouter02 (testnet)
0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
```

**Files Updated:**
- `src/lib/coins.ts` - Token addresses
- `.env.local` - Environment variables (already set)

### 3. **Volatile Assets: ETH/WETH Only**
- ✅ **Removed:** WBTC, LINK, UNI from monitoring
- ✅ **Kept:** ETH (native) and WETH (wrapped)
- **Location:** `src/lib/coins.ts` → `MONITORED_COINS`
- **Swap Pair:** WETH ↔ USDC on Uniswap

### 4. **Minimum Balance Threshold ($0.005 USD)**
Any coin with balance < $0.005 USD is **automatically removed from monitoring**.

**Implementation:**
```typescript
// src/lib/balances.ts
export const MINIMUM_MONITOR_USD = 0.005

// Balance is "held" only if:
// 1. Above dust threshold (tokenomics check)
// 2. Worth at least $0.005 USD (monitoring threshold)
```

**Files Updated:**
- `src/lib/balances.ts` - Dust threshold logic
- `src/app/api/execute-swap/route.ts` - Balance validation before swap

### 5. **Real 1-Shot Execution (No Demo Mode)**
Swaps now execute **only on-chain** via 1-Shot's JSON-RPC relayer. No fallback to mock/simulation.

**Changes:**
- ✅ Removed all `DEMO_MODE` fallbacks
- ✅ Removed all `IS_TESTNET` demo mode returns
- ✅ Forced real 1-Shot relayer calls
- ✅ Errors propagate (no silent fallbacks)

**Files Updated:**
- `src/lib/oneshot.ts`:
  - `relayTransaction()` - Forces real execution
  - `relayUniswapSwap()` - No demo fallback
  - `getRelayStatus()` - Real status polling
  - `upgradeAccountEIP7702()` - ERC-7710 integration

**Log Output:**
```
[1Shot] Using payment token from capabilities: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
[1Shot] Real swap executed via 1Shot: task_xxxxx
[execute-swap] Real swap executed via 1Shot: task_xxxxx
```

### 6. **MetaMask ERC-7710 Gas Payment**
When user USDC balance < $0.005 USD, gas is paid via MetaMask's ERC-7710 smart account delegation.

**Implementation:**
- `src/lib/oneshot.ts` → `upgradeAccountEIP7702()`
- 1-Shot relayer discovers available payment tokens
- Falls back to USDC if available
- MetaMask handles the delegation transparently

**Gas Flow:**
1. User initiates swap (has < $0.005 USDC)
2. 1-Shot relayer detects insufficient balance for gas
3. MetaMask ERC-7710 smart account created
4. Gas delegated from relayer
5. Swap executed on-chain
6. MetaMask pays gas via delegation (batched billing)

### 7. **Terminal Overflow Management**
Terminal logs now properly handle large volumes:

**Features Already in Place:**
- Auto-scroll to bottom (respects manual scroll position)
- Per-coin filtering
- Fixed height with scrollable content area
- Line truncation for long messages
- Coin tag indicators for per-asset logs

**No changes needed** - terminal already has proper constraints:
```typescript
// Fixed height from execute-swap header
height="[calc(100vh-310px)] min-h-[400px]"

// Auto-scroll on new lines
useEffect(() => {
  if (autoScroll) {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
}, [terminalLines, autoScroll])
```

**Files:** `src/app/terminal/page.tsx`

---

## Swap Execution Flow

### When DANGER Verdict is Triggered:

```
1. AI Analysis detects DANGER (ETH/WETH price crash)
   ↓
2. Check balance in USD (price × formatted amount)
   ↓
3. If balance ≥ $0.005:
   - Build Uniswap calldata (V2 router on testnet)
   - Call 1-Shot relayer with JSON-RPC
   ↓
4. If balance < $0.005:
   - Stop monitoring this asset
   - Return error code: BALANCE_TOO_LOW
   ↓
5. 1-Shot Relayer:
   - Queries relayer capabilities
   - Gets USDC as payment token
   - Estimates gas cost
   - Sends transaction via ERC-7710
   - Returns task ID
   ↓
6. Terminal logs real execution:
   "✓ Swap confirmed — tx: 0x..."
```

### Agent Monitoring Intervals:

| Verdict | Re-check Interval | Purpose |
|---------|------------------|---------|
| **DANGER** | 30 seconds | Urgent protection |
| **CAUTION** | 60 seconds | Close watch |
| **OPPORTUNITY** | 75 seconds | Tracked closely |
| **NEUTRAL** | 100 seconds | Lower priority |
| AI providers unavailable | 5 minutes | Fallback mode |

---

## Environment Configuration

### Current `.env.local` Settings:

```bash
# Chain - Ethereum Sepolia Testnet
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CHAIN_NAME=sepolia
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.etherscan.io
NEXT_PUBLIC_IS_TESTNET=true

# Stablecoin - USDC Only
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Uniswap Router (V3 on testnet)
NEXT_PUBLIC_UNISWAP_ROUTER=0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E

# 1-Shot Relayer (Production)
ONESHOT_API_URL=https://app.1shotapi.com
```

### Testnet Relayer Endpoint:
```typescript
// For Sepolia (testnet)
https://relayer.1shotapi.dev/relayers

// Real execution happens here
// JSON-RPC method: relayer_send7710Transaction
```

---

## Testing the Implementation

### 1. Check Configuration
```bash
cd /home/ryzen/Desktop/Crypto-Guardian

# Build verification
npm run build

# Check for errors
# Should see: ✅ TypeScript passing
```

### 2. Run Agent Loop
```bash
# From dashboard, click "Run Scan"
# Watch terminal for:

# ✓ Price fetch successful
# ✓ Venice AI analysis complete
# 🟢 VERDICT: OPPORTUNITY (or other verdict)
# 🔴 VERDICT: DANGER (triggers swap)
```

### 3. Monitor Swap Execution
```bash
# Terminal logs will show:
# [1Shot] Using payment token from capabilities: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
# [1Shot] Real swap executed via 1Shot: task_xxxxx
# ✓ Swap confirmed — tx: 0x...
```

### 4. Verify On-Chain
```bash
# Go to Sepolia block explorer
https://sepolia.etherscan.io

# Search for task ID or tx hash
# Confirm swap executed in USDC/WETH pool
```

---

## Monitoring & Alerts

### Balance Monitoring:
- ✅ Assets < $0.005 USD: Automatically stopped
- ✅ Assets ≥ $0.005 USD: Actively monitored
- ✅ Terminal shows balance USD value

### Error Handling:
```typescript
// If balance < $0.005:
{
  "success": false,
  "error": "ETH balance ($0.002) is below minimum monitoring threshold ($0.005).",
  "code": "BALANCE_TOO_LOW"
}

// If 1-Shot fails:
{
  "success": false,
  "error": "[1Shot error message]",
  "code": "SWAP_ERROR"
}
```

### Real-Time Logs:
- Check `/terminal` page for live AI agent activity
- Filter by coin (ETH, WETH)
- Auto-scroll or manual scroll control
- Copy terminal output for debugging

---

## Important Notes

### ⚠️ Sepolia Testnet Only
- All swaps are on **testnet** only
- No real funds at risk
- Get testnet ETH: https://sepolia-faucet.pk910.de
- Get testnet USDC: https://faucet.circle.com

### ⚠️ 1-Shot Relayer
- Charges gas in USDC
- Estimated cost: $0.05-$0.20 per swap
- Batch billing with ERC-7710
- Real execution via JSON-RPC

### ⚠️ Terminal Overflow
- Terminal has **fixed height** with scrolling
- Auto-scroll to bottom on new lines
- Manual scroll disables auto-scroll (re-enable with button)
- Per-coin filtering available
- No data loss (logs persist in store)

---

## Summary of Changes by File

| File | Changes |
|------|---------|
| `src/lib/coins.ts` | Removed USDT, updated WETH/USDC addresses, kept only ETH/WETH |
| `src/lib/balances.ts` | Added $0.005 USD minimum monitoring threshold |
| `src/lib/oneshot.ts` | Removed all demo mode fallbacks, forced real execution, added ERC-7710 |
| `src/app/api/execute-swap/route.ts` | Added balance USD check, real 1-Shot execution |
| `src/lib/agent-engine.ts` | Pass prices to balance fetching for USD threshold |
| `.env.local` | Already configured with correct addresses |

---

## Next Steps

1. **Test on Testnet:**
   - Deploy to testnet environment
   - Get Sepolia test funds
   - Run agent scan and confirm swap execution

2. **Monitor First Swaps:**
   - Watch terminal logs
   - Verify tx on Etherscan
   - Confirm USDC balance changes

3. **Adjust Risk Settings:**
   - From settings page, tune risk sensitivity
   - Conservative: Only DANGER triggers swaps
   - Moderate: CAUTION + DANGER trigger swaps
   - Aggressive: OPPORTUNITY swaps enabled

4. **Production Deployment:**
   - Once tested, migrate to mainnet
   - Update `.env.local` with mainnet addresses
   - Keep same USDC/WETH configuration

---

## Support & Debugging

### Check Logs:
```bash
# Terminal page shows real-time logs
# Click coin filter to see per-asset logs
# Watch for [1Shot], [AI], [SYS] prefixes
```

### Verify 1-Shot Connection:
```typescript
// Check in browser console
fetch('https://relayer.1shotapi.dev/relayers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'relayer_getCapabilities',
    params: ['11155111']
  })
})
```

### Reset Agent State:
```bash
# Clear terminal logs
# Click "Clear" button in terminal page

# Reset balance cache
# Hard refresh browser (Ctrl+Shift+R)
```

---

**Build Status:** ✅ All TypeScript checks passing  
**Configuration:** ✅ Real 1-Shot execution ready  
**Testing:** Ready for Sepolia testnet deployment  

Good to go! 🚀
