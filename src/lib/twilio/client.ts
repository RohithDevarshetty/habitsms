import twilio from 'twilio'

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!
export const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || TWILIO_PHONE_NUMBER

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) throw new Error('Twilio credentials are not configured')
  return twilio(accountSid, authToken)
}

// Keep backward-compatible export — resolved lazily on first access
export const twilioClient = new Proxy({} as ReturnType<typeof twilio>, {
  get(_target, prop) {
    const client = getTwilioClient()
    return client[prop as keyof typeof client]
  },
})

export type MessageChannel = 'sms' | 'whatsapp'

export function formatTochannel(
  phoneNumber: string,
  channel: MessageChannel
): string {
  if (channel === 'whatsapp') {
    return `whatsapp:${phoneNumber}`
  }
  return phoneNumber
}

// Verify webhook signature
export function verifyTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, params)
}
