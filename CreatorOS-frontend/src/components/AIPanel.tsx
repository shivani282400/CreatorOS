export default function AIPanel() {
    return (
      <div className="w-80 bg-[#151821] p-6 border-l border-gray-800">
  
        <h2 className="text-lg font-semibold mb-6">
          AI Assistant
        </h2>
  
        <div className="space-y-6">
  
          <div className="bg-[#1D212B] p-4 rounded-xl">
            <p className="text-sm text-gray-300">
              Your engagement is higher in the morning. Consider posting before 10 AM.
            </p>
          </div>
  
          <div className="bg-[#1D212B] p-4 rounded-xl">
            <p className="text-sm text-gray-300">
              Trending topic: AI tools for creators.
            </p>
          </div>
  
        </div>
  
      </div>
    )
  }