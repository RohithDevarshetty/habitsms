import { NextRequest, NextResponse } from 'next/server'
import { verifyStripeWebhook } from '@/lib/payments/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    // Verify webhook
    const event = verifyStripeWebhook(payload, signature)

    const supabase = createServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id || session.subscription_data?.metadata?.userId

        if (!userId) {
          console.error('No userId in checkout session')
          break
        }

        // Update user profile with stripe customer ID
        await supabase
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            subscription_status: 'active',
            subscription_tier: getTierFromPriceId(session.line_items?.data[0]?.price?.id),
          })
          .eq('id', userId)

        // Log subscription event
        await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: 'created',
          provider: 'stripe',
          provider_event_id: event.id,
          metadata: session,
        })

        console.log(`[Stripe] Subscription created for user ${userId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) {
          console.error('No profile found for customer:', customerId)
          break
        }

        // Update subscription status
        await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
          })
          .eq('id', profile.id)

        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: 'updated',
          provider: 'stripe',
          provider_event_id: event.id,
          metadata: subscription,
        })

        console.log(`[Stripe] Subscription updated for user ${profile.id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'cancelled',
          })
          .eq('id', profile.id)

        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: 'cancelled',
          provider: 'stripe',
          provider_event_id: event.id,
          metadata: subscription,
        })

        console.log(`[Stripe] Subscription cancelled for user ${profile.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', profile.id)

        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: 'payment_failed',
          provider: 'stripe',
          provider_event_id: event.id,
          metadata: invoice,
        })

        console.log(`[Stripe] Payment failed for user ${profile.id}`)
        break
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook error' },
      { status: 400 }
    )
  }
}

function getTierFromPriceId(priceId?: string): string {
  if (!priceId) return 'free'

  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'team'

  return 'free'
}
