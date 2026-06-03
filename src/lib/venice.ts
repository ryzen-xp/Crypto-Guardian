import type { AnalysisResult, MarketContext, Verdict } from './types'

const VENICE_API_URL = 'https://api.venice.ai/api/v1/chat/completions'
const VENICE_MODEL = 'llama-3.3-70b'

// ─── System Prompt ────────────────────────────────────────────────────────────

const ANALYST_SYSTEM_PROMPT = `You are a senior crypto risk analyst with 15 years experience watching volatile markets. You monitor multiple EVM coins simultaneously like a trading desk.

Your job:
1. Analyze the market data provided (prices, % changes, fear/greed index, recent news)
2. For EACH coin in the activeCoins list, give a verdict: DANGER / CAUTION / NEUTRAL / OPPORTUNITY
3. Identify the ONE coin needing immediate action
4. Explain your decision in exactly 2 sentences using expert-level insight

Verdict definitions:
- DANGER: Immediate risk of significant loss. Recommend protecting capital now.
- CAUTION: Warning signs present. Monitor closely, consider reducing exposure.
- NEUTRAL: No significant movement. Hold current position.
- OPPORTUNITY: Strong positive momentum with fundamental backing. Consider adding.

Rules:
- Never predict exact prices
- Assess momentum and risk only
- Consider news context heavily — a -5% move after a hack is DANGER; after a 50% pump it may be CAUTION
- Fear & Greed below 20 amplifies DANGER signals, above 80 amplifies CAUTION on pumps
- Return ONLY valid JSON matching the schema. No text outside the JSON object.`

// ─── Venice API Client ────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.VENICE_API_KEY
  if (!key) throw new Error('VENICE_API_KEY environment variable is not set')
  return key
}

async function veniceRequest(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(VENICE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Venice API error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  const content = data.choices[0]?.message?.content
  if (!content) throw new Error('Venice returned empty response')

  return content
}

// ─── Web Search Call ──────────────────────────────────────────────────────────

/**
 * Searches Venice for latest news on a specific coin.
 * Returns a brief summary string.
 */
export async function searchCoinNews(coinSymbol: string, coinName: string): Promise<string> {
  try {
    const content = await veniceRequest({
      model: VENICE_MODEL,
      tools: [{ type: 'web_search' }],
      tool_choice: 'auto',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Search for: latest crypto news and price action for ${coinName} (${coinSymbol}) in the last 1 hour. Focus on major price movements, hacks, protocol news, partnerships, regulatory news. Summarize in 2-3 sentences.`,
        },
      ],
    })

    return content.trim()
  } catch {
    // Graceful fallback — don't let one coin's news failure kill the whole loop
    return `No recent news found for ${coinSymbol}.`
  }
}

/**
 * Fetch news for all active coins in parallel (rate-limited to avoid hammering Venice).
 */
export async function fetchAllCoinNews(
  activeCoins: string[],
  coinNames: Record<string, string>
): Promise<Record<string, string>> {
  // Process in batches of 3 to respect rate limits
  const batchSize = 3
  const results: Record<string, string> = {}

  for (let i = 0; i < activeCoins.length; i += batchSize) {
    const batch = activeCoins.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((symbol) => searchCoinNews(symbol, coinNames[symbol] ?? symbol))
    )
    batch.forEach((symbol, idx) => {
      results[symbol] = batchResults[idx] ?? `No news for ${symbol}.`
    })
  }

  return results
}

// ─── Analysis Call ────────────────────────────────────────────────────────────

/**
 * Main analysis call — sends all market data and gets verdicts back.
 */
export async function analyzeMarket(context: MarketContext): Promise<AnalysisResult> {
  const userMessage = buildAnalysisMessage(context)

  const rawResponse = await veniceRequest({
    model: VENICE_MODEL,
    temperature: 0.3,
    max_tokens: 600,
    messages: [
      { role: 'system', content: ANALYST_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  })

  return parseVeniceResponse(rawResponse, context.activeCoins)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAnalysisMessage(context: MarketContext): string {
  const { prices, fearGreed, newsSnippets, activeCoins, userSettings } = context

  const priceLines = activeCoins
    .map((symbol) => {
      const p = prices[symbol]
      if (!p) return `${symbol}: price data unavailable`
      return `${symbol}: $${p.usd.toFixed(4)} USD | 1hr: ${p.usd_1h_change.toFixed(2)}% | 24hr: ${p.usd_24h_change.toFixed(2)}%`
    })
    .join('\n')

  const newsLines = activeCoins
    .map((symbol) => `${symbol}: ${newsSnippets[symbol] ?? 'No news available.'}`)
    .join('\n')

  const riskLines = activeCoins
    .map(
      (symbol) => `${symbol}: ${userSettings[symbol]?.riskSensitivity ?? 'moderate'} sensitivity`
    )
    .join('\n')

  return `Analyze these market conditions and return verdicts for each coin.

CURRENT MARKET DATA:
Fear & Greed Index: ${fearGreed.value} (${fearGreed.label})

COIN PRICES AND MOMENTUM:
${priceLines}

RECENT NEWS (last 1 hour):
${newsLines}

ACTIVE COINS TO ANALYZE: ${activeCoins.join(', ')}

USER RISK PROFILE:
${riskLines}

Return your analysis as JSON matching this exact schema:
{
  "verdicts": { "SYMBOL": "VERDICT", ... },
  "priority_coin": "SYMBOL",
  "priority_action": "SELL" | "BUY" | "HOLD",
  "reasoning": "Two sentence expert explanation here.",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}`
}

function parseVeniceResponse(raw: string, activeCoins: string[]): AnalysisResult {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    throw new Error(`Venice returned invalid JSON: ${cleaned.slice(0, 200)}`)
  }

  // Validate required fields
  if (!parsed['verdicts'] || !parsed['priority_coin'] || !parsed['reasoning']) {
    throw new Error(`Venice response missing required fields: ${JSON.stringify(parsed)}`)
  }

  const validVerdicts: Verdict[] = ['DANGER', 'CAUTION', 'NEUTRAL', 'OPPORTUNITY']
  const verdicts = parsed['verdicts'] as Record<string, string>

  // Fill in NEUTRAL for any missing active coins
  for (const symbol of activeCoins) {
    if (!(symbol in verdicts)) {
      verdicts[symbol] = 'NEUTRAL'
    }
  }

  // Validate verdict values
  for (const [coin, verdict] of Object.entries(verdicts)) {
    if (!validVerdicts.includes(verdict as Verdict)) {
      console.warn(`Invalid verdict for ${coin}: ${verdict}, defaulting to NEUTRAL`)
      verdicts[coin] = 'NEUTRAL'
    }
  }

  return {
    verdicts: verdicts as Record<string, Verdict>,
    priorityCoin: parsed['priority_coin'] as string,
    priorityAction: (parsed['priority_action'] as 'BUY' | 'SELL' | 'HOLD') ?? 'HOLD',
    reasoning: parsed['reasoning'] as string,
    confidence: (parsed['confidence'] as 'HIGH' | 'MEDIUM' | 'LOW') ?? 'MEDIUM',
    rawResponse: raw,
  }
}
