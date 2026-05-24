import { NextRequest, NextResponse } from 'next/server'
import { parseSMSResponse } from '@/lib/sms/parser'
import { handleInboundCommand } from '@/lib/sms/inbound-handlers'
import { createServiceClient } from '@/lib/supabase/server'
import { isInboundRateLimited } from '@/lib/utils/rate-limit'
import { handleBuddyInbound } from '@/lib/buddy/service'
import crypto from 'crypto'

const MAX_MESSAGE_LENGTH = 500

function verifyMsg91Webhook(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.MSG91_WEBHOOK_SECRET
  if (!secret) return false

  // Prefer HMAC-SHA256 header if MSG91 sends it
  const hmacHeader = request.headers.get('x-msg91-signature')
  if (hmacHeader) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(expected))
  }

  // Fall back to query-string secret
  const querySecret = request.nextUrl.searchParams.get('secret')
  return querySecret === secret
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    if (!verifyMsg91Webhook(request, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const body = JSON.parse(rawBody)
    const rawSender: string = body.sender ?? ''
    const messageBody: string = (body.message ?? '').substring(0, MAX_MESSAGE_LENGTH)

    if (!rawSender || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const from = rawSender.startsWith('+') ? rawSender : `+${rawSender}`

    if (await isInboundRateLimited(from)) {
      console.warn(`[MSG91 webhook] Rate limit hit for ${from}`)
      return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
    }

    if (await handleBuddyInbound(from, messageBody)) {
      return NextResponse.json({ message: 'Buddy reply handled' }, { status: 200 })
    }

    const supabase = createServiceClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('phone_number', from).single()

    if (profileError || !profile) {
      await supabase.from('sms_messages').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        phone_number: from,
        message_body: messageBody,
        direction: 'inbound',
        status: 'received',
        provider: 'msg91',
      })
      return NextResponse.json({ message: 'User not found' }, { status: 200 })
    }

    await supabase.from('sms_messages').insert({
      user_id: profile.id,
      phone_number: from,
      message_body: messageBody,
      direction: 'inbound',
      status: 'received',
      provider: 'msg91',
    })

    const parsed = parseSMSResponse(messageBody)
    await handleInboundCommand(parsed, profile.id, from, 'sms')

    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error) {
    console.error('MSG91 webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
