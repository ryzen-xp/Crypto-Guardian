/**
 * Demo data for the working UI demo.
 * Used when no real API keys are present or for showcasing the dashboard.
 */
import type { AgentAction, VerdictMap } from './types'

export const DEMO_VERDICTS: VerdictMap = {
  ETH: 'NEUTRAL',
  MATIC: 'CAUTION',
  ARB: 'DANGER',
  OP: 'NEUTRAL',
  LINK: 'OPPORTUNITY',
  UNI: 'CAUTION',
  AAVE: 'NEUTRAL',
  DOGE: 'DANGER',
  SHIB: 'CAUTION',
  PEPE: 'NEUTRAL',
}

export const DEMO_PRICES: Record<
  string,
  { usd: number; usd_1h_change: number; usd_24h_change: number }
> = {
  ETH: { usd: 3421.5, usd_1h_change: -0.42, usd_24h_change: 2.18 },
  MATIC: { usd: 0.8234, usd_1h_change: -3.1, usd_24h_change: -5.4 },
  ARB: { usd: 1.124, usd_1h_change: -14.8, usd_24h_change: -18.2 },
  OP: { usd: 2.341, usd_1h_change: 0.12, usd_24h_change: 1.4 },
  LINK: { usd: 18.92, usd_1h_change: 6.7, usd_24h_change: 11.3 },
  UNI: { usd: 9.45, usd_1h_change: -3.8, usd_24h_change: -6.1 },
  AAVE: { usd: 112.4, usd_1h_change: 0.8, usd_24h_change: 3.2 },
  DOGE: { usd: 0.1823, usd_1h_change: -9.2, usd_24h_change: -12.7 },
  SHIB: { usd: 0.0000248, usd_1h_change: -4.1, usd_24h_change: -7.8 },
  PEPE: { usd: 0.0000132, usd_1h_change: 1.2, usd_24h_change: -2.3 },
}

export const DEMO_REASONING =
  'ARB has dropped 15% in 1 hour following negative governance news and elevated Fear index at 22. Momentum indicators suggest continued downside — moving to USDC protects capital before further deterioration.'

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
    reasoning: 'ARB dropped 15% on governance news. Swapping to USDC for capital protection.',
    txHash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    status: 'confirmed',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 17 * 60 * 1000),
    coin: 'LINK',
    verdict: 'OPPORTUNITY',
    action: 'BUY',
    amountUSD: 150,
    reasoning: 'LINK surging on Chainlink Functions launch. Positive momentum confirmed.',
    txHash: '0xdef789abc123def789abc123def789abc123def789abc123def789abc123def7',
    status: 'confirmed',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 32 * 60 * 1000),
    coin: 'DOGE',
    verdict: 'DANGER',
    action: 'SELL',
    amountUSD: 300,
    reasoning: 'DOGE flash crash triggered. Fear index at extreme low.',
    status: 'confirmed',
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
  {
    id: '5',
    timestamp: new Date(Date.now() - 62 * 60 * 1000),
    coin: 'MATIC',
    verdict: 'CAUTION',
    action: 'SKIPPED',
    amountUSD: 0,
    reasoning: 'Conservative mode: only acting on DANGER, current verdict is CAUTION.',
    status: 'skipped',
  },
]

export const DEMO_NEWS: Record<string, string> = {
  ETH: 'Ethereum network activity steady. Gas fees normal. No major protocol news.',
  MATIC: 'Polygon zkEVM seeing reduced activity. Some validator concerns raised.',
  ARB: 'Arbitrum governance vote failed with 62% opposition. Token unlocks approaching.',
  OP: 'Optimism Superchain expansion on track. Developer activity growing.',
  LINK: 'Chainlink Functions now live on 10 chains. Major DeFi integrations announced.',
  UNI: 'Uniswap v4 audit ongoing. Fee switch proposal gaining traction.',
  AAVE: 'Aave v3 GHO stablecoin supply growing. Protocol revenue at ATH.',
  DOGE: 'Large DOGE whale wallet moved 500M tokens. Market speculation rising.',
  SHIB: 'Shibarium transactions down 40% this week. Team silent on roadmap.',
  PEPE: 'PEPE memecoin trending on social media. No fundamental news.',
}
