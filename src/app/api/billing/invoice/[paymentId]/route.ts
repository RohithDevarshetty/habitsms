import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPaymentInvoicePdf } from '@/lib/payments/dodo'

export async function GET(
  _request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentId } = params

  // Verify this payment belongs to the requesting user
  const serviceClient = createServiceClient()
  const { data: event } = await serviceClient
    .from('subscription_events')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider_event_id', paymentId)
    .eq('event_type', 'payment_succeeded')
    .single()

  if (!event) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  try {
    const pdfResponse = await getPaymentInvoicePdf(paymentId)

    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 502 })
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${paymentId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[Invoice] Error fetching PDF:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}
