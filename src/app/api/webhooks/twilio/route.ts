import { NextRequest, NextResponse } from 'next/server'
import { verifyTwilioWebhook } from '@/lib/twilio/client'
import { parseSMSResponse } from '@/lib/sms/parser'
import { handleInboundCommand } from '@/lib/sms/inbound-handlers'
import { createServiceClient } from '@/lib/supabase/server'
import { isInboundRateLimited } from '@/lib/utils/rate-limit'
import { handleBuddyInbound } from '@/lib/buddy/service'

const MAX_MESSAGE_LENGTH = 500

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const body: Record<string, string> = {}
    formData.forEach((value, key) => { body[key] = value.toString() })

    const isDevMode = process.env.NODE_ENV === 'development' && process.env.SKIP_WEBHOOK_AUTH === 'true'
    if (!isDevMode) {
      const signature = request.headers.get('x-twilio-signature') || ''
      if (!verifyTwilioWebhook(signature, request.url, body)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const fromRaw = body.From as string
    const messageBody = (body.Body as string)?.substring(0, MAX_MESSAGE_LENGTH)
    const messageSid = body.MessageSid as string

    const isWhatsApp = fromRaw.startsWith('whatsapp:')
    const rawFrom = fromRaw.replace('whatsapp:', '').trim()
    const from = rawFrom.startsWith('+') ? rawFrom : `+${rawFrom}`
    const channel = isWhatsApp ? 'whatsapp' : 'sms'

    if (!from || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (await isInboundRateLimited(from)) {
      console.warn(`[Twilio webhook] Rate limit hit for ${from}`)
      return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
    }

    // Buddy opt-in / opt-out replies must be handled before normal user routing
    // because buddies are not always HabitSMS users themselves.
    if (await handleBuddyInbound(from, messageBody)) {
      return NextResponse.json({ message: 'Buddy reply handled' }, { status: 200 })
    }

    const supabase = createServiceClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', from)
      .single()

    if (profileError || !profile) {
      await supabase.from('sms_messages').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        phone_number: from,
        message_body: messageBody,
        direction: 'inbound',
        status: 'received',
        provider: 'twilio',
        provider_message_id: messageSid,
      })
      return NextResponse.json({ message: 'User not found' }, { status: 200 })
    }

    await supabase.from('sms_messages').insert({
      user_id: profile.id,
      phone_number: from,
      message_body: messageBody,
      direction: 'inbound',
      status: 'received',
      provider: 'twilio',
      provider_message_id: messageSid,
    })

    const parsed = parseSMSResponse(messageBody)
    await handleInboundCommand(parsed, profile.id, from, channel)

    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
