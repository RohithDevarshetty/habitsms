import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const phoneNumber = process.env.TWILIO_PHONE_NUMBER

if (!accountSid || !authToken || !phoneNumber) {
  throw new Error('Missing Twilio credentials in environment variables')
}

export const twilioClient = twilio(accountSid, authToken)

export const TWILIO_PHONE_NUMBER = phoneNumber

// Verify webhook signature
export function verifyTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, any>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params)
}
