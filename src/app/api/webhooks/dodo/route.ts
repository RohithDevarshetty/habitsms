import { NextRequest, NextResponse } from 'next/server'
import { verifyDodoWebhook, getTierFromProductId } from '@/lib/payments/dodo'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms/service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://habitsms.com'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-dodo-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const event = verifyDodoWebhook(payload, signature)

    const supabase = createServiceClient()

    switch (event.eventType) {
      case 'subscription_created':
      case 'subscriptionactivated': {
        const subscription = event.data
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.error('[Dodo] No userId in subscription metadata')
          break
        }

        const tier = getTierFromProductId(subscription.productId)

        await supabase
          .from('profiles')
          .update({
            dodo_customer_id: subscription.customerId,
            subscription_status: 'active',
            subscription_tier: tier,
          })
          .eq('id', userId)

        await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: 'created',
          provider: 'dodo',
          provider_event_id: subscription.id,
          metadata: subscription,
        })

        // Send payment confirmation SMS
        const { data: profile } = await supabase
          .from('profiles').select('phone_number').eq('id', userId).single()
        if (profile?.phone_number) {
          await sendSMS({
            to: profile.phone_number,
            message: SMS_TEMPLATES.PAYMENT_CONFIRMED(tier),
            userId,
          })
        }

        console.log(`[Dodo] Subscription created for user ${userId}`)
        break
      }

      case 'subscription_updated':
      case 'subscription_resumed': {
        const subscription = event.data
        const userId = subscription.metadata?.userId

        if (!userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('dodo_customer_id', subscription.customerId)
            .single()

          if (!profile) {
            console.error('[Dodo] No profile found for customer:', subscription.customerId)
            break
          }

          await supabase
            .from('profiles')
            .update({
              subscription_status: subscription.status === 'active' ? 'active' : 'on_hold',
            })
            .eq('id', profile.id)
        } else {
          await supabase
            .from('profiles')
            .update({
              subscription_status: subscription.status === 'active' ? 'active' : 'on_hold',
            })
            .eq('id', userId)
        }

        await supabase.from('subscription_events').insert({
          user_id: userId || subscription.metadata?.userId,
          event_type: 'updated',
          provider: 'dodo',
          provider_event_id: subscription.id,
          metadata: subscription,
        })

        console.log(`[Dodo] Subscription updated for user ${userId}`)
        break
      }

      case 'subscription_cancelled':
      case 'subscription_paused': {
        const subscription = event.data

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('dodo_customer_id', subscription.customerId)
          .single()

        if (!profile) {
          console.error('[Dodo] No profile found for customer:', subscription.customerId)
          break
        }

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'cancelled',
          })
          .eq('id', profile.id)

        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: 'cancelled',
          provider: 'dodo',
          provider_event_id: subscription.id,
          metadata: subscription,
        })

        console.log(`[Dodo] Subscription cancelled for user ${profile.id}`)
        break
      }

      case 'payment_failed': {
        const payment = event.data

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('dodo_customer_id', payment.customerId)
          .single()

        if (!profile) {
          console.error('[Dodo] No profile found for payment:', payment.id)
          break
        }

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', profile.id)

        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: 'payment_failed',
          provider: 'dodo',
          provider_event_id: payment.id,
          metadata: payment,
        })

        // Send payment failed SMS
        const { data: failedProfile } = await supabase
          .from('profiles').select('phone_number').eq('id', profile.id).single()
        if (failedProfile?.phone_number) {
          await sendSMS({
            to: failedProfile.phone_number,
            message: SMS_TEMPLATES.PAYMENT_FAILED(APP_URL),
            userId: profile.id,
          })
        }

        console.log(`[Dodo] Payment failed for user ${profile.id}`)
        break
      }

      default:
        console.log(`[Dodo] Unhandled event type: ${event.eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Dodo Webhook] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook error' },
      { status: 400 }
    )
  }
}