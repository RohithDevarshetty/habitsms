/**
 * WhatsApp message template registry.
 *
 * Proactive WhatsApp messages (reminders, weekly summaries, the welcome note)
 * are delivered outside the 24-hour customer-service window, so Meta requires
 * them to use a pre-approved message template instead of free-form text.
 *
 * Each `name` below MUST exactly match an approved template in the Meta
 * WhatsApp Manager. The `params` array fills the body placeholders
 * {{1}}, {{2}} … in order. See docs/whatsapp-templates.md for the approved
 * body copy and submission details.
 *
 * Note: Meta rejects body parameters that contain newlines, tabs, or 5+
 * consecutive spaces — so only single-line values can be passed as params.
 */

/** BCP-47 language code the templates were approved in. */
export const TEMPLATE_LANGUAGE = process.env.META_TEMPLATE_LANG || 'en'

export interface WhatsAppTemplate {
  /** Approved Meta template name (lowercase, underscores). */
  name: string
  /** Language code the template was approved in. */
  language: string
  /** Body placeholder values, in {{1}}, {{2}} … order. */
  params: string[]
}

function build(name: string, ...params: Array<string | number>): WhatsAppTemplate {
  return { name, language: TEMPLATE_LANGUAGE, params: params.map((p) => String(p)) }
}

export const WHATSAPP_TEMPLATES = {
  /** Daily reminder for boolean habits. Variable: habit name. */
  reminderBoolean: (habitName: string) => build('habit_reminder_boolean', habitName),

  /** Daily reminder for numeric habits. Variables: unit, habit name. */
  reminderNumber: (unit: string, habitName: string) =>
    build('habit_reminder_numeric', unit, habitName),

  /** Sunday week-in-review. Variables: completed count, longest streak. */
  weeklySummary: (completedCount: number, longestStreak: number) =>
    build('weekly_summary', completedCount, longestStreak),

  /** Sent right after onboarding. Variables: first name, first reminder time. */
  welcome: (firstName: string, firstReminderTime: string) =>
    build('welcome_message', firstName, firstReminderTime),
}
