/**
 * Demo data — ETH, WBTC, ARB, OP with realistic verdicts.
 */
import type { AgentAction, VerdictMap } from './types'

export const DEMO_VERDICTS: VerdictMap = {
  ETH: 'NEUTRAL',
  WBTC: 'OPPORTUNITY',
  ARB: 'DANGER',
  OP: 'CAUTION',
}

export const DEMO_PRICES: Record<
  string,
  { usd: number; usd_1h_change: number; usd_24h_change: number }
> = {
  ETH: { usd: 3421.5, usd_1h_change: -0.42, usd_24h_change: 2.18 },
  WBTC: { usd: 67240.0, usd_1h_change: 1.8, usd_24h_change: 4.3 },
  ARB: { usd: 1.124, usd_1h_change: -14.8, usd_24h_change: -18.2 },
  OP: { usd: 2.341, usd_1h_change: -3.9, usd_24h_change: -6.4 },
}

export const DEMO_REASONING =
  'ARB has dropped 15% in 1 hour following a failed governance vote and token unlock event with Fear index at 28. Momentum is clearly negative — swapping to stablecoin protects capital before further deterioration.'

export const DEMO_PRIORITY_COIN = 'ARB'

export const DEMO_FEAR_GREED = { value: 28, label: 'Fear' }

export const DEMO_ACTIONS: AgentAction[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    coin: 'ARB',
    verdict: 'DANGER',
    action: 'SELL',
    amountUSD: 280,
    reasoning: 'ARB dropped 15% on governance failure. Swapping to USDC for capital protection.',
    txHash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    status: 'confirmed',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 17 * 60 * 1000),
    coin: 'WBTC',
    verdict: 'OPPORTUNITY',
    action: 'BUY',
    amountUSD: 200,
    reasoning: 'WBTC momentum positive following ETF inflow news. Strong upside momentum.',
    txHash: '0xdef789abc123def789abc123def789abc123def789abc123def789abc123def7',
    status: 'confirmed',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 32 * 60 * 1000),
    coin: 'OP',
    verdict: 'CAUTION',
    action: 'SKIPPED',
    amountUSD: 0,
    reasoning: 'Conservative mode: only acting on DANGER, current verdict is CAUTION.',
    status: 'skipped',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 47 * 60 * 1000),
    coin: 'ETH',
    verdict: 'NEUTRAL',
    action: 'SKIPPED',
    amountUSD: 0,
    reasoning: 'ETH within normal range. No action required.',
    status: 'skipped',
  },
]

export const DEMO_NEWS: Record<string, string> = {
  ETH: 'Ethereum network activity steady. EIP-7702 adoption growing. No major negative news in the last hour.',
  WBTC: 'Bitcoin ETF inflows strong this week. Institutional demand driving positive momentum across BTC-correlated assets.',
  ARB: 'Arbitrum governance vote failed with 62% opposition. Large token unlock event approaching. Selling pressure elevated.',
  OP: 'Optimism Superchain expansion continues but broader L2 sentiment weak. OP underperforming relative to ETH.',
}
