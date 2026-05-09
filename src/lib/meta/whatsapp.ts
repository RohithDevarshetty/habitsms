import crypto from 'crypto'

const BASE_URL = 'https://graph.facebook.com/v19.0'

export interface MetaConfig {
  accessToken: string
  phoneNumberId: string
  appSecret: string
  verifyToken: string
}

export function getMetaConfig(): MetaConfig | null {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID
  const appSecret = process.env.META_APP_SECRET
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN

  if (!accessToken || !phoneNumberId || !appSecret || !verifyToken) return null
  return { accessToken, phoneNumberId, appSecret, verifyToken }
}

export interface MetaSendResult {
  success: boolean
  messageId?: string
  error?: string
  windowClosed?: boolean // true when 24hr session has expired
}

export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<MetaSendResult> {
  const config = getMetaConfig()
  if (!config) throw new Error('Meta WhatsApp not configured')

  // Strip + prefix — Meta expects digits only
  const recipient = to.replace(/^\+/, '')

  const response = await fetch(`${BASE_URL}/${config.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body: message },
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const errCode = data?.error?.code
    // 131026 = message outside 24hr window (user hasn't replied recently)
    if (errCode === 131026) {
      return { success: false, windowClosed: true, error: '24hr session window expired' }
    }
    return { success: false, error: data?.error?.message || 'Meta API error' }
  }

  return { success: true, messageId: data?.messages?.[0]?.id }
}

// Cost per outbound conversation in INR (utility category)
export const META_WHATSAPP_COST_PAISE = 14 // ₹0.14 = 14 paise

export function verifyMetaWebhook(payload: string, signature: string, appSecret: string): boolean {
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(payload).digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export interface MetaInboundMessage {
  from: string   // phone number with country code, no +
  messageId: string
  text: string
  timestamp: string
}

export function parseMetaWebhookBody(body: Record<string, unknown>): MetaInboundMessage | null {
  try {
    const entry = (body.entry as Record<string, unknown>[])?.[0]
    const change = (entry?.changes as Record<string, unknown>[])?.[0]
    const value = change?.value as Record<string, unknown>
    const messages = value?.messages as Record<string, unknown>[]

    if (!messages || messages.length === 0) return null

    const msg = messages[0]
    if (msg.type !== 'text') return null

    return {
      from: `+${msg.from as string}`,
      messageId: msg.id as string,
      text: (msg.text as Record<string, string>).body,
      timestamp: msg.timestamp as string,
    }
  } catch {
    return null
  }
}
