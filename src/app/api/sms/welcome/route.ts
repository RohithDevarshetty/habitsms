import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'
import { WHATSAPP_TEMPLATES } from '@/lib/meta/templates'
import type { MessageChannel } from '@/lib/twilio/client'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get user profile and first habit
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, preferred_channel')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: habits } = await supabase
      .from('habits')
      .select('reminder_time')
      .eq('user_id', userId)
      .order('reminder_time', { ascending: true })
      .limit(1)

    const firstReminderTime = habits?.[0]?.reminder_time || '07:00'

    // Get user's first name (if available from email/metadata)
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

    const channel: MessageChannel =
      profile.preferred_channel === 'whatsapp' ? 'whatsapp' : 'sms'

    await sendSMS({
      to: profile.phone_number,
      message: SMS_TEMPLATES.WELCOME(firstName, firstReminderTime),
      userId,
      channel,
      template:
        channel === 'whatsapp'
          ? WHATSAPP_TEMPLATES.welcome(firstName, firstReminderTime)
          : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Welcome SMS error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send welcome SMS' },
      { status: 500 }
    )
  }
}
