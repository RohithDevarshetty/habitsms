import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, DODO_PRODUCT_IDS, SubscriptionTier } from '@/lib/payments/dodo'

const VALID_TIERS: SubscriptionTier[] = ['starter', 'pro', 'team']

export async function POST(request: NextRequest) {
  try {
    const { tier } = await request.json()

    if (!tier || !VALID_TIERS.includes(tier as SubscriptionTier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = DODO_PRODUCT_IDS[tier as SubscriptionTier]

    if (!productId) {
      return NextResponse.json({ error: 'Product ID not configured' }, { status: 500 })
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email!,
      tier: tier as SubscriptionTier,
      successUrl: `${origin}/dashboard?payment=success`,
      cancelUrl: `${origin}/dashboard?payment=cancelled`,
    })

    return NextResponse.json({ sessionId: session.session_id, url: session.checkout_url })
  } catch (error) {
    console.error('[Create Checkout] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}