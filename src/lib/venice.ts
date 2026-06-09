/**
 * AI Analysis Module — Multi-Provider with Automatic Fallback
 *
 * Priority chain:
 *   1. Venice AI  (llama-3.3-70b + web search) — primary, best quality
 *   2. Groq       (llama-3.3-70b, free tier, no credit card) — fast fallback
 *   3. Gemini     (gemini-2.0-flash, free tier, no credit card) — secondary fallback
 *   4. Local      (rule-based, price momentum + Fear & Greed) — always works
 *
 * Get free API keys:
 *   Groq:   https://console.groq.com  (free, no card, 14,400 req/day)
 *   Gemini: https://aistudio.google.com/apikey  (free, no card, 1,000 req/day)
 */

import type { AnalysisResult, MarketContext, Verdict } from './types'

// ─── Shared system prompt ─────────────────────────────────────────────────────

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

// ─── Provider definitions ─────────────────────────────────────────────────────

type Provider = {
  name: string
  envKey: string
  url: string
  model: string
  /** Whether this provider uses OpenAI-compatible /chat/completions format */
  openAICompat: boolean
  /** Gemini uses a different API shape */
  isGemini?: boolean
  /** Whether this provider supports web_search tool */
  supportsWebSearch: boolean
}

const PROVIDERS: Provider[] = [
  {
    name: 'Venice AI',
    envKey: 'VENICE_API_KEY',
    url: 'https://api.venice.ai/api/v1/chat/completions',
    model: 'llama-3.3-70b',
    openAICompat: true,
    supportsWebSearch: true,
  },
  {
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    openAICompat: true,
    supportsWebSearch: false,
  },
  {
    name: 'Gemini',
    envKey: 'GEMINI_API_KEY',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    openAICompat: false,
    isGemini: true,
    supportsWebSearch: false,
  },
]

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

/** Make an OpenAI-compatible chat completion request */
async function openAICompatRequest(
  provider: Provider,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options?: { tools?: unknown[]; tool_choice?: string; temperature?: number; max_tokens?: number }
): Promise<string> {
  const body: Record<string, unknown> = {
    model: provider.model,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.max_tokens ?? 600,
  }

  if (options?.tools) {
    body['tools'] = options.tools
    body['tool_choice'] = options.tool_choice ?? 'auto'
  }

  const res = await fetch(provider.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`${provider.name} error ${res.status}: ${text}`)
      ; (err as Error & { status: number }).status = res.status
    throw err
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  const content = data.choices[0]?.message?.content
  if (!content) throw new Error(`${provider.name} returned empty response`)
  return content
}

/** Make a Gemini generateContent request */
async function geminiRequest(
  provider: Provider,
  apiKey: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  // Gemini uses a different message structure
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  // Prepend system prompt as first user message for Gemini
  const systemMsg = messages.find((m) => m.role === 'system')
  if (systemMsg) {
    contents.unshift({ role: 'user', parts: [{ text: systemMsg.content }] })
    // Gemini needs alternating roles, so add a model ack
    contents.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'Understood. I will analyze the market data and return only valid JSON.' }],
    })
  }

  const url = `${provider.url}?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`Gemini error ${res.status}: ${text}`)
      ; (err as Error & { status: number }).status = res.status
    throw err
  }

  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
  }

  const text = data.candidates[0]?.content?.parts[0]?.text
  if (!text) throw new Error('Gemini returned empty response')
  return text
}

/** Unified request dispatcher */
async function callProvider(
  provider: Provider,
  messages: Array<{ role: string; content: string }>,
  options?: { tools?: unknown[]; tool_choice?: string; temperature?: number; max_tokens?: number }
): Promise<string> {
  const apiKey = process.env[provider.envKey]
  if (!apiKey) throw new Error(`${provider.name}: ${provider.envKey} not configured`)

  if (provider.isGemini) {
    return geminiRequest(provider, apiKey, messages)
  }
  return openAICompatRequest(provider, apiKey, messages, options)
}

// ─── Venice web search (best effort only) ────────────────────────────────────

export async function searchCoinNews(coinSymbol: string, coinName: string): Promise<string> {
  const venice = PROVIDERS[0]! // Venice is always index 0
  const apiKey = process.env[venice.envKey]
  if (!apiKey) return `No recent news found for ${coinSymbol}.`

  try {
    const content = await openAICompatRequest(
      venice,
      apiKey,
      [
        {
          role: 'user',
          content: `Search for: latest crypto news and price action for ${coinName} (${coinSymbol}) in the last 1 hour. Focus on major price movements, hacks, protocol news, partnerships, regulatory news. Summarize in 2-3 sentences.`,
        },
      ],
      {
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        max_tokens: 300,
      }
    )
    return content.trim()
  } catch {
    // News search is best-effort — never block the main analysis
    return `No recent news found for ${coinSymbol}.`
  }
}

export async function fetchAllCoinNews(
  activeCoins: string[],
  coinNames: Record<string, string>
): Promise<Record<string, string>> {
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

// ─── Main analysis — cascades through all providers ──────────────────────────

export async function analyzeMarket(context: MarketContext): Promise<AnalysisResult> {
  const messages = [
    { role: 'system', content: ANALYST_SYSTEM_PROMPT },
    { role: 'user', content: buildAnalysisMessage(context) },
  ]

  const errors: string[] = []

  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.envKey]
    if (!apiKey) {
      errors.push(`${provider.name}: key not configured (${provider.envKey})`)
      continue
    }

    try {
      console.warn(`[ai] Trying ${provider.name}...`)
      const raw = await callProvider(provider, messages, { temperature: 0.3, max_tokens: 1200 })
      const result = parseAIResponse(raw, context.activeCoins)

      console.warn(`[ai] Success with ${provider.name}`)
      return {
        ...result,
        rawResponse: `[provider:${provider.name}] ${raw}`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${provider.name}: ${msg}`)
      console.warn(`[ai] ${provider.name} failed — ${msg}`)
      // Continue to next provider
    }
  }

  // All AI providers failed — use local rule-based analyser
  console.warn('[ai] All providers failed — using local analyser.', errors)
  return localAnalyser(context, errors)
}

// ─── Response parser (works for all providers) ────────────────────────────────

function parseAIResponse(raw: string, activeCoins: string[]): AnalysisResult {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    // Log more context for debugging
    const preview = cleaned.length > 500 ? cleaned.slice(0, 500) + '...' : cleaned
    console.error(`[ai] JSON parse failed. Length: ${cleaned.length}. Content: ${preview}`)
    throw new Error(`Invalid JSON from AI provider. Response length: ${cleaned.length}. First 200 chars: ${cleaned.slice(0, 200)}`)
  }

  if (!parsed['verdicts'] || !parsed['priority_coin'] || !parsed['reasoning']) {
    throw new Error(`Missing required fields: ${JSON.stringify(Object.keys(parsed))}`)
  }

  const validVerdicts: Verdict[] = ['DANGER', 'CAUTION', 'NEUTRAL', 'OPPORTUNITY']
  const verdicts = parsed['verdicts'] as Record<string, string>

  for (const symbol of activeCoins) {
    if (!(symbol in verdicts)) verdicts[symbol] = 'NEUTRAL'
  }

  for (const [coin, verdict] of Object.entries(verdicts)) {
    if (!validVerdicts.includes(verdict as Verdict)) {
      console.warn(`Invalid verdict for ${coin}: ${verdict} — defaulting to NEUTRAL`)
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

// ─── Local rule-based analyser (no AI, no network) ───────────────────────────

function localAnalyser(context: MarketContext, providerErrors: string[]): AnalysisResult {
  const { prices, fearGreed, activeCoins } = context
  const verdicts: Record<string, Verdict> = {}
  const scores: Record<string, number> = {}

  for (const symbol of activeCoins) {
    const p = prices[symbol]
    if (!p) {
      verdicts[symbol] = 'NEUTRAL'
      scores[symbol] = 0
      continue
    }

    const { usd_1h_change: h1, usd_24h_change: h24 } = p
    const fg = fearGreed.value
    let score = 0

    if (h1 <= -8) score -= 4
    else if (h1 <= -5) score -= 3
    else if (h1 <= -3) score -= 2
    else if (h1 <= -1) score -= 1
    else if (h1 >= 8) score += 4
    else if (h1 >= 5) score += 3
    else if (h1 >= 3) score += 2
    else if (h1 >= 1) score += 1

    if (h24 <= -12) score -= 2
    else if (h24 <= -6) score -= 1
    else if (h24 >= 12) score += 2
    else if (h24 >= 6) score += 1

    if (fg <= 20 && score < 0) score -= 2
    if (fg <= 25 && score < 0) score -= 1
    if (fg >= 80 && score > 0) score -= 1

    scores[symbol] = score
    if (score <= -5) verdicts[symbol] = 'DANGER'
    else if (score <= -2) verdicts[symbol] = 'CAUTION'
    else if (score >= 4) verdicts[symbol] = 'OPPORTUNITY'
    else verdicts[symbol] = 'NEUTRAL'
  }

  const priorityCoin =
    activeCoins.reduce((worst, sym) => {
      const ws = scores[worst] ?? 0
      const cs = scores[sym] ?? 0
      return Math.abs(cs) > Math.abs(ws) ? sym : worst
    }, activeCoins[0] ?? 'ETH') ?? 'ETH'

  const priorityScore = scores[priorityCoin] ?? 0
  const priorityAction: 'BUY' | 'SELL' | 'HOLD' =
    priorityScore <= -2 ? 'SELL' : priorityScore >= 4 ? 'BUY' : 'HOLD'
  const priorityVerdict = verdicts[priorityCoin] ?? 'NEUTRAL'
  const coinPrice = prices[priorityCoin]
  const h1 = coinPrice?.usd_1h_change?.toFixed(2) ?? '0'
  const h24 = coinPrice?.usd_24h_change?.toFixed(2) ?? '0'

  const verdictPhrases: Record<Verdict, string> = {
    DANGER: `${priorityCoin} is showing significant downside momentum (${h1}% in 1h, ${h24}% in 24h) with Fear & Greed at ${fearGreed.value} (${fearGreed.label}). Capital protection recommended.`,
    CAUTION: `${priorityCoin} is showing early warning signals (${h1}% in 1h) with market sentiment at ${fearGreed.label} (${fearGreed.value}). Monitor closely and consider reducing exposure.`,
    OPPORTUNITY: `${priorityCoin} is displaying strong positive momentum (${h1}% in 1h, ${h24}% in 24h) with market sentiment at ${fearGreed.label} (${fearGreed.value}). Momentum indicators support adding to position.`,
    NEUTRAL: `${priorityCoin} is within normal range (${h1}% in 1h, ${h24}% in 24h) with Fear & Greed at ${fearGreed.value} (${fearGreed.label}). No action required — continue holding.`,
  }

  const reasoning =
    `[Local price analysis — all AI providers unavailable] ` +
    (verdictPhrases[priorityVerdict] ?? verdictPhrases.NEUTRAL)

  return {
    verdicts,
    priorityCoin,
    priorityAction,
    reasoning,
    confidence: 'MEDIUM',
    rawResponse: JSON.stringify({
      source: 'local-analyser',
      errors: providerErrors,
    }),
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

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

// ─── Status helpers ───────────────────────────────────────────────────────────

export function getConfiguredProviders(): string[] {
  return PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => p.name)
}

export function isVeniceConfigured(): boolean {
  return Boolean(process.env.VENICE_API_KEY)
}
