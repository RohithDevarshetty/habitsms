import { NextRequest, NextResponse } from 'next/server'
import { getMetaConfig, verifyMetaWebhook, parseMetaWebhookBody } from '@/lib/meta/whatsapp'
import { parseSMSResponse } from '@/lib/sms/parser'
import { handleInboundCommand } from '@/lib/sms/inbound-handlers'
import { createServiceClient } from '@/lib/supabase/server'
import { isInboundRateLimited } from '@/lib/utils/rate-limit'

const MAX_MESSAGE_LENGTH = 500

// Meta sends a GET to verify the webhook endpoint during setup
export async function GET(request: NextRequest) {
  const config = getMetaConfig()
  if (!config) return NextResponse.json({ error: 'Meta not configured' }, { status: 500 })

  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === config.verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const config = getMetaConfig()
    if (!config) return NextResponse.json({ error: 'Meta not configured' }, { status: 500 })

    const payload = await request.text()
    const signature = request.headers.get('x-hub-signature-256') || ''

    if (!verifyMetaWebhook(payload, signature, config.appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const body = JSON.parse(payload)
    const inbound = parseMetaWebhookBody(body)

    // Meta sends delivery receipts and other events — ignore non-message payloads
    if (!inbound) return NextResponse.json({ received: true })

    const { from, messageId } = inbound
    const text = inbound.text.substring(0, MAX_MESSAGE_LENGTH)
    const supabase = createServiceClient()

    if (await isInboundRateLimited(from)) {
      console.warn(`[Meta webhook] Rate limit hit for ${from}`)
      return NextResponse.json({ received: true })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('phone_number', from).single()

    if (profileError || !profile) {
      await supabase.from('sms_messages').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        phone_number: from,
        message_body: text,
        direction: 'inbound',
        status: 'received',
        provider: 'meta',
        provider_message_id: messageId,
      })
      return NextResponse.json({ received: true })
    }

    await supabase.from('sms_messages').insert({
      user_id: profile.id,
      phone_number: from,
      message_body: text,
      direction: 'inbound',
      status: 'received',
      provider: 'meta',
      provider_message_id: messageId,
    })

    const parsed = parseSMSResponse(text)
    await handleInboundCommand(parsed, profile.id, from, 'whatsapp')

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Meta webhook] Error:', error)
    // Always return 200 — Meta retries on non-200 which can cause loops
    return NextResponse.json({ received: true })
  }
}
