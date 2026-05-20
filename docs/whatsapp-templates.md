# WhatsApp Message Templates — HabitSMS

**Channel:** Meta WhatsApp Cloud API
**Category:** Utility (all templates below)
**Approval:** Submitted in Meta Business Manager → WhatsApp Manager → Message Templates

WhatsApp only allows free-form text inside the 24-hour customer-service window
(i.e. within 24h of the user's last inbound message). Every **proactive** send —
daily reminders, the weekly summary, the welcome note — lands outside that
window and therefore must use a pre-approved template.

The code references each template by `name` + `language` and fills body
placeholders `{{1}}`, `{{2}}` … in order. The registry lives in
`src/lib/meta/templates.ts`; it must stay in sync with what is approved here.

> **Parameter rule:** Meta rejects body parameters that contain newlines, tabs,
> or 5+ consecutive spaces. Only pass single-line values.

---

## Templates

### 1. `habit_reminder_boolean`
**Use:** Daily reminder for boolean habits (workout, meditate, read).
```
Did you {{1}} today? Reply Y for yes, N for no, SNOOZE for 1hr, STATS for your streak.
```
**Variable 1:** habit name

---

### 2. `habit_reminder_numeric`
**Use:** Daily reminder for quantity-based habits (water, pages, minutes).
```
How many {{1}} of {{2}} today? Reply with a number, or N to skip.
```
**Variable 1:** unit (e.g. `glasses`, `pages`)
**Variable 2:** habit name

---

### 3. `weekly_summary`
**Use:** Sunday week-in-review.
```
Your week: {{1}} habits completed. Best streak: {{2}} days. Keep crushing it! Reply STATS for details.
```
**Variable 1:** completed count
**Variable 2:** longest streak

---

### 4. `welcome_message`
**Use:** Sent immediately after onboarding.
```
Welcome to HabitSMS {{1}}! Your first reminder arrives at {{2}}. Reply HELP for commands. Let's build great habits!
```
**Variable 1:** first name
**Variable 2:** first reminder time

---

## Configuration

- Set `META_TEMPLATE_LANG` in `.env` to the language code the templates were
  approved in (default `en`).
- Template `name` values are case-sensitive and must match exactly.

## Submission Checklist

- [ ] All 4 templates submitted under the **Utility** category
- [ ] Approved language matches `META_TEMPLATE_LANG`
- [ ] Template names match `WHATSAPP_TEMPLATES` in `src/lib/meta/templates.ts`
- [ ] Tested a proactive send to a number outside the 24h window

## Notes

- Interactive replies (confirmations, stats, snooze acks) are sent as free-form
  text — they always land inside the 24h window, so no template is needed.
- The daily recap is not templated: its content is multi-line and dynamic,
  which Meta's single-line parameter rule disallows. WhatsApp users still
  receive it only if their 24h window is open; otherwise it is SMS-only.
- Users switch channels by texting `WHATSAPP` or `SMS` (handled in the inbound
  webhooks; stored on `profiles.preferred_channel`).
