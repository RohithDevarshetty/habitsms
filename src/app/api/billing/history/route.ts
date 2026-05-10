import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: events, error } = await serviceClient
    .from('subscription_events')
    .select('provider_event_id, metadata, created_at')
    .eq('user_id', user.id)
    .eq('event_type', 'payment_succeeded')
    .order('created_at', { ascending: false })
    .limit(24)

  if (error) return NextResponse.json({ error: 'Failed to fetch billing history' }, { status: 500 })

  const payments = (events || []).map((e) => ({
    paymentId: e.provider_event_id,
    totalAmount: e.metadata?.total_amount,
    currency: e.metadata?.currency,
    createdAt: e.metadata?.created_at || e.created_at,
    invoiceId: e.metadata?.invoice_id,
  }))

  return NextResponse.json({ payments })
}
