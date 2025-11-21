export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">HabitSMS</div>
          <div className="space-x-4">
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</a>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
              Sign Up
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-5xl mx-auto mb-20">
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            🎉 First 100 users get $4.99/month LIFETIME
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Build Habits with<br />
            <span className="text-blue-600">98% Success Rate</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Get SMS reminders that actually work. No app to install, no notifications to ignore.
          </p>
          <div className="flex justify-center gap-4 mb-8">
            <button className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition shadow-lg">
              Start Free Trial
            </button>
            <button className="bg-white text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition border-2 border-gray-200">
              See How It Works
            </button>
          </div>
          <p className="text-sm text-gray-500">No credit card required • Cancel anytime</p>

          {/* Social Proof */}
          <div className="mt-12 flex justify-center items-center gap-8 text-gray-600">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">98%</div>
              <div className="text-sm">Open Rate</div>
            </div>
            <div className="h-12 w-px bg-gray-300"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">3min</div>
              <div className="text-sm">Avg. Response Time</div>
            </div>
            <div className="h-12 w-px bg-gray-300"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">78%</div>
              <div className="text-sm">Less Than Apps</div>
            </div>
          </div>
        </div>

        {/* The Problem */}
        <section className="max-w-4xl mx-auto mb-20">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Problem with Habit Apps</h2>
            <div className="space-y-3 text-lg text-gray-700">
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <p>78% of people abandon habit apps after just 3 days</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <p>Push notifications get ignored (60% of users disable them)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <p>Apps require opening, logging in, and navigating screens</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <p>People pay $500/month for coaches who just... text them</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="max-w-5xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-gray-100">
              <div className="text-5xl mb-4">📝</div>
              <div className="text-blue-600 font-semibold mb-2">Step 1</div>
              <h3 className="text-xl font-bold mb-3">Set Your Habits</h3>
              <p className="text-gray-600">Choose from templates (workout, meditation, reading) or create custom habits. Set your reminder time.</p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-gray-100">
              <div className="text-5xl mb-4">💬</div>
              <div className="text-blue-600 font-semibold mb-2">Step 2</div>
              <h3 className="text-xl font-bold mb-3">Receive SMS</h3>
              <p className="text-gray-600">Get a text at your scheduled time. "Did you meditate today? Reply Y or N"</p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-gray-100">
              <div className="text-5xl mb-4">🔥</div>
              <div className="text-blue-600 font-semibold mb-2">Step 3</div>
              <h3 className="text-xl font-bold mb-3">Track Streaks</h3>
              <p className="text-gray-600">Just reply "Y" or "N". We track your streaks and celebrate milestones automatically.</p>
            </div>
          </div>
        </section>

        {/* SMS Example */}
        <section className="max-w-4xl mx-auto mb-20">
          <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl">
            <div className="bg-gray-800 rounded-lg p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  H
                </div>
                <div>
                  <div className="text-white font-semibold">HabitSMS</div>
                  <div className="text-gray-400 text-sm">Today at 7:00 AM</div>
                </div>
              </div>
              <div className="bg-blue-600 text-white rounded-lg rounded-tl-none p-4 mb-3 inline-block">
                Did you meditate today? Reply with:<br />
                Y - Yes, I did it!<br />
                N - Not today<br />
                STATS - View your streak
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4 justify-end">
                <div>
                  <div className="text-white font-semibold text-right">You</div>
                  <div className="text-gray-400 text-sm text-right">Today at 7:02 AM</div>
                </div>
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  Y
                </div>
              </div>
              <div className="bg-green-600 text-white rounded-lg rounded-tr-none p-4 inline-block float-right">
                Y
              </div>
            </div>
            <div className="clear-both bg-gray-800 rounded-lg p-6 mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  H
                </div>
                <div>
                  <div className="text-white font-semibold">HabitSMS</div>
                  <div className="text-gray-400 text-sm">Today at 7:02 AM</div>
                </div>
              </div>
              <div className="bg-blue-600 text-white rounded-lg rounded-tl-none p-4 inline-block">
                🔥 Great job! Meditation logged!<br />
                Current streak: 7 days<br />
                Keep it up! 💪
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
              <div className="text-3xl mb-3">💪</div>
              <h3 className="text-xl font-bold mb-2">5 Habit Templates</h3>
              <p className="text-gray-600">Workout, meditation, water intake, reading, sleep tracking - or create your own.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
              <div className="text-3xl mb-3">🕐</div>
              <h3 className="text-xl font-bold mb-2">Custom Timing</h3>
              <p className="text-gray-600">Set reminders for any time. Morning habits at 6am, evening habits at 9pm.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-xl font-bold mb-2">Web Dashboard</h3>
              <p className="text-gray-600">View your progress, streaks, and weekly summaries in a beautiful dashboard.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
              <div className="text-3xl mb-3">🌍</div>
              <h3 className="text-xl font-bold mb-2">Timezone Smart</h3>
              <p className="text-gray-600">Works worldwide. Reminders arrive in your local timezone.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
              <div className="text-3xl mb-3">🎉</div>
              <h3 className="text-xl font-bold mb-2">Milestone Celebrations</h3>
              <p className="text-gray-600">Get special messages at 7, 30, 100 day streaks. Feel the motivation!</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
              <div className="text-3xl mb-3">✈️</div>
              <h3 className="text-xl font-bold mb-2">Vacation Mode</h3>
              <p className="text-gray-600">Pause your habits when traveling. Resume anytime without losing progress.</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-5xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">Simple, Honest Pricing</h2>
          <p className="text-xl text-gray-600 text-center mb-12">Less than a coffee. More effective than a $500/month coach.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-4">
                $7<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">Perfect for beginners</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>3 active habits</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Daily SMS reminders</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Streak tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Web dashboard</span>
                </li>
              </ul>
              <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                Get Started
              </button>
            </div>

            {/* Pro (Featured) */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-8 text-white transform scale-105 shadow-2xl">
              <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold inline-block mb-3">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-4">
                $12<span className="text-lg font-normal opacity-80">/month</span>
              </div>
              <p className="opacity-90 mb-6">For serious habit builders</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Unlimited habits</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  <span>All reminders & tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Weekly summaries</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Priority support</span>
                </li>
              </ul>
              <button className="w-full bg-white text-blue-600 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                Start Free Trial
              </button>
              <p className="text-center text-sm mt-3 opacity-80">🔥 First 100: $4.99/month forever</p>
            </div>

            {/* Team */}
            <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold mb-2">Team</h3>
              <div className="text-4xl font-bold mb-4">
                $39<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">For families & groups</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>5 team members</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Shared dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Group challenges</span>
                </li>
              </ul>
              <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                Get Started
              </button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <h2 className="text-4xl font-bold mb-4">Ready to Build Better Habits?</h2>
            <p className="text-xl mb-8 opacity-90">Join the first 100 users and get lifetime discount.</p>
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg">
              Start Your Free Trial
            </button>
            <p className="text-sm mt-4 opacity-80">No credit card required • 7-day free trial</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold mb-4">HabitSMS</div>
          <p className="text-gray-400 mb-6">Build habits that stick. One text at a time.</p>
          <div className="space-x-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
          <p className="text-gray-500 text-sm mt-6">© 2025 HabitSMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
