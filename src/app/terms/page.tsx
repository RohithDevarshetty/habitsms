export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <a href="/" className="text-2xl font-bold text-blue-600">HabitSMS</a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>

        <div className="bg-white rounded-xl p-8 shadow-sm space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By using HabitSMS, you agree to these Terms of Service. If you do not agree, please do not use our service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Service Description</h2>
            <p>HabitSMS provides habit tracking via SMS reminders and a web dashboard. We send automated text messages based on your configured habits and reminder times.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>You must provide accurate information during registration</li>
              <li>You are responsible for maintaining account security</li>
              <li>You must be 13 years or older to use this service</li>
              <li>One account per person</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Subscription and Billing</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>Subscriptions are billed monthly</li>
              <li>You can cancel anytime (no refunds for partial months)</li>
              <li>Prices are subject to change with 30 days notice</li>
              <li>Payment failures may result in service suspension</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. SMS Terms</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>Message and data rates may apply from your carrier</li>
              <li>Message frequency varies based on your habits</li>
              <li>Reply STOP to opt-out of SMS messages</li>
              <li>Reply HELP for assistance</li>
              <li>We are not responsible for SMS delivery delays</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Abuse or spam our SMS system</li>
              <li>Share your account with others</li>
              <li>Reverse engineer our service</li>
              <li>Use the service for illegal purposes</li>
              <li>Attempt to circumvent subscription limits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Service Availability</h2>
            <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. We are not liable for missed reminders due to technical issues.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p>HabitSMS is provided &quot;as is&quot;. We are not liable for any damages resulting from use of our service, including missed habits or SMS delivery issues.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Contact</h2>
            <p>Questions about these terms? Contact us at:</p>
            <p className="font-semibold mt-2">support@habitsms.com</p>
          </section>

          <section className="text-sm text-gray-500 pt-4 border-t">
            <p>Last updated: November 21, 2025</p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
        </div>
      </main>
    </div>
  )
}
