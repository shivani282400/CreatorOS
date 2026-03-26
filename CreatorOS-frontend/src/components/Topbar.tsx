import { Bell, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Topbar() {

  const navigate = useNavigate()

  return (

    <div className="sticky top-0 z-30 mx-6 mt-4 flex h-16 items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.03] px-6 backdrop-blur-xl lg:mx-10 xl:mx-12">

      <div className="flex max-w-3xl flex-1 items-center gap-3 rounded-lg border border-white/5 bg-[#111] px-4 py-2 transition-all duration-200 focus-within:border-white/15">

        <Search size={16} className="text-gray-500" />

        <input
          placeholder="Search content..."
          className="w-full bg-transparent px-0 py-0 text-sm text-white focus:outline-none"
        />

      </div>

      {/* Right Side */}

      <div className="flex items-center gap-4">

        <button
          onClick={() => navigate("/generate")}
          className="btn-primary transition-all duration-200 hover:scale-[1.02] active:scale-95"
        >
          + Create
        </button>

        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-200 hover:scale-[1.02] hover:bg-white/[0.06] active:scale-95">
          <Bell size={18} className="text-gray-300" />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-slate-200/20 to-indigo-500/70 text-sm font-semibold text-white shadow-lg">
          U
        </div>

      </div>

    </div>

  )

}
