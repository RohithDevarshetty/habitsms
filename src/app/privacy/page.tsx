export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <a href="/" className="text-2xl font-bold text-blue-600">HabitSMS</a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="bg-white rounded-xl p-8 shadow-sm space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Phone number for SMS notifications</li>
              <li>Email address for account management</li>
              <li>Habit tracking data (habit names, completion logs, streaks)</li>
              <li>Payment information (processed securely by Stripe/Razorpay)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>Send SMS reminders for your habits</li>
              <li>Track your progress and calculate streaks</li>
              <li>Process payments and manage subscriptions</li>
              <li>Improve our service and user experience</li>
              <li>Send important account updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Data Storage and Security</h2>
            <p>Your data is stored securely on Supabase servers with industry-standard encryption. We implement appropriate security measures to protect against unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. SMS Communications</h2>
            <p>By signing up, you consent to receive SMS messages for habit reminders. You can opt-out at any time by replying STOP or pausing your habits in the dashboard.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Twilio for SMS delivery</li>
              <li>Stripe/Razorpay for payment processing</li>
              <li>Supabase for data storage</li>
              <li>Vercel for hosting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Request data deletion</li>
              <li>Export your data</li>
              <li>Opt-out of SMS communications</li>
              <li>Cancel your subscription at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Upon account deletion, we will remove your personal information within 30 days.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Contact Us</h2>
            <p>For privacy concerns or data requests, contact us at:</p>
            <p className="font-semibold mt-2">privacy@habitsms.com</p>
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
