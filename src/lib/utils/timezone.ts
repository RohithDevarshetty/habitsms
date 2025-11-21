import { format, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

/**
 * Convert a time string (HH:MM) in user's timezone to UTC Date
 */
export function convertTimeToUTC(timeString: string, timezone: string): Date {
  const now = new Date()
  const dateString = format(now, 'yyyy-MM-dd')
  const localDateTime = new Date(`${dateString}T${timeString}:00`)
  return zonedTimeToUtc(localDateTime, timezone)
}

/**
 * Convert UTC time to user's timezone
 */
export function convertUTCToTimezone(utcDate: Date, timezone: string): Date {
  return utcToZonedTime(utcDate, timezone)
}

/**
 * Get current time in user's timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  return utcToZonedTime(new Date(), timezone)
}

/**
 * Format time in user's timezone
 */
export function formatTimeInTimezone(
  date: Date,
  timezone: string,
  formatString: string = 'HH:mm'
): string {
  const zonedDate = utcToZonedTime(date, timezone)
  return format(zonedDate, formatString, { timeZone: timezone })
}

/**
 * Check if current time matches reminder time in user's timezone
 */
export function isReminderTime(
  reminderTime: string, // HH:MM format
  timezone: string,
  toleranceMinutes: number = 5
): boolean {
  const now = getCurrentTimeInTimezone(timezone)
  const currentTime = format(now, 'HH:mm')

  // Simple string comparison (can be enhanced for tolerance)
  return currentTime === reminderTime
}

/**
 * Get all timezones where it's currently a specific time
 */
export function getUsersAtTime(
  targetTime: string, // HH:MM format
  toleranceMinutes: number = 5
): string[] {
  // This would query the database for users whose current time matches targetTime
  // Implementation depends on how you want to handle this
  return []
}

/**
 * Common timezone mappings
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Phoenix', label: 'Arizona (US)' },
  { value: 'America/Anchorage', label: 'Alaska (US)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (US)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT)' },
  { value: 'UTC', label: 'UTC' },
]

/**
 * Detect user's timezone from browser
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}
