export default function AIPanel() {
  return (
    <div className="hidden w-80 border-l border-white/5 bg-[var(--bg-secondary)]/90 p-6 backdrop-blur-xl xl:block">
      <h2 className="mb-6 text-xl font-semibold">
        AI Assistant
      </h2>

      <div className="space-y-4">
        <div className="premium-card rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]">
          <p className="text-sm text-gray-300">
            Your engagement is higher in the morning. Consider posting before 10 AM.
          </p>
        </div>

        <div className="premium-card rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]">
          <p className="text-sm text-gray-300">
            Trending topic: AI tools for creators.
          </p>
        </div>
      </div>
    </div>
  )
}
