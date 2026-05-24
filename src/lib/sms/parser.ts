export type SMSResponseType =
  | 'completed'
  | 'skipped'
  | 'number'
  | 'stats'
  | 'resume'
  | 'snooze'
  | 'pause'
  | 'grace'
  | 'invite'
  | 'upgrade'
  | 'plan_select'
  | 'channel'
  | 'help'
  | 'unknown'

export interface ParsedSMSResponse {
  type: SMSResponseType
  value?: number
  planTier?: 'starter' | 'pro'
  channelPref?: 'sms' | 'whatsapp'
  note?: string
  originalText: string
}

const FLEXIBLE_PATTERNS = {
  affirmative_start: /^(y\b|yes|yeah|yep|yup|done|completed|finished|crushed|nailed)/i,
  affirmative_phrase: /\b(i did|did it|got it done|crushed it|nailed it|finished it)\b/i,
  affirmative_repeat: /^ye+s+/i,
  negative_start: /^(no\b|nah|nope|not |couldn'?t|can'?t|didn'?t|missed|skipped)/i,
  negative_phrase: /\b(didn'?t|couldn'?t|can'?t|was sick|not today|missed it|skipped)\b/i,
  number_embedded: /\b(\d+)\b/,
}

function extractNote(text: string): string | null {
  const stripped = text
    .replace(/^(no|nah|nope|not|couldn'?t|can'?t|didn'?t|missed|skipped)\s*/i, '')
    .replace(/^(i was|i'm|im|was|because|since|as)\s*/i, '')
    .trim()
    .replace(/^[,;:\-–—]+\s*/, '')
    .trim()
  return stripped.length > 0 ? stripped : null
}

// Response patterns
const PATTERNS = {
  affirmative: /^(y|yes|yeah|yep|yup|done|completed|✓|✔|1)$/i,
  negative: /^(n|no|nope|nah|skip|miss|missed|0)$/i,
  number: /^\d+$/,
  stats: /^(stats|status|streak|progress|summary)$/i,
  resume: /^(resume|unpause|restart)$/i,
  snooze: /^(snooze|later|1h|1 hour)$/i,
  pause: /^(pause|stop|vacation|off)$/i,
  grace: /^(grace|forgive|restore)$/i,
  invite: /^(invite|refer|referral|share)$/i,
  upgrade: /^(upgrade|plans|pricing|subscribe|buy)$/i,
  plan_starter: /^(starter|start)$/i,
  plan_pro: /^(pro)$/i,
  channel_whatsapp: /^(whatsapp|wa)$/i,
  channel_sms: /^(sms|text)$/i,
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

  // Check for resume request
  if (PATTERNS.resume.test(trimmed)) {
    return { type: 'resume', originalText: text }
  }

  // Check for snooze request
  if (PATTERNS.snooze.test(trimmed)) {
    return { type: 'snooze', originalText: text }
  }

  // Check for pause request
  if (PATTERNS.pause.test(trimmed)) {
    return { type: 'pause', originalText: text }
  }

  // Check for grace day request
  if (PATTERNS.grace.test(trimmed)) {
    return { type: 'grace', originalText: text }
  }

  // Check for invite/referral request
  if (PATTERNS.invite.test(trimmed)) {
    return { type: 'invite', originalText: text }
  }

  // Check for upgrade request
  if (PATTERNS.upgrade.test(trimmed)) {
    return { type: 'upgrade', originalText: text }
  }

  // Check for plan selection (only meaningful after an upgrade options message)
  if (PATTERNS.plan_starter.test(trimmed)) {
    return { type: 'plan_select', planTier: 'starter', originalText: text }
  }
  if (PATTERNS.plan_pro.test(trimmed)) {
    return { type: 'plan_select', planTier: 'pro', originalText: text }
  }

  // Check for channel switch (deliver future messages over WhatsApp or SMS)
  if (PATTERNS.channel_whatsapp.test(trimmed)) {
    return { type: 'channel', channelPref: 'whatsapp', originalText: text }
  }
  if (PATTERNS.channel_sms.test(trimmed)) {
    return { type: 'channel', channelPref: 'sms', originalText: text }
  }

  // Check for help request
  if (PATTERNS.help.test(trimmed)) {
    return {
      type: 'help',
      originalText: text,
    }
  }

  // Layer 2: flexible affirmative
  if (
    FLEXIBLE_PATTERNS.affirmative_start.test(trimmed) ||
    FLEXIBLE_PATTERNS.affirmative_phrase.test(trimmed) ||
    FLEXIBLE_PATTERNS.affirmative_repeat.test(trimmed)
  ) {
    return { type: 'completed', originalText: text }
  }

  // Layer 2: flexible negative — extract trailing text as note
  if (
    FLEXIBLE_PATTERNS.negative_start.test(trimmed) ||
    FLEXIBLE_PATTERNS.negative_phrase.test(trimmed)
  ) {
    const note = extractNote(trimmed) || undefined
    return { type: 'skipped', note, originalText: text }
  }

  // Layer 2: number embedded in short text (≤8 words)
  const wordCount = trimmed.split(/\s+/).length
  const numMatch = wordCount <= 8 ? trimmed.match(FLEXIBLE_PATTERNS.number_embedded) : null
  if (numMatch) {
    return { type: 'number', value: parseInt(numMatch[1], 10), originalText: text }
  }

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
