# MetaMask Smart Accounts Guide

## Overview

CryptoGuardian uses MetaMask Smart Accounts Kit to:

1. Upgrade a regular EOA (wallet) to a Smart Account via EIP-7702
2. Grant granular permissions via ERC-7715 — agent can act without repeated signing
3. Enforce onchain spending caps per coin
4. Set 30-day permission expiry (renewable)

---

## Install

```bash
npm install @metamask/delegation-toolkit
```

---

## EIP-7702: Upgrade to Smart Account

EIP-7702 allows an existing EOA to behave as a Smart Account without changing its address. The upgrade is done once via 1Shot API.

```typescript
import { createDelegationFramework } from '@metamask/delegation-toolkit'

async function upgradeToSmartAccount(walletClient: WalletClient) {
  // 1Shot handles the EIP-7702 upgrade
  const response = await fetch(`${process.env.ONESHOT_API_URL}/v1/upgrade`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ONESHOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: walletClient.account.address,
      chainId: 8453,
    }),
  })

  const { smartAccountAddress, txHash } = await response.json()
  return smartAccountAddress
}
```

---

## ERC-7715: Grant Permissions

Permissions are granted ONCE and cover all monitored coins.

```typescript
import {
  createPermissionGrant,
  erc20TransferPermission,
  DailySpendingCap,
} from '@metamask/delegation-toolkit'

async function grantMonitoringPermissions(
  smartAccountAddress: string,
  coins: CoinConfig[],
  limits: CoinLimits,
  walletClient: WalletClient
) {
  const permissions = []

  // Add permission for each monitored coin
  for (const coin of coins) {
    permissions.push(
      erc20TransferPermission({
        token: coin.baseAddress,
        spender: AGENT_OPERATOR_ADDRESS, // your backend's address
        dailyCap: parseUnits(String(limits[coin.symbol].dailyLimitUSD), coin.decimals),
      })
    )
  }

  // Add USDC permission (for buying back in)
  permissions.push(
    erc20TransferPermission({
      token: USDC_ADDRESS,
      spender: AGENT_OPERATOR_ADDRESS,
      dailyCap: parseUnits('1000', 6), // $1000 USDC daily cap
    })
  )

  const grant = await createPermissionGrant({
    account: smartAccountAddress,
    permissions,
    expiry: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    walletClient,
  })

  return grant
}
```

---

## Checking Permission Status

```typescript
async function checkActivePermissions(address: string): Promise<PermissionStatus> {
  // Query onchain or from stored grant
  const grant = await fetchStoredGrant(address)

  if (!grant) return { active: false }

  const now = Math.floor(Date.now() / 1000)
  const isExpired = grant.expiry < now
  const daysLeft = Math.floor((grant.expiry - now) / 86400)

  return {
    active: !isExpired,
    expiresAt: new Date(grant.expiry * 1000),
    daysLeft,
    coinsPermitted: grant.permissions.map((p) => p.symbol),
    needsRenewal: daysLeft < 7,
  }
}
```

---

## UI Permission Flow (Setup Page)

```
Step 1: Connect MetaMask
    ↓
Step 2: Show "Upgrade to Smart Account" button
    → Calls 1Shot EIP-7702 upgrade
    → Shows: "Smart Account: 0x... ✓"
    ↓
Step 3: User selects coins + sets limits
    ↓
Step 4: Show permission summary:
    ┌─────────────────────────────────────────┐
    │  You are granting CryptoGuardian        │
    │  permission to protect:                 │
    │                                         │
    │  ✦ ETH — max $500/day                  │
    │  ✦ LINK — max $200/day                 │
    │  ✦ ARB — max $300/day                  │
    │                                         │
    │  Permission expires: July 3, 2026       │
    │  (renewable before expiry)              │
    │                                         │
    │  [Grant Permissions — Sign Once]        │
    └─────────────────────────────────────────┘
    ↓
Step 5: User signs → permissions active
    → Redirect to dashboard
```

---

## Permission Expiry Warning

Show banner on dashboard when expiry < 7 days:

```
⚠️  Your permissions expire in 5 days.
    [Renew Now] to keep CryptoGuardian protecting your portfolio.
```

Renewing re-runs the ERC-7715 grant flow with updated expiry.

---

## Key Addresses

```typescript
// Base Mainnet
const AGENT_OPERATOR_ADDRESS = '0x...' // Your backend wallet that executes swaps
// This address needs to be set up with 1Shot as the relayer operator

const METAMASK_DELEGATION_MANAGER = '0x...' // MetaMask's onchain delegation manager
// Get from @metamask/delegation-toolkit constants
```

---

## Reference

- MetaMask Delegation Toolkit docs: https://docs.metamask.io/delegation-toolkit
- ERC-7715 spec: https://eips.ethereum.org/EIPS/eip-7715
- EIP-7702 spec: https://eips.ethereum.org/EIPS/eip-7702
- 1Shot Smart Account upgrade: https://docs.1shotapi.com/smart-accounts
