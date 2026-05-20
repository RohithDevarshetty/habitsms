# TODO — Meta WhatsApp Cloud API Onboarding

Code integration is **done** (see `src/lib/meta/`, `docs/whatsapp-templates.md`).
What remains is the Meta-side account setup + config below. Work top to bottom —
Business Verification (step 4) is slow, so start it early.

## Checklist

- [ ] 1. Confirm a Meta Business Manager exists (`business.facebook.com`)
- [ ] 2. Create a Meta app — `developers.facebook.com` → Create App → **Business** → add the **WhatsApp** product
- [ ] 3. Add the real HabitSMS phone number — WhatsApp → API Setup → *Add phone number* → verify by SMS/call (number must not already be on any WhatsApp app)
- [ ] 4. **Start Business Verification** — Business Settings → Security Center (takes days; do this first)
- [ ] 5. Copy App Secret — App → Settings → Basic → `META_APP_SECRET`
- [ ] 6. Copy Phone Number ID — API Setup page → `META_PHONE_NUMBER_ID`
- [ ] 7. Generate a **permanent** token — Business Settings → System Users → create → assign app + WABA with `whatsapp_business_messaging` + `whatsapp_business_management` → token expiry **Never** → `META_WHATSAPP_ACCESS_TOKEN`
      ⚠️ The token shown in the test UI expires in 24h — do NOT use it in production.
- [ ] 8. Configure webhook — App → WhatsApp → Configuration:
      - Callback URL: `https://habitsms.com/api/webhooks/meta`
      - Verify token: invent a random string; use the same value for `META_WEBHOOK_VERIFY_TOKEN`
      - **Subscribe to the `messages` field** (required for inbound replies)
- [ ] 9. Submit the 4 message templates from `docs/whatsapp-templates.md` (category: Utility) and wait for approval
- [ ] 10. Add a billing/payment method in WhatsApp Manager
- [ ] 11. Set env vars in Vercel: `META_WHATSAPP_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_TEMPLATE_LANG=en`
- [ ] 12. Test in-window: text the number from another phone → expect a reply
- [ ] 13. Test out-of-window: trigger `/api/cron/send-reminders` for a profile with `preferred_channel='whatsapp'` → expect a template message

## Notes

- New accounts start at 250 business-initiated conversations/24h; the cap scales
  up automatically once Business Verification clears and message quality stays green.
- Template `name` values must exactly match `WHATSAPP_TEMPLATES` in `src/lib/meta/templates.ts`.

## Follow-ups (post-launch, not blocking)

- [ ] Add a `preferred_channel` toggle to the `/settings` page (currently switchable only via the `WHATSAPP`/`SMS` text command)
- [ ] Fix or remove the Twilio WhatsApp fallback — it sends free-form text, so it cannot deliver proactive sends outside the 24h window
