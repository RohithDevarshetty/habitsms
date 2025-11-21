export type SMSResponseType =
  | 'completed'
  | 'skipped'
  | 'number'
  | 'stats'
  | 'pause'
  | 'help'
  | 'unknown'

export interface ParsedSMSResponse {
  type: SMSResponseType
  value?: number
  originalText: string
}

// Response patterns
const PATTERNS = {
  affirmative: /^(y|yes|yeah|yep|yup|done|completed|✓|✔|1)$/i,
  negative: /^(n|no|nope|nah|skip|miss|missed|0)$/i,
  number: /^\d+$/,
  stats: /^(stats|status|streak|progress|summary)$/i,
  pause: /^(pause|vacation|stop|halt)$/i,
  help: /^(help|\?|commands)$/i,
}

export function parseSMSResponse(text: string): ParsedSMSResponse {
  const trimmed = text.trim()

  // Check for affirmative response
  if (PATTERNS.affirmative.test(trimmed)) {
    return {
      type: 'completed',
      originalText: text,
    }
  }

  // Check for negative response
  if (PATTERNS.negative.test(trimmed)) {
    return {
      type: 'skipped',
      originalText: text,
    }
  }

  // Check for numeric response
  if (PATTERNS.number.test(trimmed)) {
    return {
      type: 'number',
      value: parseInt(trimmed, 10),
      originalText: text,
    }
  }

  // Check for stats request
  if (PATTERNS.stats.test(trimmed)) {
    return {
      type: 'stats',
      originalText: text,
    }
  }

  // Check for pause request
  if (PATTERNS.pause.test(trimmed)) {
    return {
      type: 'pause',
      originalText: text,
    }
  }

  // Check for help request
  if (PATTERNS.help.test(trimmed)) {
    return {
      type: 'help',
      originalText: text,
    }
  }

  // Unknown response
  return {
    type: 'unknown',
    originalText: text,
  }
}

// Validate numeric response based on habit type
export function validateNumericResponse(
  value: number,
  responseUnit: string
): { valid: boolean; error?: string } {
  // Basic validation: must be positive
  if (value < 0) {
    return { valid: false, error: 'Value must be positive' }
  }

  // Reasonable limits based on unit
  const limits: Record<string, { max: number; name: string }> = {
    glasses: { max: 50, name: 'glasses' },
    pages: { max: 1000, name: 'pages' },
    minutes: { max: 1440, name: 'minutes' }, // 24 hours
    hours: { max: 24, name: 'hours' },
    reps: { max: 10000, name: 'reps' },
    km: { max: 500, name: 'km' },
    miles: { max: 300, name: 'miles' },
  }

  const limit = limits[responseUnit.toLowerCase()]
  if (limit && value > limit.max) {
    return {
      valid: false,
      error: `Value seems too high for ${limit.name}. Maximum is ${limit.max}.`,
    }
  }

  return { valid: true }
}
