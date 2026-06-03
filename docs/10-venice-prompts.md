# Venice AI Prompts

All Venice AI prompts live here as the canonical reference. Update here first, then sync to `src/lib/venice.ts`.

---

## System Prompt — Market Analyst

```
You are a senior crypto risk analyst with 15 years experience watching volatile markets. You monitor multiple EVM coins simultaneously like a trading desk.

Your job:
1. Analyze the market data provided (prices, % changes, fear/greed index, recent news)
2. For EACH coin, give a verdict: DANGER / CAUTION / NEUTRAL / OPPORTUNITY
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
- Consider news context heavily — a -5% move after a hack is DANGER, after a 50% pump it may be CAUTION
- Fear & Greed below 20 amplifies DANGER signals, above 80 amplifies CAUTION on pumps
- Return ONLY valid JSON matching the schema provided. No additional text.
```

---

## User Message Template — Analysis Call

```
Analyze these market conditions and return verdicts for each coin.

CURRENT MARKET DATA:
Fear & Greed Index: {value} ({label})

COIN PRICES AND MOMENTUM:
{forEach coin:}
{SYMBOL}: ${price} USD | 1hr: {change1h}% | 24hr: {change24h}%
{/forEach}

RECENT NEWS (last 1 hour):
{forEach coin:}
{SYMBOL}: {newsSnippet}
{/forEach}

ACTIVE COINS TO ANALYZE: {activeCoins.join(', ')}

USER RISK PROFILE:
{forEach activeCoin:}
{SYMBOL}: {riskSensitivity} sensitivity
{/forEach}

Return your analysis as JSON matching this exact schema:
{
  "verdicts": {
    "ETH": "NEUTRAL",
    "ARB": "DANGER",
    ...
  },
  "priority_coin": "ARB",
  "priority_action": "SELL",
  "reasoning": "Two sentence expert explanation here.",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}
```

---

## Web Search Query Template — News Call

```
Search for: latest crypto news and price action for {COIN_NAME} ({SYMBOL}) in the last 1 hour.
Focus on: major price movements, hacks, protocol news, partnership announcements, regulatory news.
Summarize key findings in 2-3 sentences.
```

---

## Venice API Call Structure

### Call 1: Web Search (per coin, run in parallel)

```typescript
const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b',
    tools: [{ type: 'web_search' }],
    tool_choice: 'auto',
    messages: [
      {
        role: 'user',
        content: `Search for: latest crypto news and price action for ${coinName} (${symbol}) in the last 1 hour. Focus on major price movements, hacks, protocol news, partnerships, regulatory news. Summarize in 2-3 sentences.`,
      },
    ],
    max_tokens: 200,
  }),
})
```

### Call 2: Full Analysis

```typescript
const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT, // from above
      },
      {
        role: 'user',
        content: buildAnalysisMessage(marketContext), // template from above
      },
    ],
    max_tokens: 600,
    temperature: 0.3, // lower = more consistent structured output
  }),
})
```

---

## Response Parsing

Venice will return a JSON string inside `choices[0].message.content`. Parse defensively:

````typescript
function parseVeniceResponse(raw: string): AnalysisResult {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(cleaned)

  // Validate expected fields
  if (!parsed.verdicts || !parsed.priority_coin || !parsed.reasoning) {
    throw new Error('Invalid Venice response structure')
  }

  // Validate all verdicts are valid values
  const validVerdicts = ['DANGER', 'CAUTION', 'NEUTRAL', 'OPPORTUNITY']
  for (const [coin, verdict] of Object.entries(parsed.verdicts)) {
    if (!validVerdicts.includes(verdict as string)) {
      throw new Error(`Invalid verdict for ${coin}: ${verdict}`)
    }
  }

  return {
    verdicts: parsed.verdicts,
    priorityCoin: parsed.priority_coin,
    priorityAction: parsed.priority_action,
    reasoning: parsed.reasoning,
    confidence: parsed.confidence || 'MEDIUM',
  }
}
````

---

## Prompt Tuning Notes

- **Temperature 0.3** — keeps output structured and consistent
- **max_tokens 600** — enough for all verdicts + reasoning
- If Venice returns invalid JSON more than once: add explicit instruction "Do not include any text outside the JSON object"
- If verdicts are too aggressive: add "Be conservative — only flag DANGER when there is clear evidence of immediate risk"
- If verdicts are too passive: add "This is real money. Don't hesitate to flag DANGER if momentum is clearly negative"
