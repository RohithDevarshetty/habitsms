# DLT SMS Templates — HabitSMS

**Sender ID:** HABSMS  
**Entity:** [Brother's business name]  
**Registration platforms:** Jio DLT first, then Airtel, Vodafone, BSNL

Variables use DLT format: `{#var#}`  
Keep each template under 160 chars to avoid multi-part SMS charges.

---

## Template Categories

| Template | Type | DND Bypass |
|---|---|---|
| Habit reminder (Y/N) | Service Implicit | Yes (opted-in users) |
| Habit reminder (numeric) | Service Implicit | Yes |
| Confirmation / streak | Service Implicit | Yes |
| Milestone (7/30/100 days) | Service Implicit | Yes |
| Welcome | Transactional | Yes |
| Snooze confirmed | Service Implicit | Yes |
| Resume | Service Implicit | Yes |
| Payment confirmed | Transactional | Yes |
| Payment failed | Transactional | Yes |
| Weekly summary | Service Implicit | Yes |
| Upgrade nudge | Promotional | No |

---

## Templates

### 1. Habit Reminder — Boolean (Y/N)
**Type:** Service Implicit  
**Use:** Daily reminder for boolean habits (workout, meditate, read)

```
Did you {#var#} today? Reply Y-Yes, N-No, SNOOZE-1hr, STATS-Streak
```
**Chars:** 67 + variable  
**Variable 1:** habit name (e.g. `workout`, `meditate`)

---

### 2. Habit Reminder — Numeric
**Type:** Service Implicit  
**Use:** Daily reminder for quantity-based habits (water glasses, pages)

```
How many {#var#} of {#var#} today? Reply with a number or N to skip.
```
**Chars:** 70 + variables  
**Variable 1:** unit (e.g. `glasses`, `pages`, `minutes`)  
**Variable 2:** habit name (e.g. `Water Intake`, `Reading`)

---

### 3. Habit Confirmation
**Type:** Service Implicit  
**Use:** Sent after user logs a habit

```
Great job! {#var#} logged! Current streak: {#var#} days. Keep it up!
```
**Chars:** 69 + variables  
**Variable 1:** habit name  
**Variable 2:** streak count (e.g. `5`)

---

### 4. Milestone — Streak Celebration
**Type:** Service Implicit  
**Use:** Sent at 7, 30, 100 day streaks

```
Amazing! {#var#}-day streak for {#var#}! You are unstoppable. Keep it up!
```
**Chars:** 73 + variables  
**Variable 1:** streak number (e.g. `7`, `30`, `100`)  
**Variable 2:** habit name

---

### 5. Welcome Message
**Type:** Transactional  
**Use:** Sent immediately after onboarding

```
Welcome to HabitSMS {#var#}! First reminder at {#var#}. Reply HELP for commands. Lets build habits!
```
**Chars:** 100 + variables  
**Variable 1:** first name  
**Variable 2:** reminder time (e.g. `7:00 AM`)

---

### 6. Snooze Confirmed
**Type:** Service Implicit  
**Use:** User replied SNOOZE

```
Got it! Reminding you about {#var#} in 1 hour.
```
**Chars:** 47 + variable  
**Variable 1:** habit name

---

### 7. Reminders Resumed
**Type:** Service Implicit  
**Use:** User replied RESUME

```
Reminders are back on! Your habits are waiting. Reply Y when you complete one.
```
**Chars:** 79 (no variables)

---

### 8. Payment Confirmed
**Type:** Transactional  
**Use:** After successful Dodo payment webhook

```
Payment confirmed! You are now on HabitSMS {#var#} plan. All features unlocked. Reply HELP anytime.
```
**Chars:** 100 + variable  
**Variable 1:** plan name (e.g. `Starter`, `Pro`)

---

### 9. Payment Failed
**Type:** Transactional  
**Use:** After Dodo payment failure webhook

```
Your HabitSMS payment failed. Update your payment method to keep reminders active: {#var#}
```
**Chars:** 91 + variable  
**Variable 1:** billing page URL

---

### 10. Weekly Summary
**Type:** Service Implicit  
**Use:** Sunday 8 PM cron job

```
Your week: {#var#} habits completed. Best streak: {#var#} days. Keep crushing it! Reply STATS.
```
**Chars:** 95 + variables  
**Variable 1:** completed count  
**Variable 2:** longest streak

---

### 11. Upgrade Nudge
**Type:** Promotional  
**Use:** Wednesday nudge cron for free users  
**Note:** Cannot send to DND numbers. Must include opt-out option.

```
Upgrade HabitSMS! STARTER Rs.{#var#}/mo-3 habits, PRO Rs.{#var#}/mo-unlimited. Reply STARTER or PRO or STOP to opt out.
```
**Chars:** 119 + variables  
**Variable 1:** Starter price  
**Variable 2:** Pro price

---

### 12. Upgrade — Plan Options (conversational)
**Type:** Service Implicit  
**Use:** Sent when user texts UPGRADE

```
Which plan? STARTER Rs.{#var#}/mo-3 habits, PRO Rs.{#var#}/mo-unlimited habits+summaries. Reply STARTER or PRO.
```
**Chars:** 111 + variables  
**Variable 1:** Starter price  
**Variable 2:** Pro price

---

### 13. Plan Checkout Link
**Type:** Transactional  
**Use:** Sent after user picks STARTER or PRO

```
Your HabitSMS {#var#} plan checkout link: {#var#} Link expires in 24 hours.
```
**Chars:** 76 + variables  
**Variable 1:** plan name  
**Variable 2:** checkout URL

---

## Submission Checklist

- [ ] Entity registered on Jio DLT (fastest approval)
- [ ] Sender ID `HABSMS` registered
- [ ] All 13 templates submitted in one batch
- [ ] Template IDs saved after approval (needed for MSG91 template API)
- [ ] Register on Airtel DLT (use same templates)
- [ ] Register on Vodafone DLT
- [ ] Register on BSNL DLT
- [ ] Update MSG91 dashboard with approved template IDs

## Notes

- **Jio DLT portal:** https://trueconnect.jio.com
- **Airtel DLT:** https://www.airtel.in/business/commercial-communication
- **MSG91 DLT help:** They have an onboarding team that assists with DLT registration — email support@msg91.com
- Promotional templates (upgrade nudge) cannot go to DND numbers. All others can since users have opted in.
- Once template IDs are approved, update `MSG91_TEMPLATE_IDS` in `.env.local` (add these vars when ready).
