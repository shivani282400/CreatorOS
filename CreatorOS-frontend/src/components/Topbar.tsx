import { Bell, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Topbar() {

  const navigate = useNavigate()

  return (

    <div className="h-16 glass-panel flex items-center justify-between px-6 border-b border-gray-800">

      {/* Search */}

      <div className="flex items-center gap-3 bg-[#151821] px-3 py-2 rounded-lg w-[320px]">

        <Search size={16} />

        <input
          placeholder="Search content..."
          className="bg-transparent outline-none text-sm w-full"
        />

      </div>

      {/* Right Side */}

      <div className="flex items-center gap-6">

        <button
          onClick={() => navigate("/generate")}
          className="btn-primary"
        >
          + Create
        </button>

        <Bell size={20} className="cursor-pointer"/>

        {/* Avatar */}

        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-sm font-semibold">
          U
        </div>

      </div>

    </div>

  )

}