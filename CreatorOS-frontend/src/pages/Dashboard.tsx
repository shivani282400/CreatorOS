import MainLayout from "../layouts/MainLayout"
import PageWrapper from "../components/PageWrapper"
import { Wand2, Calendar, TrendingUp, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Dashboard() {

  const navigate = useNavigate()

  return (

    <MainLayout>

      <PageWrapper>

        <h1 className="text-3xl font-bold mb-8">
          Welcome back 👋
        </h1>

        {/* Quick Actions */}

        <div className="grid grid-cols-3 gap-6 mb-8">

          <div
            onClick={() => navigate("/generate")}
            className="premium-card glow-border p-6 flex items-center gap-4 cursor-pointer"
          >

            <Wand2 size={24} />

            <div>
              <p className="font-semibold">Generate Content</p>
              <p className="text-sm text-gray-400">
                Create new ideas instantly
              </p>
            </div>

          </div>

          <div
            onClick={() => navigate("/calendar")}
            className="premium-card glow-border p-6 flex items-center gap-4 cursor-pointer"
          >

            <Calendar size={24} />

            <div>
              <p className="font-semibold">Content Calendar</p>
              <p className="text-sm text-gray-400">
                Plan upcoming posts
              </p>
            </div>

          </div>

          <div className="premium-card glow-border p-6 flex items-center gap-4">

            <TrendingUp size={24} />

            <div>
              <p className="font-semibold">Growth Insights</p>
              <p className="text-sm text-gray-400">
                Track performance
              </p>
            </div>

          </div>

        </div>

        {/* AI Suggestions */}

        <div className="premium-card p-6 mb-8">

          <div className="flex items-center gap-2 mb-4">

            <Sparkles size={18} />

            <h2 className="font-semibold">
              AI Suggestions
            </h2>

          </div>

          <p className="text-gray-400 mb-3">
            Your audience engages most with educational short-form videos.
          </p>

          <button
            onClick={() => navigate("/generate")}
            className="btn-primary"
          >
            Generate Idea
          </button>

        </div>

        {/* Stats */}

        <div className="grid grid-cols-3 gap-6">

          <div className="premium-card p-6">

            <p className="text-gray-400 text-sm">
              Posts This Week
            </p>

            <p className="text-2xl font-bold">
              6
            </p>

          </div>

          <div className="premium-card p-6">

            <p className="text-gray-400 text-sm">
              Top Platform
            </p>

            <p className="text-2xl font-bold">
              YouTube
            </p>

          </div>

          <div className="premium-card p-6">

            <p className="text-gray-400 text-sm">
              Engagement Growth
            </p>

            <p className="text-2xl font-bold">
              +23%
            </p>

          </div>

        </div>

      </PageWrapper>

    </MainLayout>

  )

}