import { parsePhoneNumber } from 'libphonenumber-js'

interface MSG91Config {
  authKey: string
  senderId: string
}

interface MSG91Response {
  id: string
  success: boolean
  error?: string
}

const DEFAULT_SENDER_ID = 'HABSMS'

export function getMSG91Config(): MSG91Config | null {
  const authKey = process.env.MSG91_AUTH_KEY
  const senderId = process.env.MSG91_SENDER_ID || DEFAULT_SENDER_ID
  
  if (!authKey || authKey === 'xxxxx') {
    return null
  }
  
  return { authKey, senderId }
}

export function isIndianNumber(phoneNumber: string): boolean {
  try {
    const parsed = parsePhoneNumber(phoneNumber)
    return parsed?.country === 'IN'
  } catch {
    return false
  }
}

export async function sendMSG91SMS(
  to: string,
  message: string
): Promise<MSG91Response> {
  const config = getMSG91Config()
  
  if (!config) {
    throw new Error('MSG91 not configured')
  }

  try {
    const parsed = parsePhoneNumber(to)
    if (!parsed || !parsed.isValid()) {
      throw new Error('Invalid phone number')
    }
    
    const formattedNumber = parsed.format('E.164').replace('+', '')
    
    const response = await fetch('https://api.msg91.com/api/v2/sendsms', {
      method: 'POST',
      headers: {
        'AuthKey': config.authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: config.senderId,
        mobile: formattedNumber,
        message: message,
        route: '4', // Transactional route
        country: '91', // India
      }),
    })

    const data = await response.json()

    if (data.type === 'success') {
      return {
        id: data.id || 'msg91-' + Date.now(),
        success: true,
      }
    } else {
      throw new Error(data.message || 'MSG91 API error')
    }
  } catch (error) {
    console.error('MSG91 SMS error:', error)
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    }
  }
}

// Cost in cents for MSG91 (cheaper for India)
export const MSG91_COST_CENTS = 14 // ₹0.14 = ~$0.0017 = 0.14 cents