import { type NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/oneshot'

type OneShotWebhookPayload = {
  relayId: string
  status: 'confirmed' | 'failed'
  txHash: string
  blockNumber: number
  gasUsedUSDC: string
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-oneshot-signature') ?? ''

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[webhooks] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody) as OneShotWebhookPayload
    const { relayId, status, txHash, gasUsedUSDC } = payload

    console.warn(
      `[webhooks] Relay ${relayId} → ${status} | tx: ${txHash} | gas: ${gasUsedUSDC} USDC`
    )

    // TODO: Update relay status in your DB / emit SSE to connected dashboard clients
    // For MVP: frontend polls /api/agent status; webhook logging is sufficient

    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhooks] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
