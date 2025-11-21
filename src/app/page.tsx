export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Build Habits with 98% Success Rate
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Get SMS reminders that actually work. No app needed.
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-4">Why HabitSMS?</h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <h3 className="font-bold text-lg mb-2">📱 98% Open Rate</h3>
                <p className="text-gray-600">SMS messages get opened within 3 minutes, unlike app notifications</p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">⚡ Simple Replies</h3>
                <p className="text-gray-600">Just reply Y or N. Track numbers like glasses of water or pages read</p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">🔥 Streak Tracking</h3>
                <p className="text-gray-600">See your progress and celebrate milestones automatically</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition">
              Get Started - $7/month
            </button>
            <p className="text-sm text-gray-500">First 100 users: $4.99/month lifetime</p>
          </div>
        </div>
      </main>
    </div>
  );
}
