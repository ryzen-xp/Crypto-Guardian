# Coin Configuration

## Base Mainnet Token Addresses

> **Note:** Always verify addresses on Basescan before using in production.
> Source: official project deployments + bridge contracts.

| Symbol | Name               | Base Address                                 | Decimals | CoinGecko ID  |
| ------ | ------------------ | -------------------------------------------- | -------- | ------------- |
| WETH   | Wrapped ETH        | `0x4200000000000000000000000000000000000006` | 18       | ethereum      |
| USDC   | USD Coin           | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6        | usd-coin      |
| LINK   | Chainlink          | `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196` | 18       | chainlink     |
| UNI    | Uniswap            | `0xc3De830EA07524a0761646a6a4e4be0e114a3C83` | 18       | uniswap       |
| AAVE   | Aave               | `0x63706e401c06ac8513145d0C9A67be75F047dfb4` | 18       | aave          |
| MATIC  | Polygon            | TBD — verify bridged address                 | 18       | matic-network |
| ARB    | Arbitrum           | TBD — verify bridged address                 | 18       | arbitrum      |
| OP     | Optimism           | TBD — verify bridged address                 | 18       | optimism      |
| DOGE   | Dogecoin (wrapped) | TBD — verify wrapped address                 | 8        | dogecoin      |
| SHIB   | Shiba Inu          | TBD — verify Base address                    | 18       | shiba-inu     |
| PEPE   | Pepe               | TBD — verify Base address                    | 18       | pepe          |

> **TODO before launch:** Fill in TBD addresses. Check:
>
> - Base Bridge: https://bridge.base.org
> - Basescan token list: https://basescan.org/tokens

---

## Uniswap v3 Pool Addresses on Base

Key pools needed for swaps (all paired with USDC):

| Pair      | Fee Tier | Pool Address           |
| --------- | -------- | ---------------------- |
| WETH/USDC | 0.05%    | Verify on Uniswap Info |
| LINK/USDC | 0.3%     | Verify on Uniswap Info |
| UNI/USDC  | 0.3%     | Verify on Uniswap Info |
| AAVE/USDC | 0.3%     | Verify on Uniswap Info |

> **Reference:** https://info.uniswap.org/#/base

**Uniswap V3 SwapRouter02 on Base:**
`0x2626664c2603336E57B271c5C0b26F421741e481`

---

## CoinGecko ID Reference

Used in the CoinGecko API call — must match exactly.

```
ids=ethereum,matic-network,arbitrum,optimism,chainlink,uniswap,aave,dogecoin,shiba-inu,pepe
```

Full CoinGecko request:

```
https://api.coingecko.com/api/v3/simple/price
  ?ids=ethereum,matic-network,arbitrum,optimism,chainlink,uniswap,aave,dogecoin,shiba-inu,pepe
  &vs_currencies=usd
  &include_1h_change=true
  &include_24hr_change=true
```

> CoinGecko free tier allows ~30 requests/min. The agent loop makes 1 request every 15 minutes — well within limits.

---

## Verdict Threshold Guidelines (Venice AI tuning)

These are embedded in the Venice AI system prompt to calibrate severity:

| Condition                           | Suggested Verdict      |
| ----------------------------------- | ---------------------- |
| 1hr change < -8% + Fear index < 25  | DANGER                 |
| 1hr change < -4% OR Fear index < 30 | CAUTION                |
| 1hr change between -4% and +4%      | NEUTRAL                |
| 1hr change > 6% + positive news     | OPPORTUNITY            |
| 1hr change > 10% + Fear index > 70  | CAUTION (overextended) |

> Note: These are guidelines in the prompt. Venice AI weighs news context too — a -6% drop after a project hack is DANGER; a -6% correction after a 40% pump might be CAUTION.

---

## Risk Sensitivity Mapping

| User Setting       | Conservative | Moderate         | Aggressive       |
| ------------------ | ------------ | ---------------- | ---------------- |
| Triggers SELL on   | DANGER only  | DANGER + CAUTION | DANGER + CAUTION |
| Triggers BUY on    | Never        | OPPORTUNITY      | OPPORTUNITY      |
| Swap % of position | 25%          | 50%              | 75%              |

Default for new users: **Conservative**
