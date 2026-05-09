import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'
import { createCheckoutSession, DODO_PRODUCT_IDS, SubscriptionTier } from '@/lib/payments/dodo'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://habitsms.com'

// Called server-side (e.g. hitting habit limit) with a service key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, tier } = body as { userId?: string; tier?: SubscriptionTier }

    // Determine caller: authenticated user or internal service call
    let resolvedUserId = userId
    if (!resolvedUserId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      resolvedUserId = user.id
    }

    const supabase = createServiceClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', resolvedUserId)
      .single()

    if (!profile?.phone_number) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let message: string

    if (tier && DODO_PRODUCT_IDS[tier]) {
      // Generate a direct checkout link for the specified tier
      const { data: { user } } = await supabase.auth.admin.getUserById(resolvedUserId)
      const email = user?.email || ''

      const session = await createCheckoutSession({
        userId: resolvedUserId,
        email,
        tier,
        successUrl: `${APP_URL}/dashboard?payment=success`,
        cancelUrl: `${APP_URL}/upgrade`,
      })

      message = SMS_TEMPLATES.PLAN_CHECKOUT(tier, session.checkout_url ?? `${APP_URL}/upgrade`)
    } else {
      message = SMS_TEMPLATES.UPGRADE()
    }

    const result = await sendSMS({
      to: profile.phone_number,
      message,
      userId: resolvedUserId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SMS Upgrade] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send upgrade SMS' },
      { status: 500 }
    )
  }
}
