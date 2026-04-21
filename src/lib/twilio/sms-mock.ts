import { parsePhoneNumber } from 'libphonenumber-js'

interface SendSMSParams {
  to: string
  message: string
  userId: string
  habitId?: string
  channel?: 'sms' | 'whatsapp'
}

interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

type MessageChannel = 'sms' | 'whatsapp'

interface MockSentMessage {
  id: string
  to: string
  message: string
  userId: string
  habitId?: string
  channel: MessageChannel
  timestamp: Date
}

const mockSentMessages: MockSentMessage[] = []

function isMockEnabled(): boolean {
  return process.env.MOCK_SMS === 'true' || process.env.NODE_ENV === 'development'
}

export async function sendMockSMS({
  to,
  message,
  userId,
  habitId,
  channel = 'sms',
}: SendSMSParams): Promise<SMSResult> {
  if (!isMockEnabled()) {
    throw new Error('SMS mocking is not enabled. Set MOCK_SMS=true to use mock mode.')
  }

  const parsed = parsePhoneNumber(to)
  if (!parsed || !parsed.isValid()) {
    return { success: false, error: 'Invalid phone number' }
  }

  const formattedPhone = parsed.format('E.164')
  const mockMessageId = `MOCK_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  mockSentMessages.push({
    id: mockMessageId,
    to: formattedPhone,
    message,
    userId,
    habitId,
    channel,
    timestamp: new Date(),
  })

  const channelLabel = channel === 'whatsapp' ? '[WhatsApp]' : '[SMS]'
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${channelLabel} MOCK MESSAGE SENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${formattedPhone}
User: ${userId}
${habitId ? `Habit: ${habitId}` : ''}
Message:
${message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

  return {
    success: true,
    messageId: mockMessageId,
  }
}

export function getMockSentMessages(): MockSentMessage[] {
  return [...mockSentMessages]
}

export function getMockSentMessagesForUser(userId: string): MockSentMessage[] {
  return mockSentMessages.filter((m) => m.userId === userId)
}

export function getMockSentMessagesForHabit(habitId: string): MockSentMessage[] {
  return mockSentMessages.filter((m) => m.habitId === habitId)
}

export function clearMockSentMessages(): void {
  mockSentMessages.length = 0
}

export function isSMSMockEnabled(): boolean {
  return isMockEnabled()
}