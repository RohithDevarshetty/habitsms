import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!
const phoneNumber = process.env.TWILIO_PHONE_NUMBER!
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || phoneNumber

export const twilioClient = twilio(accountSid, authToken)

export const TWILIO_PHONE_NUMBER = phoneNumber
export const TWILIO_WHATSAPP_NUMBER = whatsappNumber

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
  return twilio.validateRequest(authToken!, signature, url, params)
}
