import DodoPayments from 'dodopayments'
import crypto from 'crypto'

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY!
const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET!

const IS_TEST = process.env.NODE_ENV === 'development'

const client = new DodoPayments({
  bearerToken: DODO_API_KEY,
  environment: IS_TEST ? 'test_mode' : 'live_mode',
})

export const DODO_PRODUCT_IDS = {
  starter: process.env.DODO_STARTER_PRODUCT_ID!,
  pro: process.env.DODO_PRO_PRODUCT_ID!,
  team: process.env.DODO_TEAM_PRODUCT_ID!,
} as const

export type SubscriptionTier = keyof typeof DODO_PRODUCT_IDS

export interface CreateCheckoutParams {
  userId: string
  email: string
  tier: SubscriptionTier
  successUrl: string
  cancelUrl: string
  customerName?: string
}

export async function createCheckoutSession(params: CreateCheckoutParams) {
  const { userId, email, tier, successUrl, cancelUrl, customerName } = params

  const productId = DODO_PRODUCT_IDS[tier]
  if (!productId) {
    throw new Error(`Invalid tier: ${tier}`)
  }

  const response = await client.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email,
      name: customerName || email.split('@')[0],
    },
    return_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
  })

  return response
}

export function verifyDodoWebhook(payload: string, signature: string) {
  const expectedSignature = crypto
    .createHmac('sha256', DODO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  if (signature !== expectedSignature) {
    throw new Error('Invalid webhook signature')
  }

  return JSON.parse(payload)
}

export async function getSubscription(subscriptionId: string) {
  return client.subscriptions.retrieve(subscriptionId)
}

export function getTierFromProductId(productId: string): string {
  for (const [tier, id] of Object.entries(DODO_PRODUCT_IDS)) {
    if (id === productId) return tier
  }
  return 'free'
}

export default client